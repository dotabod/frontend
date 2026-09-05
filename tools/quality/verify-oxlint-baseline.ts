import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { z } from 'zod'

const repositoryRoot = path.resolve(import.meta.dirname, '../..')
const baselinePath = path.join(import.meta.dirname, 'oxlint-baseline.json')
const oxlintExecutable = path.join(repositoryRoot, 'node_modules/.bin/oxlint')
const toolTsconfigPath = 'tools/quality/tsconfig.json'
const verifierPath = 'tools/quality/verify-oxlint-baseline.ts'
const verifierTestPath = 'tools/quality/verify-oxlint-baseline.test.ts'
const disableNestedConfigFlag = '--disable-nested-config'

const spanSchema = z.object({
  column: z.number().int().positive(),
  length: z.number().int().nonnegative(),
  line: z.number().int().positive(),
  offset: z.number().int().nonnegative(),
})
const labelSchema = z.object({ label: z.string().optional(), span: spanSchema })
const diagnosticSchema = z.object({
  code: z.string(),
  filename: z.string().optional(),
  labels: z.array(labelSchema).default([]),
  message: z.string(),
  severity: z.string(),
})
const reportSchema = z.object({ diagnostics: z.array(diagnosticSchema) })
const labelSummarySchema = z.object({
  context: z.object({ current: z.string(), next: z.string(), previous: z.string() }),
  span: z.string(),
  text: z.string(),
})
const summarySchema = z.object({
  code: z.string(),
  file: z.string(),
  labels: z.array(labelSummarySchema).min(1),
  message: z.string(),
  severity: z.string(),
})
const baselineEntrySchema = z.object({ count: z.number().int().positive(), summary: summarySchema })
const targetPolicySchema = z.object({
  config: z.string(),
  configSha256: z.string().regex(/^[a-f\d]{64}$/u),
  files: z.array(z.string()),
  invocation: z.array(z.string()),
  name: z.enum(['app', 'deno']),
  resolvedConfigSha256: z.string().regex(/^[a-f\d]{64}$/u),
  scope: z.object({ ignorePatterns: z.array(z.string()), paths: z.array(z.string()).min(1) }),
})
const policySchema = z.object({
  oxlintVersion: z.string().min(1),
  targets: z.array(targetPolicySchema).length(2),
  toolTsconfigSha256: z.string().regex(/^[a-f\d]{64}$/u),
})
const baselineSchema = z.object({
  diagnostics: z.record(z.string(), baselineEntrySchema),
  policy: policySchema,
  version: z.literal(3),
})

export type OxlintDiagnostic = z.infer<typeof diagnosticSchema>
type Baseline = z.infer<typeof baselineSchema>
type BaselineEntry = z.infer<typeof baselineEntrySchema>
type Policy = z.infer<typeof policySchema>
type Summary = z.infer<typeof summarySchema>
type SourceReader = (file: string) => string

interface Target {
  config: string
  flags: string[]
  name: 'app' | 'deno'
  paths: string[]
  scope: { ignorePatterns: string[]; paths: string[] }
}

interface LintReport {
  diagnostics: OxlintDiagnostic[]
  target: Target['name']
}

interface Differences {
  additions: BaselineEntry[]
  improvements: { baseline: BaselineEntry; current: BaselineEntry }[]
  removals: BaselineEntry[]
}

interface VerifierArguments {
  bootstrap: boolean
  prune: boolean
}

type PolicyWithoutCoverage = Omit<Policy, 'targets'> & {
  targets: Omit<Policy['targets'][number], 'files'>[]
}

const targets: Target[] = [
  {
    config: 'oxlint.config.ts',
    flags: [
      disableNestedConfigFlag,
      '--config',
      'oxlint.config.ts',
      '--type-aware',
      '--type-check',
      '--max-warnings=0',
      '--ignore-pattern',
      'supabase/functions/**',
    ],
    name: 'app',
    paths: ['.'],
    scope: { ignorePatterns: ['supabase/functions/**'], paths: ['.'] },
  },
  {
    config: 'oxlint.deno.config.ts',
    flags: [disableNestedConfigFlag, '--config', 'oxlint.deno.config.ts', '--max-warnings=0'],
    name: 'deno',
    paths: ['supabase/functions'],
    scope: { ignorePatterns: [], paths: ['supabase/functions'] },
  },
]

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

