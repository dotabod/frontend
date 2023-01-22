import { Analytics as VercelAnalytics } from '@vercel/analytics/react'
import { SessionProvider } from 'next-auth/react'
import Script from 'next/script'

import '@/styles/tailwind.css'
import 'focus-visible'

import type { AppProps } from 'next/app'
import type { Session } from 'next-auth'
import { GeistProvider, Themes } from '@geist-ui/core'
import { MantineProvider } from '@mantine/core'
import { NotificationsProvider } from '@mantine/notifications'
import { GoogleAnalytics } from 'nextjs-google-analytics'

const myTheme1 = Themes.createFromDark({
  type: 'coolTheme',
  palette: {
    background: '#17181e',
    foreground: '#F2F4FB',
  },
})

// Use of the <SessionProvider> is mandatory to allow components that call
// `useSession()` anywhere in your application to access the `session` object.
export default function App({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps<{ session: Session }>) {
  return (
    <SessionProvider session={session}>
      <MantineProvider
        theme={{
          colorScheme: 'dark',
          colors: {
            blue: [
              '#eff6ff',
              '#dbeafe',
              '#bfdbfe',
              '#93c5fd',
              '#60a5fa',
              '#3b82f6',
              '#2563eb',
              '#1d4ed8',
              '#1e40af',
              '#1e3a8a',
            ],
            // override dark colors to change them for all components
            dark: [
              '#F9FAFB',
              'rgb(242,244,251)',
              'rgb(198,200,215)',
              'rgb(145,149,171)',
              'rgb(101,106,131)',
              'rgb(61,65,85)',
              'rgb(49,52,66)',
              'rgb(39,41,52)',
              'rgb(31,33,41)',
              'rgb(23,24,30)',
            ],
          },
        }}
      >
        <Script id="nextjs-fullstory-analytics">
          {`window['_fs_host'] = 'fullstory.com';
            window['_fs_script'] = 'edge.fullstory.com/s/fs.js';
            window['_fs_org'] = 'o-1GSF8Z-na1';
            window['_fs_namespace'] = 'FS';
            (function(m,n,e,t,l,o,g,y){
            if (e in m) {if(m.console && m.console.log) { m.console.log('FullStory namespace conflict. Please set window["_fs_namespace"].');} return;}
            g=m[e]=function(a,b,s){g.q?g.q.push([a,b,s]):g._api(a,b,s);};g.q=[];
            o=n.createElement(t);o.async=1;o.crossOrigin='anonymous';o.src='https://'+_fs_script;
            y=n.getElementsByTagName(t)[0];y.parentNode.insertBefore(o,y);
            g.identify=function(i,v,s){g(l,{uid:i},s);if(v)g(l,v,s)};g.setUserVars=function(v,s){g(l,v,s)};g.event=function(i,v,s){g('event',{n:i,p:v},s)};
            g.anonymize=function(){g.identify(!!0)};
            g.shutdown=function(){g("rec",!1)};g.restart=function(){g("rec",!0)};
            g.log = function(a,b){g("log",[a,b])};
            g.consent=function(a){g("consent",!arguments.length||a)};
            g.identifyAccount=function(i,v){o='account';v=v||{};v.acctId=i;g(o,v)};
            g.clearUserCookie=function(){};
            g.setVars=function(n, p){g('setVars',[n,p]);};
            g._w={};y='XMLHttpRequest';g._w[y]=m[y];y='fetch';g._w[y]=m[y];
            if(m[y])m[y]=function(){return g._w[y].apply(this,arguments)};
            g._v="1.3.0";
          })(window,document,window['_fs_namespace'],'script','user');`}
        </Script>
        <VercelAnalytics />
        <GoogleAnalytics />
        <NotificationsProvider position="top-center">
          <GeistProvider themes={[myTheme1]} themeType="coolTheme">
            <Component {...pageProps} />
          </GeistProvider>
        </NotificationsProvider>
      </MantineProvider>
    </SessionProvider>
  )
}
