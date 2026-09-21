import { PrismaPg } from '@prisma/adapter-pg'
import vinextWorker from 'vinext/server/fetch-handler'

interface VinextWorker {
  fetch(request: Request, env: DotabodCloudflareEnv, context: unknown): Promise<Response> | Response
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: vinext/server/fetch-handler is the generated Worker entry and exposes the standard fetch handler at runtime.
const worker = vinextWorker as VinextWorker

globalThis.cloudflarePrismaAdapterFactory = (connectionString) => new PrismaPg({ connectionString })

export default {
  fetch(request: Request, env: DotabodCloudflareEnv, context: unknown) {
    globalThis.hyperdriveGlobal = env.HYPERDRIVE
    return worker.fetch(request, env, context)
  },
}