type JsonValue = boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue }

const jsonPrimitiveSchema = z.union([z.boolean(), z.null(), z.number(), z.string()])
const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([jsonPrimitiveSchema, z.array(jsonValueSchema), z.record(z.string(), jsonValueSchema)]),
)
const jsonRecordSchema = z.record(z.string(), jsonValueSchema)

const compareJsonKeys = (left: string, right: string): number => {
  if (left < right) {
    return -1
  }
  if (left > right) {
    return 1
  }
  return 0
}

const canonicalizeJsonValue = (value: JsonValue, parentKey?: string): JsonValue => {
  const primitive = jsonPrimitiveSchema.safeParse(value)
  if (primitive.success) {
    return primitive.data
  }
  if (Array.isArray(value)) {
    const entries = value.map((entry) => canonicalizeJsonValue(entry))
    const pluginNames = z.array(z.string()).safeParse(entries)
    if (parentKey === 'plugins' && pluginNames.success) {
      return pluginNames.data.toSorted(compareJsonKeys)
    }
    return entries
  }
  const record = jsonRecordSchema.parse(value)
  return Object.fromEntries(
    Object.entries(record)
      .map(([key, nestedValue]) => [key, canonicalizeJsonValue(nestedValue, key)] as const)
      .toSorted(([left], [right]) => compareJsonKeys(left, right)),
  )
}

export const canonicalJson = (value: string): string =>
  JSON.stringify(canonicalizeJsonValue(jsonValueSchema.parse(JSON.parse(value))))

const normalizedFile = (filename: string): string => {
  const absoluteFile = path.resolve(repositoryRoot, filename)
  const relativeFile = path.relative(repositoryRoot, absoluteFile)
  if (
    relativeFile === '' ||
    relativeFile.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativeFile)
  ) {
    throw new Error(`Oxlint reported a file outside this repository: ${filename}`)
  }
  return relativeFile.split(path.sep).join('/')
}

const readRepositorySource = (() => {
  const cache = new Map<string, string>()
  return (file: string): string => {
    const cached = cache.get(file)
    if (cached !== undefined) {
      return cached
    }
    const source = readFileSync(path.join(repositoryRoot, file), 'utf-8')
    cache.set(file, source)
    return source
  }
})()

const labelContext = (source: string, lineNumber: number): Summary['labels'][number]['context'] => {
  const lines = source.split(/\r?\n/u)
  if (lineNumber > lines.length) {
    throw new Error(`Oxlint reported an out-of-bounds line ${lineNumber}`)
  }
  return {
    current: (lines[lineNumber - 1] ?? '').trim(),
    next: (lines[lineNumber] ?? '').trim(),
    previous: (lines[lineNumber - 2] ?? '').trim(),
  }
}

const isConfigurationDiagnostic = (diagnostic: OxlintDiagnostic): boolean =>
  diagnostic.code === 'typescript(tsconfig-error)' || /invalid tsconfig/iu.test(diagnostic.message)

const summarizeLabel = (
  source: string,
  label: OxlintDiagnostic['labels'][number],
): Summary['labels'][number] => {
  const sourceBytes = Buffer.from(source, 'utf-8')
  const { length, offset } = label.span
  if (offset + length > sourceBytes.byteLength) {
    throw new Error(`Oxlint reported an out-of-bounds UTF-8 span at byte ${offset}`)
  }
  return {
    context: labelContext(source, label.span.line),
    span: sourceBytes.subarray(offset, offset + length).toString('utf-8'),
    text: label.label ?? '',
  }
}

