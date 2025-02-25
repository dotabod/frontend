import Script from 'next/script';

const HubSpotScript = () => {
  return (
    <>
      <Script
        id="hs-script"
        strategy="afterInteractive"
        src="//js-na1.hs-scripts.com/39771134.js"
      />
      <Script
        id="hs-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            // Initialize HubSpot tracking object
            window._hsq = window._hsq || [];
          `
        }}
      />
    </>
  );
};

export default HubSpotScript;
