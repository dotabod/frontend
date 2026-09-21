import { PrismaPg } from '@prisma/adapter-pg'
import vinextWorker from 'vinext/server/fetch-handler'
import type { ExecutionContextLike } from 'vinext/shims/request-context'

interface VinextWorker {
  fetch: (
    request: Request,
    env: DotabodCloudflareEnv,
    context: ExecutionContextLike,
  ) => Promise<Response> | Response
}

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: vinext/server/fetch-handler is the generated Worker entry and exposes the standard fetch handler at runtime.
const worker = vinextWorker as VinextWorker

globalThis.cloudflarePrismaAdapterFactory = (connectionString) => new PrismaPg({ connectionString })

export default {
  async fetch(
    request: Request,
    env: DotabodCloudflareEnv,
    context: ExecutionContextLike,
  ): Promise<Response> {
    globalThis.hyperdriveGlobal = env.HYPERDRIVE
    return worker.fetch(request, env, context)
  },
}
