import { Spin } from 'antd'
import type { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useSession } from 'next-auth/react'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import DashboardShell from '@/components/Dashboard/DashboardShell'
import Header from '@/components/Dashboard/Header'
import { getOverlayMaintenanceProps } from '@/lib/server/maintenance'

interface OverlayPageProps {
  maintenanceBlank: boolean
}

const OverlayPage = ({ maintenanceBlank }: OverlayPageProps) => {
  if (maintenanceBlank) {
    return null
  }

  const { data } = useSession()
  const [scale, setScale] = useState(1) // Initial scale is 1
  const [isLoading, setIsLoading] = useState(true) // Initial state is loading

  useEffect(() => {
    const resizeListener = () => {
      // Assuming headerHeight and sideNavWidth are known or can be dynamically calculated
      const headerHeight = 309 // Example height of the header
      const sideNavWidth = 380 // Example width of the side navigation

      // Adjust window dimensions by subtracting the sizes of header and side navigation
      const adjustedWidth = window.innerWidth - sideNavWidth
      const adjustedHeight = window.innerHeight - headerHeight

      // Calculate the scale ratio based on adjusted window size and content size (1920x1080)
      const scaleX = adjustedWidth / 1920
      const scaleY = adjustedHeight / 1080
      const newScale = Math.min(scaleX, scaleY) // Use the smaller scale to ensure content fits in both dimensions

      setScale(newScale)
    }

    // Set initial scale
    resizeListener()

    // Add event listener
    window.addEventListener('resize', resizeListener)

    // Cleanup function to remove event listener
    return () => window.removeEventListener('resize', resizeListener)
  }, [])

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

export const getServerSideProps: GetServerSideProps<OverlayPageProps> = async () =>
  getOverlayMaintenanceProps({})
