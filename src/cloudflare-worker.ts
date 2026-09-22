import { PrismaPg } from '@prisma/adapter-pg'
import vinextWorker from 'vinext/server/fetch-handler'
import type { ExecutionContextLike } from 'vinext/shims/request-context'
import { runWithExecutionContext } from 'vinext/shims/request-context'

import { createInstallResponse } from './lib/install-script'
import installScript from './lib/private/install.ps1?raw'

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
    if (request.method === 'GET' && new URL(request.url).pathname === '/api/install') {
      return createInstallResponse(request, installScript)
    }

    globalThis.hyperdriveGlobal = env.HYPERDRIVE
    return await runWithExecutionContext(
      context,
      async () => await worker.fetch(request, env, context),
    )
  },
}
