import { Button, Checkbox, Collapse, Divider, Drawer, Space, Table, Tag, Typography } from 'antd'
import type { CheckboxChangeEvent } from 'antd/es/checkbox'
import { Cookie } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { COOKIE_EVENTS, type CookiePreferences, useCookiePreferences } from '@/lib/cookieManager'

const { Title, Paragraph } = Typography

// Define window with our custom properties
declare global {
  interface Window {
    _ga_enabled?: boolean
    _hubspot_enabled?: boolean
    gtag?: (command: string, ...args: unknown[]) => void
    HubSpotConsentConfig?: {
      setTrackingCookiesAllowed: (allowed: boolean) => void
    }
  }
}

// Define cookie categories and their descriptions
const cookieCategories = {
  analytics: {
    cookies: [
      {
        description: 'Google Analytics cookie used to distinguish users',
        domain: '.dotabod.com',
        expiry: '2 years',
        name: '_ga',
        type: 'analytics',
      },
      {
        description: 'Google Analytics cookie used to persist session state',
        domain: '.dotabod.com',
        expiry: '2 years',
        name: '_ga_*',
        pattern: true,
        type: 'analytics',
      },
    ],
    description:
      'These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.',
    title: 'Analytics',
  },
  marketing: {
    cookies: [
      {
        description: 'HubSpot cookie used to track visitors across HubSpot sites',
        domain: '.dotabod.com',
        expiry: '13 months',
        name: 'hubspotutk',
        type: 'marketing',
      },
      {
        description: 'HubSpot cookie for session tracking',
        domain: '.dotabod.com',
        expiry: '30 minutes',
        name: '__hssc',
        type: 'marketing',
      },
      {
        description: 'HubSpot cookie to determine if the user has restarted their browser',
        domain: '.dotabod.com',
        expiry: 'Session',
        name: '__hssrc',
        type: 'marketing',
      },
      {
        description: 'HubSpot main cookie for tracking visitors',
        domain: '.dotabod.com',
        expiry: '13 months',
        name: '__hstc',
        type: 'marketing',
      },
    ],
    description:
      'These cookies are used to track visitors across websites to display relevant advertisements.',
    title: 'Marketing',
  },
  necessary: {
    cookies: [
      {
        description: 'Stores your cookie consent preferences',
        domain: 'current',
        expiry: '1 year',
        name: 'cookie_preferences',
        type: 'necessary',
      },
      {
        description: 'Authentication session token',
        domain: 'current',
        expiry: 'Session',
        name: 'next-auth.session-token',
        type: 'necessary',
      },
    ],
    description:
      'These cookies are required for the website to function properly and cannot be disabled.',
    title: 'Necessary',
  },
  preferences: {
    cookies: [
      {
        description: 'Stores your theme preference (light/dark)',
        domain: 'current',
        expiry: '1 year',
        name: 'theme',
        type: 'preferences',
      },
    ],
    description: 'These cookies enable personalized features and functionality on our website.',
    title: 'Preferences',
  },
}

// Export the cookie categories for use in other components
export const getCookieCategories = () => cookieCategories

