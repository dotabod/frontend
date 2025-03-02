import {
  COOKIE_EVENTS,
  type CookiePreferences,
  getDomain,
  showCookieConsentBanner,
  showCookieConsentSettings,
  useCookiePreferences,
} from '@/lib/cookieManager'
import {
  Alert,
  Button,
  Checkbox,
  Collapse,
  Divider,
  Drawer,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const { Title, Paragraph, Text } = Typography
const { TabPane } = Tabs

// Export the functions for easy access
export const useCookieConsent = () => ({
  showConsentBanner: showCookieConsentBanner,
  showConsentSettings: showCookieConsentSettings,
})

// Define cookie info type
type CookieInfo = {
  name: string
  domain: string
  description: string
  expiry: string
  type: string
  pattern?: boolean
}

// Define window with our custom properties
declare global {
  interface Window {
    _ga_enabled?: boolean
    _hubspot_enabled?: boolean
    // eslint-disable-next-line @typescript-eslint/ban-types
    dataLayer?: Array<Object>
    gtag?: (command: string, ...args: Array<unknown>) => void
    HubSpotConsentConfig?: {
      setTrackingCookiesAllowed: (allowed: boolean) => void
    }
  }
}

const cookieInfo: Record<string, CookieInfo[]> = {
  necessary: [
    {
      name: 'next-auth.csrf-token',
      domain: getDomain(),
      description:
        'Ensures visitor browsing-security by preventing cross-site request forgery. This cookie is essential for the security of the website and visitor.',
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: 'next-auth.callback-url',
      domain: getDomain(),
      description: "Used in order to detect spam and improve the website's security.",
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: 'next-auth.session-token',
      domain: getDomain(),
      description: "Stores the user's authentication session information.",
      expiry: '30 days',
      type: 'HTTP Cookie',
    },
    {
      name: 'CookieConsent',
      domain: getDomain(),
      description: "Stores the user's cookie consent state for the current domain",
      expiry: '1 year',
      type: 'HTTP Cookie',
    },
    {
      name: '__hssrc',
      domain: getDomain(),
      description: "Used to recognize the visitor's browser upon reentry on the website.",
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: '__Host-next-auth.csrf-token',
      domain: getDomain(),
      description:
        'Ensures visitor browsing-security by preventing cross-site request forgery. This cookie is essential for the security of the website and visitor.',
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: '__Secure-next-auth.callback-url',
      domain: getDomain(),
      description: "Used in order to detect spam and improve the website's security.",
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: 'test_cookie',
      domain: 'doubleclick.net',
      description: "Used to check if the user's browser supports cookies.",
      expiry: '1 day',
      type: 'HTTP Cookie',
    },
    {
      name: '__cf_bm',
      domain: 'Multiple domains',
      description:
        'Used by Cloudflare to manage server load, deliver website content and serve DNS connection.',
      expiry: '1 day',
      type: 'HTTP Cookie',
    },
    {
      name: '_cfuvid',
      domain: 'hubspot.com',
      description:
        'Part of Cloudflare services including load-balancing and website content delivery.',
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
  ],
  preferences: [
    {
      name: 'messagesUtk',
      domain: getDomain(),
      description:
        'Stores a unique ID string for each chat-box session. This allows the website-support to see previous issues and reconnect with the previous supporter.',
      expiry: '180 days',
      type: 'HTTP Cookie',
    },
    {
      name: 'hs-messages-hide-welcome-message',
      domain: getDomain(),
      description: 'Stores user preference for hiding the welcome message in chat.',
      expiry: '1 day',
      type: 'HTTP Cookie',
    },
  ],
  statistics: [
    {
      name: '__hssc',
      domain: getDomain(),
      description: "Identifies if the cookie data needs to be updated in the visitor's browser.",
      expiry: '1 day',
      type: 'HTTP Cookie',
    },
    {
      name: '__hssrc',
      domain: getDomain(),
      description: "Used to recognise the visitor's browser upon reentry on the website.",
      expiry: 'Session',
      type: 'HTTP Cookie',
    },
    {
      name: '__hstc',
      domain: getDomain(),
      description:
        'Sets a unique ID for the session. This allows the website to obtain data on visitor behaviour for statistical purposes.',
      expiry: '180 days',
      type: 'HTTP Cookie',
    },
    {
      name: 'hubspotutk',
      domain: getDomain(),
      description:
        'Sets a unique ID for the session. This allows the website to obtain data on visitor behaviour for statistical purposes.',
      expiry: '180 days',
      type: 'HTTP Cookie',
    },
    {
      name: 'sentryReplaySession',
      domain: getDomain(),
      description:
        "Registers data on visitors' website-behaviour. This is used for internal analysis and website optimization.",
      expiry: 'Session',
      type: 'HTML Local Storage',
    },
  ],
  advertising: [
    {
      name: '_ga',
      domain: getDomain(),
      description:
        "Used to send data to Google Analytics about the visitor's device and behavior. Tracks the visitor across devices and marketing channels.",
      expiry: '2 years',
      type: 'HTTP Cookie',
    },
    {
      name: '_ga_*',
      pattern: true,
      domain: getDomain(),
      description:
        "Used to send data to Google Analytics about the visitor's device and behavior with a unique identifier. Tracks the visitor across devices and marketing channels.",
      expiry: '2 years',
      type: 'HTTP Cookie',
    },
    {
      name: '__ptq.gif',
      domain: 'hubspot.com',
      description:
        "Sends data to the marketing platform Hubspot about the visitor's device and behaviour. Tracks the visitor across devices and marketing channels.",
      expiry: 'Session',
      type: 'Pixel Tracker',
    },
  ],
}

const privacyPolicies = [
  { domain: 'doubleclick.net', provider: 'Google', url: 'https://business.safety.google/privacy/' },
  {
    domain: 'hs-analytics.net',
    provider: 'Hubspot',
    url: 'https://legal.hubspot.com/privacy-policy',
  },
  { domain: 'hubspot.com', provider: 'Hubspot', url: 'https://legal.hubspot.com/privacy-policy' },
  {
    domain: 'js.hs-analytics.net',
    provider: 'Hubspot',
    url: 'https://legal.hubspot.com/privacy-policy',
  },
  {
    domain: 'js.usemessages.com',
    provider: 'Hubspot',
    url: 'https://legal.hubspot.com/privacy-policy',
  },
  {
    domain: 'www.googletagmanager.com',
    provider: 'Google',
    url: 'https://business.safety.google/privacy/',
  },
]

// Define cookie categories and their descriptions
const cookieCategories = {
  necessary: {
    title: 'Necessary',
    description:
      'These cookies are required for the website to function properly and cannot be disabled.',
    cookies: [
      {
        name: 'cookie_preferences',
        domain: 'current',
        description: 'Stores your cookie consent preferences',
        expiry: '1 year',
        type: 'necessary',
      },
      {
        name: 'next-auth.session-token',
        domain: 'current',
        description: 'Authentication session token',
        expiry: 'Session',
        type: 'necessary',
      },
    ],
  },
  analytics: {
    title: 'Analytics',
    description:
      'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
    cookies: [
      {
        name: '_ga',
        domain: '.dotabod.com',
        description: 'Google Analytics cookie used to distinguish users',
        expiry: '2 years',
        type: 'analytics',
      },
      {
        name: '_ga_*',
        domain: '.dotabod.com',
        description: 'Google Analytics cookie used to persist session state',
        expiry: '2 years',
        type: 'analytics',
        pattern: true,
      },
    ],
  },
  marketing: {
    title: 'Marketing',
    description:
      'These cookies are used to track visitors across websites to display relevant advertisements.',
    cookies: [
      {
        name: 'hubspotutk',
        domain: '.dotabod.com',
        description: 'HubSpot cookie used to track visitors across HubSpot sites',
        expiry: '13 months',
        type: 'marketing',
      },
      {
        name: '__hssc',
        domain: '.dotabod.com',
        description: 'HubSpot cookie for session tracking',
        expiry: '30 minutes',
        type: 'marketing',
      },
      {
        name: '__hssrc',
        domain: '.dotabod.com',
        description: 'HubSpot cookie to determine if the user has restarted their browser',
        expiry: 'Session',
        type: 'marketing',
      },
      {
        name: '__hstc',
        domain: '.dotabod.com',
        description: 'HubSpot main cookie for tracking visitors',
        expiry: '13 months',
        type: 'marketing',
      },
    ],
  },
  preferences: {
    title: 'Preferences',
    description: 'These cookies enable personalized features and functionality on our website.',
    cookies: [
      {
        name: 'theme',
        domain: 'current',
        description: 'Stores your theme preference (light/dark)',
        expiry: '1 year',
        type: 'preferences',
      },
    ],
  },
}

// Export the cookie categories for use in other components
export const getCookieCategories = () => cookieCategories

const CookieConsent = () => {
  const [visible, setVisible] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { preferences, updatePreferences, loaded, hasConsented } = useCookiePreferences()

  useEffect(() => {
    // Show banner if user hasn't explicitly consented yet
    if (loaded) {
      setVisible(!hasConsented)
    }
  }, [loaded, hasConsented])

  // Listen for global events
  useEffect(() => {
    const handleShowBanner = () => {
      setVisible(true)
      setShowSettings(false)
    }

    const handleShowSettings = () => {
      setShowSettings(true)
    }

    // Add event listeners
    window.addEventListener(COOKIE_EVENTS.SHOW_BANNER, handleShowBanner)
    window.addEventListener(COOKIE_EVENTS.SHOW_SETTINGS, handleShowSettings)

    // Clean up
    return () => {
      window.removeEventListener(COOKIE_EVENTS.SHOW_BANNER, handleShowBanner)
      window.removeEventListener(COOKIE_EVENTS.SHOW_SETTINGS, handleShowSettings)
    }
  }, [])

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
      preferences: true,
    }
    updatePreferences(allAccepted)
    setVisible(false)
    setShowSettings(false)
  }

  const handleSavePreferences = () => {
    updatePreferences(preferences)
    setVisible(false)
    setShowSettings(false)
  }

  const handleRejectAll = () => {
    const allRejected = {
      necessary: true, // Necessary cookies are always accepted
      analytics: false,
      marketing: false,
      preferences: false,
    }
    updatePreferences(allRejected)
    setVisible(false)
    setShowSettings(false)
  }

  const handlePreferenceChange = (key: keyof CookiePreferences) => (e: CheckboxChangeEvent) => {
    if (key === 'necessary') return // Cannot change necessary cookies
    updatePreferences({ ...preferences, [key]: e.target.checked })
  }

  const handleManagePreferences = () => {
    setShowSettings(true)
  }

  // Table columns for cookie details
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Expiry',
      dataIndex: 'expiry',
      key: 'expiry',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
    },
  ]

  return (
    <>
      {visible && (
        <Alert
          message='Cookie Consent Required'
          description={
            <div>
              <Paragraph>
                <strong>Your privacy matters to us.</strong> This website uses cookies to enhance
                your browsing experience. We only use strictly necessary cookies by default, which
                are essential for the website to function properly. For analytics, marketing, and
                preference cookies, we need your explicit consent. No non-essential cookies are set
                until you provide consent. For more information, please read our{' '}
                <Link href='/cookies'>Cookie Policy</Link>.
              </Paragraph>
              <Space style={{ width: '100%' }}>
                <Button type='primary' onClick={handleAcceptAll}>
                  Accept All Cookies
                </Button>
                <Button onClick={handleRejectAll}>Reject Non-Essential Cookies</Button>
                <Button type='link' onClick={handleManagePreferences}>
                  Customize Cookie Preferences
                </Button>
              </Space>
            </div>
          }
          showIcon
          banner
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
            margin: 0,
            padding: '16px 24px',
            borderRadius: 0,
            borderTop: '1px solid #d9d9d9',
          }}
          closable={false}
        />
      )}

      <Drawer
        title='Cookie Preferences'
        placement='bottom'
        onClose={() => setShowSettings(false)}
        open={showSettings}
        height={600}
        extra={
          <Space>
            <Button onClick={handleRejectAll}>Reject All</Button>
            <Button onClick={handleAcceptAll}>Accept All</Button>
            <Button type='primary' onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </Space>
        }
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Title level={4}>Manage Cookie Preferences</Title>
          <Paragraph>
            Cookies are small data files that are placed on your computer or mobile device when you
            visit a website. Cookies are widely used by website owners to make their websites work,
            or to work more efficiently, as well as to provide reporting information.
          </Paragraph>
          <Paragraph>
            <Link href='/cookies'>Read our full Cookie Policy</Link>
          </Paragraph>

          <Divider />

          {/* Cookie categories */}
          <div>
            {Object.entries(cookieCategories).map(([key, category]) => (
              <div key={key} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <Checkbox
                    checked={preferences[key as keyof CookiePreferences]}
                    onChange={handlePreferenceChange(key as keyof CookiePreferences)}
                    disabled={key === 'necessary'} // Necessary cookies can't be disabled
                  />
                  <Title level={5} style={{ margin: '0 0 0 8px' }}>
                    {category.title} Cookies
                  </Title>
                </div>
                <Paragraph style={{ marginLeft: '24px' }}>{category.description}</Paragraph>

                {/* Cookie details collapsible panel */}
                <Collapse
                  style={{ marginLeft: '24px', marginBottom: '16px' }}
                  items={[
                    {
                      key: `${key}-cookies`,
                      label: `View ${category.cookies.length} cookie${category.cookies.length !== 1 ? 's' : ''}`,
                      children: (
                        <Table
                          dataSource={category.cookies}
                          columns={[
                            {
                              title: 'Name',
                              dataIndex: 'name',
                              key: 'name',
                              render: (text, record) => (
                                <span>
                                  {text} {record.pattern && <Tag color='blue'>Pattern</Tag>}
                                </span>
                              ),
                            },
                            {
                              title: 'Domain',
                              dataIndex: 'domain',
                              key: 'domain',
                              render: (text) => (text === 'current' ? 'This website' : text),
                            },
                            {
                              title: 'Description',
                              dataIndex: 'description',
                              key: 'description',
                            },
                            {
                              title: 'Expiry',
                              dataIndex: 'expiry',
                              key: 'expiry',
                            },
                          ]}
                          pagination={false}
                          size='small'
                        />
                      ),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      </Drawer>
    </>
  )
}

export default CookieConsent