export const summarizeDiagnostic = (
  diagnostic: OxlintDiagnostic,
  readSource: SourceReader = readRepositorySource,
): Summary => {
  if (isConfigurationDiagnostic(diagnostic)) {
    throw new Error(`Oxlint configuration error: ${diagnostic.message}`)
  }
  if (diagnostic.filename === undefined) {
    throw new Error(
      `Oxlint reported a non-baselinable diagnostic without a filename: ${diagnostic.code}`,
    )
  }
  if (diagnostic.labels.length === 0) {
    throw new Error(
      `Oxlint reported a non-baselinable diagnostic without labels: ${diagnostic.code}`,
    )
  }

  const file = normalizedFile(diagnostic.filename)
  const source = readSource(file)
  return {
    code: diagnostic.code,
    file,
    labels: diagnostic.labels.map((label) => summarizeLabel(source, label)),
    message: diagnostic.message,
    severity: diagnostic.severity,
  }
}

const canonicalIdentity = (summary: Summary) => ({
  code: summary.code,
  file: summary.file,
  labels: summary.labels.map((label) => ({
    context: label.context,
    span: label.span,
    text: label.text,
  })),
  message: summary.message,
  severity: summary.severity,
})

const strictFingerprint = (summary: Summary): string =>
  sha256(JSON.stringify(canonicalIdentity(summary)))

const looseLabelIdentity = (label: Summary['labels'][number]) => {
  if (label.span.includes('\n') && label.span.startsWith(label.context.current)) {
    return { anchor: label.context.current, kind: 'range', text: label.text }
  }
  return { kind: 'span', span: label.span, text: label.text }
}

const looseFingerprint = (summary: Summary): string =>
  sha256(
    JSON.stringify({
      code: summary.code,
      file: summary.file,
      labels: summary.labels.map(looseLabelIdentity),
      message: summary.message,
      severity: summary.severity,
    }),
  )

const metricFingerprint = (summary: Summary, message: string): string =>
  sha256(
    JSON.stringify({
      code: summary.code,
      file: summary.file,
      labels: summary.labels.map((label) => ({ anchor: label.context.current, text: label.text })),
      message,
      severity: summary.severity,
    }),
  )

interface ScoredEntry {
  entry: BaselineEntry
  score: number
}

interface EntryGroup<T> {
  additions: T[]
  removals: T[]
}

interface MatchedEntries {
  additions: Set<BaselineEntry>
  removals: Set<BaselineEntry>
}

interface MetricMatches extends MatchedEntries {
  improvements: Differences['improvements']
}

const eslintComplexityPattern =
  /^(?<prefix>.* has a complexity of )(?<score>\d+)(?<suffix>\. Maximum allowed is \d+\.)$/u
const sonarCognitiveComplexityPattern =
  /^(?<prefix>Refactor this function to reduce its Cognitive Complexity from )(?<score>\d+)(?<suffix> to the \d+ allowed\.)$/u

const metricPatternFor = (code: string): RegExp | undefined => {
  if (code === 'eslint(complexity)') {
    return eslintComplexityPattern
  }
  if (code === 'sonarjs(cognitive-complexity)') {
    return sonarCognitiveComplexityPattern
  }
  return undefined
}

const metricIdentity = (summary: Summary): { fingerprint: string; score: number } | undefined => {
  const pattern = metricPatternFor(summary.code)
  if (pattern === undefined) {
    return undefined
  }
  const match = pattern.exec(summary.message)
  const groups = match?.groups
  if (groups === undefined) {
    return undefined
  }
  const { prefix, score, suffix } = groups
  if (prefix === undefined || score === undefined || suffix === undefined) {
    return undefined
  }
  return {
    fingerprint: metricFingerprint(summary, `${prefix}<score>${suffix}`),
    score: Math.trunc(Number(score)),
  }
}

export const aggregateDiagnostics = (
  reports: LintReport[],
  readSource: SourceReader = readRepositorySource,
): Record<string, BaselineEntry> => {
  const entries = new Map<string, BaselineEntry>()
  for (const report of reports) {
    for (const diagnostic of report.diagnostics) {
      const summary = summarizeDiagnostic(diagnostic, readSource)
      const fingerprint = strictFingerprint(summary)
      const previous = entries.get(fingerprint)
      entries.set(fingerprint, { count: (previous?.count ?? 0) + 1, summary })
    }
  }
  return Object.fromEntries([...entries].toSorted(([left], [right]) => left.localeCompare(right)))
}

