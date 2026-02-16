import type { GetServerSidePropsContext, GetServerSidePropsResult } from 'next'

export const isMaintenanceModeActive = () => {
  return process.env.VERCEL_ENV === 'production' && process.env.IS_IN_MAINTENANCE_MODE === 'true'
}

export const getMaintenanceRedirect = <P extends Record<string, unknown> = Record<string, never>>(
  ctx: GetServerSidePropsContext,
): GetServerSidePropsResult<P> => {
  if (isMaintenanceModeActive() && ctx.resolvedUrl !== '/maintenance') {
    return {
      redirect: {
        destination: '/maintenance',
        permanent: false,
      },
    }
  }

  return {
    props: {} as P,
  }
}

export const getOverlayMaintenanceProps = <P extends Record<string, unknown>>(
  props: P,
): GetServerSidePropsResult<P & { maintenanceBlank: boolean }> => {
  if (isMaintenanceModeActive()) {
    return {
      props: {
        ...props,
        maintenanceBlank: true,
      },
    }
  }

  return {
    props: {
      ...props,
      maintenanceBlank: false,
    },
  }
}
