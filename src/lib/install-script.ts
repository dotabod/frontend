export const createInstallResponse = (request: Request, script: string): Response => {
  const host = request.headers.get('host') ?? new URL(request.url).host
  return new Response(script.replaceAll('/dotabod.com', `/${host}`), {
    headers: {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Content-Disposition': 'attachment; filename=install.ps1',
      'Content-Type': 'application/octet-stream',
      Expires: '0',
      Pragma: 'no-cache',
    },
  })
}