const differencesFor = (
  left: Record<string, BaselineEntry>,
  right: Record<string, BaselineEntry>,
): BaselineEntry[] => {
  const differences: BaselineEntry[] = []
  for (const [fingerprint, entry] of Object.entries(left)) {
    const count = entry.count - (right[fingerprint]?.count ?? 0)
    if (count > 0) {
      differences.push({ ...entry, count })
    }
  }
  return differences
}

type EntryKind = 'additions' | 'removals'

const isSinglePair = <T>(group: EntryGroup<T>): boolean =>
  group.additions.length === 1 && group.removals.length === 1

const entryGroupFor = <T>(
  groups: Map<string, EntryGroup<T>>,
  fingerprint: string,
): EntryGroup<T> => {
  const existing = groups.get(fingerprint)
  if (existing !== undefined) {
    return existing
  }
  const group = { additions: [], removals: [] }
  groups.set(fingerprint, group)
  return group
}

const appendEntries = (
  groups: Map<string, EntryGroup<BaselineEntry>>,
  entries: BaselineEntry[],
  kind: EntryKind,
): void => {
  for (const entry of entries) {
    const group = entryGroupFor(groups, looseFingerprint(entry.summary))
    group[kind].push(entry)
  }
}

const matchedContextEntries = (groups: Map<string, EntryGroup<BaselineEntry>>): MatchedEntries => {
  const additions = new Set<BaselineEntry>()
  const removals = new Set<BaselineEntry>()
  for (const group of groups.values()) {
    if (isSinglePair(group) && group.additions[0].count === 1 && group.removals[0].count === 1) {
      additions.add(group.additions[0])
      removals.add(group.removals[0])
    }
  }
  return { additions, removals }
}

const appendMetricEntries = (
  groups: Map<string, EntryGroup<ScoredEntry>>,
  entries: BaselineEntry[],
  ignored: Set<BaselineEntry>,
  kind: EntryKind,
): void => {
  for (const entry of entries) {
    if (!ignored.has(entry)) {
      const metric = metricIdentity(entry.summary)
      if (metric !== undefined) {
        const group = entryGroupFor(groups, metric.fingerprint)
        group[kind].push({ entry, score: metric.score })
      }
    }
  }
}

const lowerMetricPair = (group: EntryGroup<ScoredEntry>): boolean => {
  if (!isSinglePair(group)) {
    return false
  }
  const [addition] = group.additions
  const [removal] = group.removals
  return addition.entry.count === 1 && removal.entry.count === 1 && addition.score < removal.score
}

const metricImprovements = (groups: Map<string, EntryGroup<ScoredEntry>>): MetricMatches => {
  const additions = new Set<BaselineEntry>()
  const removals = new Set<BaselineEntry>()
  const improvements: Differences['improvements'] = []
  for (const group of groups.values()) {
    if (lowerMetricPair(group)) {
      const [addition] = group.additions
      const [removal] = group.removals
      const current = addition.entry
      const baseline = removal.entry
      additions.add(current)
      removals.add(baseline)
      improvements.push({ baseline, current })
    }
  }
  return { additions, improvements, removals }
}

const unmatchedEntries = (
  entries: BaselineEntry[],
  contextMatches: Set<BaselineEntry>,
  metricMatches: Set<BaselineEntry>,
): BaselineEntry[] =>
  entries.filter((entry) => !contextMatches.has(entry) && !metricMatches.has(entry))

