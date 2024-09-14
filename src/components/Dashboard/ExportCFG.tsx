'use client'

import {
  AppleOutlined,
  LinuxOutlined,
  WindowsOutlined,
} from '@ant-design/icons'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

import UnixInstaller from '@/components/Dashboard/UnixInstaller'
import WindowsInstaller from '@/components/Dashboard/WindowsInstaller'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function InstallPage() {
  const [activeKey, setActiveKey] = useState('windows')
  const router = useRouter()

  const updateUrlWithGsiType = (newGsiType: string) => {
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, gsiType: newGsiType },
      },
      undefined,
      { shallow: true }
    )
  }

  useEffect(() => {
    const parsedStep = router.query.gsiType as string
    if (parsedStep === 'windows' || parsedStep === 'manual') {
      setActiveKey(parsedStep)
    }
  }, [router.query.gsiType])

  useEffect(() => {
    const determinePlatform = () => {
      if (
        'userAgentData' in navigator &&
        'platform' in navigator.userAgentData
      ) {
        return (navigator.userAgentData as any).platform.toLowerCase()
      }
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
  }, [router])

  return (
    <Tabs
      value={activeKey}
      onValueChange={(value) => {
        setActiveKey(value)
        updateUrlWithGsiType(value)
      }}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="windows">
          <WindowsOutlined className="mr-2 h-4 w-4" />
          Automatic
        </TabsTrigger>
        <TabsTrigger value="manual">
          <AppleOutlined className="mr-2 h-4 w-4" />
          <LinuxOutlined className="mr-2 h-4 w-4" />
          Manual
        </TabsTrigger>
      </TabsList>
      <TabsContent value="windows">
        <WindowsInstaller />
      </TabsContent>
      <TabsContent value="manual">
        <UnixInstaller />
      </TabsContent>
    </Tabs>
  )
}

export default InstallPage
