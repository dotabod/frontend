import { Head, Html, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html className='h-full bg-transparent' lang='en'>
      <Head>
        <link rel='apple-touch-icon' sizes='180x180' href='/apple-touch-icon.png' />
        <link rel='icon' type='image/png' sizes='32x32' href='/favicon-32x32.png' />
        <link rel='icon' type='image/png' sizes='16x16' href='/favicon-16x16.png' />
        <link rel='manifest' href='/site.webmanifest' />
        <link rel='mask-icon' href='/safari-pinned-tab.svg' color='#5bbad5' />
        <meta name='msapplication-TileColor' content='#da532c' />
        <meta name='theme-color' content='#000000' />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(d,s,i,r) {
                if (d.getElementById(i)){return;}
                var n=d.createElement(s),e=d.getElementsByTagName(s)[0];
                n.id=i;n.src='//js-na1.hs-scripts.com/39771134.js';
                e.parentNode.insertBefore(n, e);
              })(document,"script","hs-script");

              // Initialize HubSpot tracking object
              var _hsq = window._hsq = window._hsq || [];
            `
          }}
        />
      </Head>
      <body className='min-h-screen bg-transparent'>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