export const compareDiagnostics = (
  current: Record<string, BaselineEntry>,
  baseline: Record<string, BaselineEntry>,
): Differences => {
  const additions = differencesFor(current, baseline)
  const removals = differencesFor(baseline, current)
  const contextGroups = new Map<string, EntryGroup<BaselineEntry>>()
  appendEntries(contextGroups, additions, 'additions')
  appendEntries(contextGroups, removals, 'removals')
  const contextMatches = matchedContextEntries(contextGroups)

  const metricGroups = new Map<string, EntryGroup<ScoredEntry>>()
  appendMetricEntries(metricGroups, additions, contextMatches.additions, 'additions')
  appendMetricEntries(metricGroups, removals, contextMatches.removals, 'removals')
  const metrics = metricImprovements(metricGroups)

  return {
    additions: unmatchedEntries(additions, contextMatches.additions, metrics.additions),
    improvements: metrics.improvements,
    removals: unmatchedEntries(removals, contextMatches.removals, metrics.removals),
  }
}

const runCommand = (args: string[]) => {
  const result = spawnSync(oxlintExecutable, args, {
    cwd: repositoryRoot,
    encoding: 'utf-8',
    maxBuffer: 128 * 1024 * 1024,
  })
  if (result.error !== undefined) {
    throw result.error
  }
  if (result.status === null || ![0, 1].includes(result.status)) {
    throw new Error(`Oxlint infrastructure failure (${result.status}): ${result.stderr}`)
  }
  return result
}

const jsonArguments = (target: Target, paths: string[] = target.paths): string[] => [
  ...target.flags,
  '--format',
  'json',
  ...paths,
]

const runTarget = (target: Target, paths?: string[]): OxlintDiagnostic[] => {
  const result = runCommand(jsonArguments(target, paths))
  try {
    return reportSchema.parse(JSON.parse(result.stdout)).diagnostics
  } catch (error) {
    throw new Error(`Oxlint did not produce a valid JSON report for ${target.name}`, {
      cause: error,
    })
  }
}

const collectLintedFiles = (target: Target): string[] => {
  const result = runCommand([...target.flags, '--debug', 'files', ...target.paths])
  const files: string[] = []
  for (const outputLine of result.stdout.split(/\r?\n/u)) {
    const file = outputLine.trim()
    if (file !== '') {
      files.push(normalizedFile(file))
    }
  }
  return files.toSorted()
}

const resolvedConfigDigest = (target: Target): string => {
  const result = runCommand([disableNestedConfigFlag, '--config', target.config, '--print-config'])
  if (result.status !== 0) {
    throw new Error(`Could not resolve ${target.config}: ${result.stderr}`)
  }
  return sha256(canonicalJson(result.stdout))
}

const currentPolicy = (): Policy => {
  const version = runCommand(['--version'])
  if (version.status !== 0) {
    throw new Error(`Could not read the Oxlint version: ${version.stderr}`)
  }
  return {
    oxlintVersion: version.stdout.trim(),
    targets: targets.map((target) => ({
      config: target.config,
      configSha256: sha256(readFileSync(path.join(repositoryRoot, target.config), 'utf-8')),
      files: collectLintedFiles(target),
      invocation: jsonArguments(target),
      name: target.name,
      resolvedConfigSha256: resolvedConfigDigest(target),
      scope: target.scope,
    })),
    toolTsconfigSha256: sha256(readFileSync(path.join(repositoryRoot, toolTsconfigPath), 'utf-8')),
  }
}

const diagnosticCount = (entries: Record<string, BaselineEntry>): number =>
  Object.values(entries).reduce((total, entry) => total + entry.count, 0)

const reportChanges = ({ additions, improvements, removals }: Differences): void => {
  console.error(
    `Oxlint ratchet failed: ${additions.length} new, ${improvements.length} improved, and ${removals.length} stale diagnostic fingerprints.`,
  )
  for (const entry of additions.slice(0, 20)) {
    console.error(`NEW (${entry.count}) ${JSON.stringify(entry.summary)}`)
  }
  for (const entry of removals.slice(0, 20)) {
    console.error(`STALE (${entry.count}) ${JSON.stringify(entry.summary)}`)
  }
  for (const improvement of improvements.slice(0, 20)) {
    console.error(
      `IMPROVED ${JSON.stringify(improvement.baseline.summary)} -> ${JSON.stringify(improvement.current.summary)}`,
    )
  }
}

