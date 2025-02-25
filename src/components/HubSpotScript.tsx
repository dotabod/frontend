import Script from 'next/script'

const HubSpotScript = () => {
  return (
    <>
      <Script
        id='hs-settings'
        strategy='beforeInteractive'
        dangerouslySetInnerHTML={{
          __html: `
            window.hsConversationsSettings = {
              loadImmediately: false
            };

            // Initialize HubSpot tracking object
            window._hsq = window._hsq || [];

            // Create a queue for callbacks when HubSpot conversations is ready
            window.hsConversationsOnReady = window.hsConversationsOnReady || [];
          `,
        }}
      />
      <Script
        id='hs-script'
        strategy='afterInteractive'
        src='//js-na1.hs-scripts.com/39771134.js'
      />
    </>
  )
}

export default HubSpotScript
