import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

const HubSpotIdentification = () => {
  const { data, status } = useSession()

  useEffect(() => {
    // Only run if user is authenticated
    if (status === 'authenticated' && data?.user?.email) {
      // Make sure _hsq is initialized
      window._hsq = window._hsq || []

      // Identify the user
      window._hsq.push([
        'identify',
        {
          email: data.user.email,
          name: data.user.name,
        },
      ])

      // Track page view to register the identification
      window._hsq.push(['trackPageView'])
    }
  }, [status, data?.user?.email, data?.user?.name])

  return null
}

export default HubSpotIdentification
