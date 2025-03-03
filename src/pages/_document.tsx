import themeConfig from '@/lib/theme/themeConfig'
import { StyleProvider, createCache, extractStyle } from '@ant-design/cssinjs'
import { ConfigProvider } from 'antd'
import Document, { type DocumentContext, Head, Html, Main, NextScript } from 'next/document'

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const cache = createCache()
    const originalRenderPage = ctx.renderPage

    ctx.renderPage = () =>
      originalRenderPage({
        enhanceApp: (App) => (props) => (
          <StyleProvider cache={cache} hashPriority='high'>
            <ConfigProvider theme={themeConfig}>
              <App {...props} />
            </ConfigProvider>
          </StyleProvider>
        ),
      })

    const initialProps = await Document.getInitialProps(ctx)
    const style = extractStyle(cache, true)

    return {
      ...initialProps,
      styles: (
        <>
          {initialProps.styles}
          {/* eslint-disable-next-line react/no-danger */}
          <style data-type='antd-cssinjs' dangerouslySetInnerHTML={{ __html: style }} />
        </>
      ),
    }
  }

  render() {
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
        </Head>
        <body className='min-h-screen bg-transparent'>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}
