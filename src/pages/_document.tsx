import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import type { DocumentContext } from 'next/document'
import Document, { Head, Html, Main, NextScript } from 'next/document'

const MyDocument = () => (
  <Html className='h-full bg-transparent' lang='en'>
    <Head>
      <link rel='apple-touch-icon' sizes='180x180' href='/apple-touch-icon.png' />
      <link rel='icon' type='image/png' sizes='32x32' href='/favicon-32x32.png' />
      <link rel='icon' type='image/png' sizes='16x16' href='/favicon-16x16.png' />
      <link rel='manifest' href='/site.webmanifest' />
      <link rel='mask-icon' href='/safari-pinned-tab.svg' color='#5bbad5' />
      <meta name='msapplication-TileColor' content='#da532c' />
      <meta name='theme-color' content='#000000' />
    </Head>
    <body className='min-h-screen bg-transparent'>
      <Main />
      <NextScript />
    </body>
  </Html>
)

MyDocument.getInitialProps = async (ctx: DocumentContext) => {
  const cache = createCache()
  const originalRenderPage = ctx.renderPage
  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => (props) => (
        <StyleProvider cache={cache}>
          <App {...props} />
        </StyleProvider>
      ),
    })

  const initialProps = await Document.getInitialProps(ctx)
  const style = extractStyle(cache, true)

  // Create a new array with all styles
  const allStyles = [
    ...(Array.isArray(initialProps.styles) ? initialProps.styles : [initialProps.styles]),
    // Add the Ant Design styles as a string in a nonce attribute
    // This avoids using dangerouslySetInnerHTML or children props
    <style key='antd-styles' id='antd-styles' nonce='antd-css'>
      {style}
    </style>,
  ]

  return {
    ...initialProps,
    styles: allStyles,
  }
}

export default MyDocument
