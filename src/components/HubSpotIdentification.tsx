import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

const HubSpotIdentification = () => {
  const { data, status } = useSession()

  useEffect(() => {
    // Only run if user is authenticated
    if (status === 'authenticated' && data?.user?.email) {
      // Make sure _hsq is initialized
      window._hsq = window._hsq || []

      // According to HubSpot docs, identify should be called before any tracking
      // This associates the email with the usertoken (hubspotutk cookie)
      window._hsq.push([
        'identify',
        {
          email: data.user.email,
          name: data.user.name,
        },
      ])

      // Also identify the user specifically for the chat widget
      if (window.hsConversationsOnReady) {
        window.hsConversationsOnReady.push(() => {
          if (window.HubSpotConversations) {
            // Set visitor identification for chat widget specifically
            window.HubSpotConversations.widget.identify({
              email: data.user.email,
              name: data.user.name,
            })

            // Force refresh the widget to apply identification
            window.HubSpotConversations.widget.refresh()
          }
        })
      }

      // Track page view to register the identification
      // This is needed to send the identification to HubSpot
      window._hsq.push(['trackPageView'])
    }
  }, [status, data?.user?.email, data?.user?.name])

  return null
}

export default HubSpotIdentification