const CookieConsent = () => {
  const [forceShow, setForceShow] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const { preferences, updatePreferences, loaded, hasConsented } = useCookiePreferences()
  const visible = forceShow || (loaded && !hasConsented)

  // Listen for global events
  useEffect(() => {
    const handleShowBanner = () => {
      setForceShow(true)
      setShowSettings(false)
    }

    const handleShowSettings = () => {
      setShowSettings(true)
    }

    window.addEventListener(COOKIE_EVENTS.SHOW_BANNER, handleShowBanner)
    window.addEventListener(COOKIE_EVENTS.SHOW_SETTINGS, handleShowSettings)

    return () => {
      window.removeEventListener(COOKIE_EVENTS.SHOW_BANNER, handleShowBanner)
      window.removeEventListener(COOKIE_EVENTS.SHOW_SETTINGS, handleShowSettings)
    }
  }, [])

  const handleAcceptAll = () => {
    const allAccepted = {
      analytics: true,
      marketing: true,
      necessary: true,
      preferences: true,
    }
    updatePreferences(allAccepted)
    setForceShow(false)
    setShowSettings(false)
  }

  const handleSavePreferences = () => {
    updatePreferences(preferences)
    setForceShow(false)
    setShowSettings(false)
  }

  const handleRejectAll = () => {
    const allRejected = {
      analytics: false,
      marketing: false,
      necessary: true, // Necessary cookies are always accepted
      preferences: false,
    }
    updatePreferences(allRejected)
    setForceShow(false)
    setShowSettings(false)
  }

  const handlePreferenceChange = (key: keyof CookiePreferences) => (e: CheckboxChangeEvent) => {
    if (key === 'necessary') {
      return
    } // Cannot change necessary cookies
    updatePreferences({ ...preferences, [key]: e.target.checked })
  }

  const handleManagePreferences = () => {
    setShowSettings(true)
  }

  // Table columns for cookie details

  return (
    <>
      {visible && !showSettings && (
        <div
          role='region'
          aria-label='Cookie consent'
          className='animate-fade-in fixed bottom-4 left-4 z-[1001] w-[min(420px,calc(100vw-2rem))] rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-xl'
        >
          <div className='flex items-start gap-2.5'>
            <Cookie aria-hidden className='mt-0.5 h-4 w-4 shrink-0 text-gray-400' />
            <div className='min-w-0'>
              <p className='text-sm font-medium text-gray-100'>Cookie preferences</p>
              <p className='mt-1 text-sm leading-snug text-gray-300'>
                We use necessary cookies to run the site, and optional analytics and marketing
                cookies if you allow them. See our{' '}
                <Link
                  href='/cookies'
                  className='text-purple-300 underline underline-offset-2 hover:text-purple-200'
                >
                  Cookie Policy
                </Link>
                .
              </p>
            </div>
          </div>
          <div className='mt-3 flex flex-wrap gap-2'>
            <Button size='small' type='primary' onClick={handleAcceptAll}>
              Accept all
            </Button>
            <Button size='small' onClick={handleRejectAll}>
              Reject non-essential
            </Button>
            <Button size='small' type='text' onClick={handleManagePreferences}>
              Customize
            </Button>
          </div>
        </div>
      )}

      <Drawer
        title='Cookie Preferences'
        placement='bottom'
        onClose={() => setShowSettings(false)}
        open={showSettings}
        height={600}
        width='100%'
        style={{ maxWidth: '100%' }}
        styles={{
          body: {
            paddingTop: '20px',
          },
          header: {
            flexWrap: 'wrap',
            gap: '20px',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          },
        }}
        extra={
          <Space wrap>
            <Button onClick={handleRejectAll}>Reject All</Button>
            <Button onClick={handleAcceptAll}>Accept All</Button>
            <Button type='primary' onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </Space>
        }
      >
        <div style={{ margin: '0 auto', maxWidth: '1000px' }}>
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
                <div style={{ alignItems: 'center', display: 'flex', marginBottom: '8px' }}>
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
                  style={{ marginBottom: '16px', marginLeft: '24px' }}
                  items={[
                    {
                      children: (
                        <Table
                          dataSource={category.cookies}
                          columns={[
                            {
                              dataIndex: 'name',
                              key: 'name',
                              render: (text, record) => (
                                <span>
                                  {text}{' '}
                                  {'pattern' in record && record.pattern && (
                                    <Tag color='blue'>Pattern</Tag>
                                  )}
                                </span>
                              ),
                              title: 'Name',
                            },
                            {
                              dataIndex: 'domain',
                              key: 'domain',
                              render: (text) => (text === 'current' ? 'This website' : text),
                              title: 'Domain',
                            },
                            {
                              dataIndex: 'description',
                              key: 'description',
                              title: 'Description',
                            },
                            {
                              dataIndex: 'expiry',
                              key: 'expiry',
                              title: 'Expiry',
                            },
                          ]}
                          pagination={false}
                          size='small'
                        />
                      ),
                      key: `${key}-cookies`,
                      label: `View ${category.cookies.length} cookie${category.cookies.length !== 1 ? 's' : ''}`,
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
