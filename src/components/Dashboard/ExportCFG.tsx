import UnixInstaller from '@/components/Dashboard/UnixInstaller'
import { Card } from '@/ui/card'
import {
  AppleOutlined,
  LinuxOutlined,
  WindowsOutlined,
} from '@ant-design/icons'
import { Tabs } from 'antd'
import { useEffect, useState } from 'react'
import WindowsInstaller from './WindowsInstaller'

function InstallPage() {
  const [activeKey, setActiveKey] = useState('windows')

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

    const platform = determinePlatform()
    if (platform.includes('win')) {
      setActiveKey('windows')
    } else {
      setActiveKey('unix')
    }
  }, [])

  return (
    <Card>
      <Tabs
        defaultActiveKey={activeKey}
        activeKey={activeKey}
        onChange={setActiveKey}
        items={[
          {
            key: 'windows',
            label: 'Windows',
            children: <WindowsInstaller />,
            icon: <WindowsOutlined />,
          },
          {
            key: 'unix',
            label: 'Unix',
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
