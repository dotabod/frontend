export const getPrismaDatasourceUrl = function getPrismaDatasourceUrl(
  databaseUrl: string | undefined,
  isVercel: boolean,
): string | undefined {
  if (databaseUrl === undefined || databaseUrl.length === 0 || !isVercel) {
    return databaseUrl
  }

  const datasourceUrl = new URL(databaseUrl)
  datasourceUrl.searchParams.set('connection_limit', '1')

  return datasourceUrl.toString()
}
