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
    const parsedStep = router.query.gsiType
    if (parsedStep === 'windows' || parsedStep === 'manual') {
      setActiveKey(parsedStep)
    }
  }, [router.query.gsiType])

  useEffect(() => {
    if (!router.isReady || router.query.gsiType) {
      return
    }

    const platform =
      // @ts-expect-error userAgentData is not yet in the TS types
      navigator.userAgentData?.platform?.toLowerCase() ?? navigator.userAgent.toLowerCase()

    if (platform.includes('win')) {
      updateUrlWithGsiType('windows')
    } else {
      updateUrlWithGsiType('manual')
      setAutoRoutedToManual(true)
    }
    // UpdateUrlWithGsiType is stable enough; depending on router.isReady ensures
    // We only auto-route after Next.js has hydrated the query.
  }, [router.isReady, router.query.gsiType])

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
          if (key === 'windows' || key === 'manual') {
            updateUrlWithGsiType(key)
          }
        }}
        items={[
          {
            children: <WindowsInstaller />,
            icon: <WindowsOutlined />,
            key: 'windows',
            label: 'Automatic (Windows)',
          },
          {
            children: <UnixInstaller />,
            icon: (
              <>
                <AppleOutlined />
                <LinuxOutlined />
              </>
            ),
            key: 'manual',
            label: 'Manual (Mac, Linux, or Windows fallback)',
          },
        ]}
      />
    </Card>
  )
}

export default InstallPage
