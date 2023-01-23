import * as FullStory from '@fullstory/browser'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

const FullStorySession = () => {
  const { data, status } = useSession()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FULLSTORY_ORG_ID) return

    FullStory.init({
      host: process.env.NEXT_PUBLIC_FULLSTORY_HOST,
      orgId: process.env.NEXT_PUBLIC_FULLSTORY_ORG_ID,
      script: `${process.env.NEXT_PUBLIC_FULLSTORY_HOST}/s/fs.js`,
      debug: process.env.NODE_ENV !== 'production',
      devMode: process.env.NODE_ENV !== 'production',
    })
  }, [])
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_FULLSTORY_ORG_ID) return

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
