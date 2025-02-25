import { useSession } from 'next-auth/react'
import { useEffect } from 'react'

const HubSpotIdentification = () => {
  const { data, status } = useSession()

  useEffect(() => {
    // Function to handle widget loading
    const handleHubspotLoad = async () => {
      if (status === 'authenticated' && data?.user?.email) {
        // Identify the visitor in HubSpot analytics
        if (window._hsq) {
          window._hsq.push([
            'identify',
            {
              email: data.user.email,
              name: data.user.name,
            },
          ])
        }

        // Set up for chat widget identification
        if (window.HubSpotConversations) {
          // Update the settings with the token
          window.hsConversationsSettings = {
            ...window.hsConversationsSettings,
            identificationEmail: data.user.email,
          }

          // Load the widget
          window.HubSpotConversations.widget.load()
        }
      } else if (window.HubSpotConversations) {
        // If not authenticated, still load the widget without identification
        window.HubSpotConversations.widget.load()
      }
    }

    // If HubSpot Conversations API is already available
    if (window.HubSpotConversations) {
      handleHubspotLoad()
    } else {
      // Otherwise, add to the queue to be executed when ready
      window.hsConversationsOnReady = window.hsConversationsOnReady || []
      window.hsConversationsOnReady.push(handleHubspotLoad)
    }
  }, [status, data?.user?.email, data?.user?.name])

  return null
}

export default HubSpotIdentification
