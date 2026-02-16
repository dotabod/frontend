import { Button, Collapse, Space, Table, Tag } from 'antd'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { getCookieCategories } from '@/components/CookieConsent'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { showCookieConsentBanner, showCookieConsentSettings } from '@/lib/cookieManager'
import type { NextPageWithLayout } from '@/pages/_app'

const { Panel } = Collapse

// Simple component to manage cookie preferences via the banner
const ManageCookiePreferences = () => {
  const [isClient, setIsClient] = useState(false)

  // Handle hydration issues
  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return null

  return (
    <div className='border border-gray-200 rounded-lg p-6 my-6 text-center'>
      <h3 className='text-xl font-semibold mb-4'>Manage Your Cookie Preferences</h3>
      <p className='text-sm mb-6'>
        You can adjust your cookie preferences at any time. Click the button below to open the
        cookie settings panel.
      </p>

      <Space direction='horizontal'>
        <Button type='primary' onClick={showCookieConsentSettings}>
          Open Cookie Settings
        </Button>
        <Button onClick={showCookieConsentBanner}>Show Consent Banner</Button>
      </Space>
    </div>
  )
}

const CookiePolicy = ({ companyName = 'Dotabod', websiteUrl = 'https://dotabod.com' }) => {
  // Get cookie categories from the shared function
  const cookieCategories = getCookieCategories()

  // Flatten all cookies into a single array for the table view
  const allCookies = Object.values(cookieCategories).flatMap((category) =>
    category.cookies.map((cookie) => ({
      ...cookie,
      category: category.title,
    })),
  )

  return (
    <div className='max-w-4xl mx-auto p-6 font-sans'>
      {/* Title */}
      <h1 className='text-3xl font-bold mb-2'>COOKIE POLICY</h1>
      <p className='text-sm text-gray-500 mb-6'>Last updated: {new Date().toLocaleDateString()}</p>

      {/* Introduction */}
      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>Introduction</h2>
        <p className='mb-4'>
          {companyName} ("we", "our", or "us") uses cookies on our website ({websiteUrl}) (the
          "Service"). By using the Service, you consent to the use of cookies.
        </p>
        <p className='mb-4'>
          Our Cookie Policy explains what cookies are, how we use cookies, how third parties we may
          partner with may use cookies on the Service, your choices regarding cookies, and further
          information about cookies.
        </p>
      </div>

      {/* What are cookies */}
      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>What are Cookies</h2>
        <p className='mb-4'>
          Cookies are small pieces of text sent to your web browser by a website you visit. A cookie
          file is stored in your web browser and allows the Service or a third party to recognize
          you and make your next visit easier and the Service more useful to you.
        </p>
        <p className='mb-4'>
          Cookies can be "persistent" or "session" cookies. Persistent cookies remain on your
          personal computer or mobile device when you go offline, while session cookies are deleted
          as soon as you close your web browser.
        </p>
      </div>

      {/* Manage Cookie Preferences */}
      <ManageCookiePreferences />

      {/* How we use cookies */}
      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>How {companyName} Uses Cookies</h2>
        <p className='mb-4'>
          When you use and access the Service, we may place a number of cookie files in your web
          browser.
        </p>
        <p className='mb-4'>We use cookies for the following purposes:</p>
        <ul className='list-disc pl-8 mb-4'>
          <li>To enable certain functions of the Service</li>
          <li>To provide analytics</li>
          <li>To store your preferences</li>
          <li>To enable advertisements delivery, including behavioral advertising</li>
        </ul>
        <p className='mb-4'>
          We use both session and persistent cookies on the Service and we use different types of
          cookies to run the Service.
        </p>
      </div>

      {/* Cookie Categories */}
      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>Cookie Categories</h2>

        <Collapse className='mb-6'>
          {Object.entries(cookieCategories).map(([key, category]) => (
            <Panel header={`${category.title} Cookies - ${category.description}`} key={key}>
              <Table
                dataSource={category.cookies}
                columns={[
                  {
                    title: 'Name',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text, record) => (
                      <span>
                        {text}{' '}
                        {'pattern' in record && record.pattern && <Tag color='blue'>Pattern</Tag>}
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
            </Panel>
          ))}
        </Collapse>
      </div>

      {/* All Cookies Table */}
      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>Complete List of Cookies</h2>
        <Table
          dataSource={allCookies}
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
              title: 'Category',
              dataIndex: 'category',
              key: 'category',
              filters: Array.from(new Set(allCookies.map((c) => c.category))).map((cat) => ({
                text: cat,
                value: cat,
              })),
              onFilter: (value, record) => record.category === value,
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
          pagination={{ pageSize: 10 }}
        />
      </div>

      {/* Rest of the policy content */}
      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>Third-party Cookies</h2>
        <p className='mb-4'>
          In addition to our own cookies, we may also use various third-party cookies to report
          usage statistics of the Service, deliver advertisements on and through the Service, and so
          on.
        </p>
      </div>

      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>What are Your Choices Regarding Cookies</h2>
        <p className='mb-4'>
          If you'd like to delete cookies or instruct your web browser to delete or refuse cookies,
          please visit the help pages of your web browser.
        </p>
        <p className='mb-4'>
          Please note, however, that if you delete cookies or refuse to accept them, you might not
          be able to use all of the features we offer, you may not be able to store your
          preferences, and some of our pages might not display properly.
        </p>
      </div>

      <div className='mb-8'>
        <h2 className='text-2xl font-semibold mb-4'>
          Where Can You Find More Information About Cookies
        </h2>
        <p className='mb-4'>
          You can learn more about cookies at the following third-party websites:
        </p>
        <ul className='list-disc pl-8 mb-4'>
          <li>
            <a
              href='https://www.allaboutcookies.org/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline'
            >
              AllAboutCookies
            </a>
          </li>
          <li>
            <a
              href='https://www.networkadvertising.org/'
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:underline'
            >
              Network Advertising Initiative
            </a>
          </li>
        </ul>
      </div>

      {/* Manage Cookie Preferences (again at the bottom) */}
      <ManageCookiePreferences />
    </div>
  )
}

const CookiePolicyPage: NextPageWithLayout = () => {
  return <CookiePolicy />
}

CookiePolicyPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
      ogImage={{
        title: 'Cookie Policy',
        subtitle:
          'Learn about how Dotabod uses cookies and other tracking technologies to enhance your experience on our website.',
      }}
      seo={{
        title: 'Cookie Policy | Dotabod',
        description:
          'Learn about how Dotabod uses cookies and other tracking technologies to enhance your experience on our website.',
        canonicalUrl: 'https://dotabod.com/cookies',
      }}
    >
      {page}
    </HomepageShell>
  )
}

export default CookiePolicyPage