const policyWithoutCoverage = (policy: Policy): PolicyWithoutCoverage => ({
  ...policy,
  targets: policy.targets.map(({ files: _files, ...target }) => target),
})

const policyTargetFields = [
  'config',
  'configSha256',
  'invocation',
  'resolvedConfigSha256',
  'scope',
] as const satisfies readonly (keyof PolicyWithoutCoverage['targets'][number])[]

export const policyDifferences = (
  baselinePolicy: PolicyWithoutCoverage,
  currentPolicyValue: PolicyWithoutCoverage,
): string[] => {
  const differences: string[] = []
  if (baselinePolicy.oxlintVersion !== currentPolicyValue.oxlintVersion) {
    differences.push('oxlintVersion')
  }
  if (baselinePolicy.toolTsconfigSha256 !== currentPolicyValue.toolTsconfigSha256) {
    differences.push('toolTsconfigSha256')
  }

  const currentTargets = new Map(
    currentPolicyValue.targets.map((target) => [target.name, target] as const),
  )
  for (const baselineTarget of baselinePolicy.targets) {
    const currentTarget = currentTargets.get(baselineTarget.name)
    if (currentTarget === undefined) {
      differences.push(`targets.${baselineTarget.name}`)
      continue
    }
    for (const field of policyTargetFields) {
      if (JSON.stringify(baselineTarget[field]) !== JSON.stringify(currentTarget[field])) {
        differences.push(`targets.${baselineTarget.name}.${field}`)
      }
    }
  }
  for (const currentTarget of currentPolicyValue.targets) {
    if (!baselinePolicy.targets.some((target) => target.name === currentTarget.name)) {
      differences.push(`targets.${currentTarget.name}`)
    }
  }
  return differences
}

const coverageChanges = (baselinePolicy: Policy, currentPolicyValue: Policy) => {
  const missing: { file: string; target: Target['name'] }[] = []
  const currentTargets = new Map(
    currentPolicyValue.targets.map((target) => [target.name, target] as const),
  )
  for (const baselineTarget of baselinePolicy.targets) {
    const currentTarget = currentTargets.get(baselineTarget.name)
    if (currentTarget === undefined) {
      throw new Error(`Oxlint policy no longer has the ${baselineTarget.name} target.`)
    }
    const currentFiles = new Set(currentTarget.files)
    for (const file of baselineTarget.files) {
      if (!currentFiles.has(file)) {
        missing.push({ file, target: baselineTarget.name })
      }
    }
  }
  return missing
}

