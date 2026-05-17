import { AppleOutlined, LinuxOutlined, WindowsOutlined } from '@ant-design/icons'
import { Alert, Button, Tabs } from 'antd'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import UnixInstaller from '@/components/Dashboard/UnixInstaller'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import WindowsInstaller from './WindowsInstaller'

function InstallPage() {
  const track = useTrack()
  const [activeKey, setActiveKey] = useState('windows')
  const [autoRoutedToManual, setAutoRoutedToManual] = useState(false)
  const router = useRouter()

  const updateUrlWithGsiType = (newGsiType: 'windows' | 'manual') => {
    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, gsiType: newGsiType },
      },
      undefined,
      { shallow: true },
    ) // `shallow: true` to not trigger data fetching methods again
  }

  useEffect(() => {
    const parsedStep = router.query.gsiType as string
    if (parsedStep === 'windows' || parsedStep === 'manual') {
      setActiveKey(parsedStep)
    }
  }, [router.query.gsiType])

  useEffect(() => {
    const determinePlatform = () => {
      // @ts-expect-error userAgentData is not yet in the TS types
      if (navigator.userAgentData?.platform) {
        // @ts-expect-error userAgentData is not yet in the TS types
        return navigator.userAgentData.platform.toLowerCase()
      }

      // Fallback to userAgent if userAgentData is not available
      return navigator.userAgent.toLowerCase()
    }

    if (!router.query.gsiType) {
      const platform = determinePlatform()
      if (platform.includes('win')) {
        updateUrlWithGsiType('windows')
      } else {
        updateUrlWithGsiType('manual')
        setAutoRoutedToManual(true)
      }
    }
  }, [])

  return (
    <Card>
      {autoRoutedToManual && activeKey === 'manual' && (
        <Alert
          type='info'
          showIcon
          className='mb-4 max-w-2xl'
          message='Showing manual install for your operating system'
          description={
            <span>
              The Automatic installer is Windows only. If you play Dota 2 on Windows,{' '}
              <Button
                type='link'
                onClick={() => updateUrlWithGsiType('windows')}
                className='p-0! h-auto! align-baseline!'
              >
                switch to the Automatic tab
              </Button>{' '}
              for a one-line install. Both options are free.
            </span>
          }
        />
      )}
      <Tabs
        onTabClick={(key) => {
          track('install_type/click', { label: key })
        }}
        destroyInactiveTabPane
        defaultActiveKey={activeKey}
        activeKey={activeKey}
        onChange={(key) => {
          updateUrlWithGsiType(key as 'windows' | 'manual')
        }}
        items={[
          {
            key: 'windows',
            label: 'Automatic (Windows)',
            children: <WindowsInstaller />,
            icon: <WindowsOutlined />,
          },
          {
            key: 'manual',
            label: 'Manual (Mac, Linux, or Windows fallback)',
            children: <UnixInstaller />,
            icon: (
              <>
                <AppleOutlined />
                <LinuxOutlined />
              </>
            ),
          },
        ]}
      />
    </Card>
  )
}

export default InstallPage
