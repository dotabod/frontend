interface DotabodHyperdriveBinding {
  connectionString: string
}

interface DotabodCloudflareEnv {
  HYPERDRIVE: DotabodHyperdriveBinding
}

declare var hyperdriveGlobal: DotabodHyperdriveBinding | undefined
