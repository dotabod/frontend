import { getRequestExecutionContext } from 'vinext/shims/request-context'

export const runBackgroundTask = async (task: Promise<unknown>): Promise<void> => {
  const context = getRequestExecutionContext()
  if (context) {
    context.waitUntil(task)
    return
  }

  // Non-Worker runtimes must finish the task before the response can end their lifetime.
  await task
}
