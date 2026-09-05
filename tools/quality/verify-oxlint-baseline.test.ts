import { describe, expect, it } from 'vitest'

import {
  aggregateDiagnostics,
  canonicalJson,
  compareDiagnostics,
  policyDifferences,
  summarizeDiagnostic,
} from './verify-oxlint-baseline'
import type { OxlintDiagnostic } from './verify-oxlint-baseline'

const exampleFile = 'src/example.ts'
const sourceByFile = new Map<string, string>()
const readSource = (file: string): string => {
  const source = sourceByFile.get(file)
  if (source === undefined) {
    throw new Error(`Missing fixture source for ${file}`)
  }
  return source
}

const diagnostic = (overrides: Partial<OxlintDiagnostic> = {}): OxlintDiagnostic => ({
  code: 'eslint(no-alert)',
  filename: exampleFile,
  labels: [{ label: 'Avoid alert', span: { column: 1, length: 5, line: 2, offset: 6 } }],
  message: 'Unexpected alert.',
  severity: 'error',
  ...overrides,
})

describe('Oxlint baseline summaries', () => {
  it('canonicalizes resolved configuration object keys while retaining array order', () => {
    const firstConfig =
      '{"rules":{"zebra":"deny","alpha":"allow"},"plugins":["react","typescript"],"overrides":[{"files":["*.tsx","*.ts"],"rules":{"beta":"deny","alpha":"allow"}}]}'
    const reorderedConfig =
      '{"overrides":[{"rules":{"alpha":"allow","beta":"deny"},"files":["*.tsx","*.ts"]}],"plugins":["react","typescript"],"rules":{"alpha":"allow","zebra":"deny"}}'

    expect(canonicalJson(firstConfig)).toBe(canonicalJson(reorderedConfig))
    expect(canonicalJson(firstConfig)).toBe(
      '{"overrides":[{"files":["*.tsx","*.ts"],"rules":{"alpha":"allow","beta":"deny"}}],"plugins":["react","typescript"],"rules":{"alpha":"allow","zebra":"deny"}}',
    )
  })

  it('sorts resolved configuration keys by Unicode code unit instead of the host locale', () => {
    const config = '{"ä":"umlaut","a":"lowercase","Z":"uppercase"}'

    expect(canonicalJson(config)).toBe('{"Z":"uppercase","a":"lowercase","ä":"umlaut"}')
  })

  it('treats resolved plugin lists as unordered sets across native platforms', () => {
    const armConfig =
      '{"plugins":["react","unicorn","typescript"],"overrides":[{"files":["*.tsx","*.ts"],"plugins":["vitest","react"]}]}'
    const x64Config =
      '{"overrides":[{"plugins":["react","vitest"],"files":["*.tsx","*.ts"]}],"plugins":["typescript","react","unicorn"]}'

    expect(canonicalJson(armConfig)).toBe(canonicalJson(x64Config))
  })

  it('identifies the exact resolved configuration policy field that changes', () => {
    const baseline = {
      oxlintVersion: 'Version: 1.81.0',
      targets: [
        {
          config: 'oxlint.config.ts',
          configSha256: 'a'.repeat(64),
          invocation: ['--config', 'oxlint.config.ts'],
          name: 'app' as const,
          resolvedConfigSha256: 'b'.repeat(64),
          scope: { ignorePatterns: [], paths: ['.'] },
        },
        {
          config: 'oxlint.deno.config.ts',
          configSha256: 'c'.repeat(64),
          invocation: ['--config', 'oxlint.deno.config.ts'],
          name: 'deno' as const,
          resolvedConfigSha256: 'd'.repeat(64),
          scope: { ignorePatterns: [], paths: ['supabase/functions'] },
        },
      ],
      toolTsconfigSha256: 'e'.repeat(64),
    }
    const current = {
      ...baseline,
      targets: baseline.targets.map((target) =>
        target.name === 'app' ? { ...target, resolvedConfigSha256: 'f'.repeat(64) } : target,
      ),
    }

    expect(policyDifferences(baseline, current)).toStrictEqual(['targets.app.resolvedConfigSha256'])
  })

  it('uses UTF-8 byte offsets for label spans and retains surrounding lines', () => {
    sourceByFile.set(exampleFile, 'before\né🙂ok\nafter')
    const offset = Buffer.from('before\né', 'utf-8').byteLength
    const summary = summarizeDiagnostic(
      diagnostic({
        labels: [{ label: 'emoji', span: { column: 2, length: 4, line: 2, offset } }],
      }),
      readSource,
    )

    expect(summary.labels).toStrictEqual([
      {
        context: { current: 'é🙂ok', next: 'after', previous: 'before' },
        span: '🙂',
        text: 'emoji',
      },
    ])
  })

  it('counts duplicate diagnostics across app and Deno reports as a multiset', () => {
    sourceByFile.set(exampleFile, 'first\nalert\nlast')
    const summaries = aggregateDiagnostics(
      [
        { diagnostics: [diagnostic(), diagnostic()], target: 'app' },
        { diagnostics: [diagnostic({ code: 'deno(no-alert)' })], target: 'deno' },
      ],
      readSource,
    )

    expect(
      Object.values(summaries)
        .map((entry) => entry.count)
        .toSorted((a, b) => a - b),
    ).toStrictEqual([1, 2])
  })

  it('refuses diagnostics without labels and TypeScript configuration errors', () => {
    sourceByFile.set(exampleFile, 'first\nalert\nlast')

    expect(() => summarizeDiagnostic(diagnostic({ labels: [] }), readSource)).toThrow(
      /non-baselinable/u,
    )
    expect(() =>
      summarizeDiagnostic(
        diagnostic({ code: 'typescript(tsconfig-error)', message: 'Invalid tsconfig' }),
        readSource,
      ),
    ).toThrow(/configuration error/u)
  })

  it('rejects new and stale diagnostics but tolerates one unambiguous context change', () => {
    sourceByFile.set(exampleFile, 'first\nalert\nlast')
    const baseline = aggregateDiagnostics(
      [{ diagnostics: [diagnostic()], target: 'app' }],
      readSource,
    )

    sourceByFile.set(exampleFile, 'added\nalert\nlast')
    const moved = aggregateDiagnostics([{ diagnostics: [diagnostic()], target: 'app' }], readSource)
    expect(compareDiagnostics(moved, baseline)).toStrictEqual({
      additions: [],
      improvements: [],
      removals: [],
    })

    const changed = aggregateDiagnostics(
      [{ diagnostics: [diagnostic({ code: 'eslint(no-console)' })], target: 'app' }],
      readSource,
    )
    const differences = compareDiagnostics(changed, baseline)
    expect(differences.additions).toHaveLength(1)
    expect(differences.improvements).toHaveLength(0)
    expect(differences.removals).toHaveLength(1)
  })

  it('tolerates one unambiguous function diagnostic when its declaration stays put', () => {
    const legacySource = 'async function handler() {\n  legacyBranch()\n}'
    sourceByFile.set(exampleFile, legacySource)
    const legacy = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic({
              code: 'eslint(complexity)',
              labels: [
                {
                  span: {
                    column: 1,
                    length: Buffer.byteLength(legacySource),
                    line: 1,
                    offset: 0,
                  },
                },
              ],
              message: 'async function handler has a complexity of 21.',
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )

    const updatedSource = 'async function handler() {\n  updatedBranch()\n}'
    sourceByFile.set(exampleFile, updatedSource)
    const current = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic({
              code: 'eslint(complexity)',
              labels: [
                {
                  span: {
                    column: 1,
                    length: Buffer.byteLength(updatedSource),
                    line: 1,
                    offset: 0,
                  },
                },
              ],
              message: 'async function handler has a complexity of 21.',
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )

    expect(compareDiagnostics(current, legacy)).toStrictEqual({
      additions: [],
      improvements: [],
      removals: [],
    })
  })

  it('classifies one unambiguous lower complexity score as an improvement to prune', () => {
    sourceByFile.set(exampleFile, 'first\nalert\nlast')
    const baseline = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic({
              code: 'eslint(complexity)',
              message: 'async function handler has a complexity of 33. Maximum allowed is 20.',
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )
    const current = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic({
              code: 'eslint(complexity)',
              message: 'async function handler has a complexity of 31. Maximum allowed is 20.',
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )

    const differences = compareDiagnostics(current, baseline)
    expect(differences.additions).toHaveLength(0)
    expect(differences.removals).toHaveLength(0)
    expect(differences.improvements).toMatchObject([
      {
        baseline: {
          summary: {
            message: 'async function handler has a complexity of 33. Maximum allowed is 20.',
          },
        },
        current: {
          summary: {
            message: 'async function handler has a complexity of 31. Maximum allowed is 20.',
          },
        },
      },
    ])
  })

  it('rejects a complexity regression after a lower score has been pruned', () => {
    sourceByFile.set(exampleFile, 'first\nalert\nlast')
    const baseline = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic({
              code: 'eslint(complexity)',
              message: 'async function handler has a complexity of 31. Maximum allowed is 20.',
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )
    const current = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic({
              code: 'eslint(complexity)',
              message: 'async function handler has a complexity of 33. Maximum allowed is 20.',
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )

    const differences = compareDiagnostics(current, baseline)
    expect(differences.additions).toHaveLength(1)
    expect(differences.improvements).toHaveLength(0)
    expect(differences.removals).toHaveLength(1)
  })

  it('rejects an ambiguous contextual match', () => {
    sourceByFile.set(exampleFile, 'first\nalert\nlast')
    const baseline = aggregateDiagnostics(
      [
        {
          diagnostics: [
            diagnostic(),
            diagnostic({
              labels: [
                { label: 'Avoid alert', span: { column: 1, length: 5, line: 2, offset: 6 } },
              ],
            }),
          ],
          target: 'app',
        },
      ],
      readSource,
    )
    sourceByFile.set(exampleFile, 'changed\nalert\nlast')
    const current = aggregateDiagnostics(
      [{ diagnostics: [diagnostic()], target: 'app' }],
      readSource,
    )

    const differences = compareDiagnostics(current, baseline)
    expect(differences.additions).toHaveLength(1)
    expect(differences.improvements).toHaveLength(0)
    expect(differences.removals).toHaveLength(1)
  })
})
