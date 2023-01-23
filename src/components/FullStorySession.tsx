import * as FullStory from '@fullstory/browser'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const FullStorySession = () => {
  const { data, status } = useSession()
  useEffect(() => {
    FullStory.init({
      orgId: 'o-1GSF8Z-na1',
      debug: process.env.NODE_ENV !== 'production',
      devMode: process.env.NODE_ENV !== 'production',
    })
  }, [])
  useEffect(() => {
    if (status === 'authenticated') {
      FullStory.identify(data?.user?.id, {
        displayName: data?.user?.name,
        email: data?.user?.email,
        twitchId_real: data?.user?.twitchId,
        locale_str: data?.user?.locale,
      })
    }
  }, [status])

  return null
}

export default FullStorySession
