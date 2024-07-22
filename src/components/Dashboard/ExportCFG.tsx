import UnixInstaller from '@/components/Dashboard/UnixInstaller'
import { Card } from '@/ui/card'
import {
  AppleOutlined,
  LinuxOutlined,
  WindowsOutlined,
} from '@ant-design/icons'
import { Tabs } from 'antd'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import WindowsInstaller from './WindowsInstaller'

function InstallPage() {
  const [activeKey, setActiveKey] = useState('windows')
  const router = useRouter()

  const updateUrlWithGsiType = (newGsiType: 'windows' | 'manual') => {
    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, gsiType: newGsiType },
      },
      undefined,
      { shallow: true }
    ) // `shallow: true` to not trigger data fetching methods again
  }

  useEffect(() => {
    const parsedStep = router.query.gsiType as string
    if (parsedStep === 'windows' || parsedStep === 'manual') {
      setActiveKey(parsedStep)
    }
  }, [router.query.gsiType])

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only run this effect once on load
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
      }
    }
  }, [])

  return (
    <Card>
      <Tabs
        destroyInactiveTabPane
        defaultActiveKey={activeKey}
        activeKey={activeKey}
        onChange={updateUrlWithGsiType}
        items={[
          {
            key: 'windows',
            label: 'Automatic',
            children: <WindowsInstaller />,
            icon: <WindowsOutlined />,
          },
          {
            key: 'manual',
            label: 'Manual',
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
