export const internalServerErrorResponse = (error: Error): Response => {
  console.error('sync-hubspot fatal', error)
  return Response.json({ error: 'Internal server error' }, { status: 500 })
}