const writeBaseline = (baseline: Baseline): void => {
  writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`)
}

const assertToolingIsClean = (): void => {
  const [appTarget] = targets
  const diagnostics = runTarget(appTarget, [verifierPath, verifierTestPath])
  if (diagnostics.length > 0) {
    throw new Error(
      `The baseline verifier and its tests must have zero Oxlint diagnostics before ratcheting the repository: ${JSON.stringify(diagnostics)}`,
    )
  }
}

const parseArguments = (): VerifierArguments => {
  const argumentsSet = new Set(process.argv.slice(2))
  const allowed = new Set(['--bootstrap', '--prune'])
  const unsupported = [...argumentsSet].filter((argument) => !allowed.has(argument))
  if (unsupported.length > 0) {
    throw new Error(`Unsupported baseline verifier arguments: ${unsupported.join(', ')}`)
  }
  const bootstrap = argumentsSet.has('--bootstrap')
  const prune = argumentsSet.has('--prune')
  if (bootstrap && prune) {
    throw new Error('Choose either --bootstrap or --prune, not both.')
  }
  return { bootstrap, prune }
}

const collectDiagnostics = (): Record<string, BaselineEntry> => {
  const reports: LintReport[] = []
  for (const target of targets) {
    reports.push({ diagnostics: runTarget(target), target: target.name })
  }
  return aggregateDiagnostics(reports)
}

const createBaseline = (diagnostics: Record<string, BaselineEntry>, policy: Policy): void => {
  if (process.env.OXLINT_BASELINE_BOOTSTRAP !== '1') {
    throw new Error('Set OXLINT_BASELINE_BOOTSTRAP=1 before creating a checked-in baseline.')
  }
  if (existsSync(baselinePath)) {
    throw new Error('The Oxlint baseline already exists; use lint:baseline:prune to remove debt.')
  }
  writeBaseline({ diagnostics, policy, version: 3 })
  console.log(`Created an Oxlint baseline for ${diagnosticCount(diagnostics)} diagnostics.`)
}

const readBaseline = (): Baseline =>
  baselineSchema.parse(JSON.parse(readFileSync(baselinePath, 'utf-8')))

const assertPolicyMatches = (baseline: Baseline, policy: Policy): void => {
  const differences = policyDifferences(
    policyWithoutCoverage(baseline.policy),
    policyWithoutCoverage(policy),
  )
  if (differences.length > 0) {
    throw new Error(
      `Oxlint policy changed: ${differences.join(', ')}. Review it and deliberately bootstrap a new baseline.`,
    )
  }
}

const assertCoverage = (baseline: Baseline, policy: Policy, prune: boolean) => {
  const missingCoverage = coverageChanges(baseline.policy, policy)
  const existingMissingFiles = missingCoverage.filter(({ file }) =>
    existsSync(path.join(repositoryRoot, file)),
  )
  if (existingMissingFiles.length > 0) {
    throw new Error(
      `Oxlint coverage shrank while these files still exist: ${existingMissingFiles
        .map(({ file, target }) => `${target}:${file}`)
        .join(', ')}`,
    )
  }
  if (missingCoverage.length > 0 && !prune) {
    throw new Error(
      `Oxlint coverage has stale deleted files; run lint:baseline:prune after confirming the change: ${missingCoverage
        .map(({ file, target }) => `${target}:${file}`)
        .join(', ')}`,
    )
  }
  return missingCoverage
}

const pruneBaseline = (
  diagnostics: Record<string, BaselineEntry>,
  policy: Policy,
  changes: Differences,
  missingCoverage: { file: string; target: Target['name'] }[],
): void => {
  if (changes.additions.length > 0) {
    reportChanges(changes)
    throw new Error('Refusing to prune while new or increased Oxlint diagnostics exist.')
  }
  if (
    changes.improvements.length === 0 &&
    changes.removals.length === 0 &&
    missingCoverage.length === 0
  ) {
    console.log('Oxlint baseline is already current; nothing to prune.')
    return
  }

  writeBaseline({ diagnostics, policy, version: 3 })
  console.log(
    `Pruned ${changes.removals.length} stale diagnostic fingerprints, adopted ${changes.improvements.length} improved metrics, and removed ${missingCoverage.length} deleted files.`,
  )
}

const verifyBaseline = (
  diagnostics: Record<string, BaselineEntry>,
  policy: Policy,
  prune: boolean,
): void => {
  const baseline = readBaseline()
  assertPolicyMatches(baseline, policy)
  const missingCoverage = assertCoverage(baseline, policy, prune)
  const changes = compareDiagnostics(diagnostics, baseline.diagnostics)
  if (prune) {
    pruneBaseline(diagnostics, policy, changes, missingCoverage)
    return
  }

  if (
    changes.additions.length === 0 &&
    changes.improvements.length === 0 &&
    changes.removals.length === 0
  ) {
    console.log(`Oxlint ratchet passed: ${diagnosticCount(diagnostics)} baseline diagnostics.`)
    return
  }
  reportChanges(changes)
  throw new Error('Resolve new diagnostics; prune only stale entries or approved improvements.')
}

const main = (): void => {
  const { bootstrap, prune } = parseArguments()
  assertToolingIsClean()
  const diagnostics = collectDiagnostics()
  const policy = currentPolicy()
  if (bootstrap) {
    createBaseline(diagnostics, policy)
    return
  }
  verifyBaseline(diagnostics, policy, prune)
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === import.meta.filename) {
  main()
}
