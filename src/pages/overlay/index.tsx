import { Spin } from 'antd'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'

const isMaintenanceMode = process.env.NEXT_PUBLIC_IS_IN_MAINTENANCE_MODE === 'true'

const OverlayPage = () => {
  const { data } = useSession()
  const [scale, setScale] = useState(1)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (isMaintenanceMode) return

    const resizeListener = () => {
      const headerHeight = 309
      const sideNavWidth = 380

      const adjustedWidth = window.innerWidth - sideNavWidth
      const adjustedHeight = window.innerHeight - headerHeight

      const scaleX = adjustedWidth / 1920
      const scaleY = adjustedHeight / 1080
      const newScale = Math.min(scaleX, scaleY)

      setScale(newScale)
    }

    resizeListener()

    window.addEventListener('resize', resizeListener)

    return () => window.removeEventListener('resize', resizeListener)
  }, [])

  if (isMaintenanceMode) {
    return null
  }

  // Calculate scaled dimensions
  const scaledWidth = 1920 * scale
  const scaledHeight = 1080 * scale

  return (
    <>
      <Head>
        <title>Dotabod | Troubleshooting</title>
      </Head>

      <Header
        subtitle='Take a peek to see if your OBS is showing the correct overlay. Try joining a live match to have this preview show some details.'
        title='Live preview'
      />
      <Spin size='large' tip='Loading overlay...' spinning={isLoading}>
        <div
          style={{
            width: `${scaledWidth}px`,
            height: `${scaledHeight}px`,
            overflow: 'hidden',
          }}
        >
          <iframe
            title='dotabod overlay'
            onLoad={() => setIsLoading(false)}
            className='rounded-lg border border-gray-400'
            src={`/overlay/${data?.user?.id}`}
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              width: 1920,
              height: 1080,
            }}
          />
        </div>
      </Spin>
    </>
  )
}

OverlayPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardShell>{page}</DashboardShell>
}

export default OverlayPage
