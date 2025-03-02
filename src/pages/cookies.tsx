import { Container } from '@/components/Container'
import HomepageShell from '@/components/Homepage/HomepageShell'
import { showCookieConsentBanner, showCookieConsentSettings } from '@/lib/cookieManager'
import type { NextPageWithLayout } from '@/pages/_app'
import { Button, Space } from 'antd'
import Link from 'next/link'
import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'

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
        <Button type='primary' size='large' onClick={showCookieConsentSettings}>
          Open Cookie Settings
        </Button>
        <Button size='large' onClick={showCookieConsentBanner}>
          Show Consent Banner
        </Button>
      </Space>
    </div>
  )
}

const CookiePolicy = ({ companyName = 'Dotabod', websiteUrl = 'https://dotabod.com' }) => (
  <div className='max-w-4xl mx-auto p-6 font-sans'>
    {/* Title */}
    <h1 className='text-3xl font-bold  mb-2'>COOKIE POLICY</h1>
    <p className='text-sm  mb-6'>Last updated February 23, 2025</p>

    {/* Introduction */}
    <section className='mb-6'>
      <p className=' text-sm leading-relaxed'>
        This Cookie Policy explains how {companyName} ("Company", "we", "us", and "our") uses
        cookies and similar technologies to recognize you when you visit our website at{' '}
        <a
          href={websiteUrl}
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-600 hover:underline'
        >
          {websiteUrl}
        </a>{' '}
        ("Website"). It explains what these technologies are and why we use them, as well as your
        rights to control our use of them.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        In some cases, we may use cookies to collect personal information, or that becomes personal
        information if we combine it with other information.
      </p>
    </section>

    {/* Direct Cookie Management */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold mb-2'>Manage Your Cookie Preferences</h2>
      <p className='text-sm leading-relaxed'>
        You can adjust your cookie preferences directly below. Changes will take effect immediately.
      </p>
      <ManageCookiePreferences />
    </section>

    {/* What are cookies? */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>What are cookies?</h2>
      <p className=' text-sm leading-relaxed'>
        Cookies are small data files that are placed on your computer or mobile device when you
        visit a website. Cookies are widely used by website owners to make their websites work, or
        to work more efficiently, as well as to provide reporting information.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        Cookies set by the website owner (in this case, {companyName}) are called "first-party
        cookies." Cookies set by parties other than the website owner are called "third-party
        cookies." Third-party cookies enable third-party features or functionality to be provided on
        or through the website (e.g., advertising, interactive content, and analytics).
      </p>
    </section>

    {/* Why do we use cookies? */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>Why do we use cookies?</h2>
      <p className=' text-sm leading-relaxed'>
        We use first- and third-party cookies for several reasons. Some cookies are required for
        technical reasons for our Website to operate, and we refer to these as "essential" or
        "strictly necessary" cookies. Other cookies enable us to track and target the interests of
        our users to enhance the experience on our Online Properties. Third parties serve cookies
        through our Website for advertising, analytics, and other purposes.
      </p>
    </section>

    {/* How can I control cookies? */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>How can I control cookies?</h2>
      <p className=' text-sm leading-relaxed'>
        You have the right to decide whether to accept or reject cookies. You can exercise your
        cookie rights by setting your preferences in the Cookie Consent Manager. Essential cookies
        cannot be rejected as they are strictly necessary to provide you with services.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        The Cookie Consent Manager can be found in the notification banner and on our Website. If
        you choose to reject cookies, you may still use our Website though your access to some
        functionality may be restricted. You may also set or amend your web browser controls to
        accept or refuse cookies.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        The specific types of first- and third-party cookies served through our Website and the
        purposes they perform are described in the table below (please note that the specific
        cookies served may vary depending on the specific Online Properties you visit):
      </p>
    </section>

    {/* Analytics and Customization Cookies */}
    <section className='mb-6'>
      <h3 className='text-lg font-semibold  mb-2 underline'>
        Analytics and customization cookies:
      </h3>
      <p className=' text-sm leading-relaxed mb-4'>
        These cookies collect information that is used either in aggregate form to help us
        understand how our Website is being used or how effective our marketing campaigns are, or to
        help us customize our Website for you.
      </p>

      <div className='border border-gray-200 rounded-md mb-4 p-4'>
        <table className='w-full text-sm'>
          <tbody>
            <tr>
              <td className='text-right font-medium  pr-2 py-1 w-24'>Name:</td>
              <td className=''>_ga_#</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Purpose:</td>
              <td className=''>
                Used to distinguish individual users by means of designation of a randomly generated
                number as client identifier, which allows calculation of visits and sessions
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Provider:</td>
              <td className=''>.dotabod.com</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Service:</td>
              <td className=''>
                Google Analytics{' '}
                <a
                  href='https://business.safety.google/privacy/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:underline'
                >
                  View Service Privacy Policy
                </a>
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Type:</td>
              <td className=''>http_cookie</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Expires in:</td>
              <td className=''>1 year 1 month 4 days</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className='border border-gray-200 rounded-md mb-4 p-4'>
        <table className='w-full text-sm'>
          <tbody>
            <tr>
              <td className='text-right font-medium  pr-2 py-1 w-24'>Name:</td>
              <td className=''>s7</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Purpose:</td>
              <td className=''>
                Gather data regarding site usage and user behavior on the website.
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Provider:</td>
              <td className=''>dotabod.com</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Service:</td>
              <td className=''>Adobe Analytics</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Type:</td>
              <td className=''>html_session_storage</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Expires in:</td>
              <td className=''>session</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className='border border-gray-200 rounded-md mb-4 p-4'>
        <table className='w-full text-sm'>
          <tbody>
            <tr>
              <td className='text-right font-medium  pr-2 py-1 w-24'>Name:</td>
              <td className=''>_ga</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Purpose:</td>
              <td className=''>
                Records a particular ID used to come up with data about website usage by the user
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Provider:</td>
              <td className=''>.dotabod.com</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Service:</td>
              <td className=''>
                Google Analytics{' '}
                <a
                  href='https://business.safety.google/privacy/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:underline'
                >
                  View Service Privacy Policy
                </a>
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Type:</td>
              <td className=''>http_cookie</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Expires in:</td>
              <td className=''>1 year 1 month 4 days</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    {/* Advertising Cookies */}
    <section className='mb-6'>
      <h3 className='text-lg font-semibold  mb-2 underline'>Advertising cookies:</h3>
      <p className=' text-sm leading-relaxed mb-4'>
        These cookies are used to make advertising messages more relevant to you. They perform
        functions like preventing the same ad from continuously reappearing, ensuring that ads are
        properly displayed for advertisers, and in some cases selecting advertisements that are
        based on your interests.
      </p>

      <div className='border border-gray-200 rounded-md mb-4 p-4'>
        <table className='w-full text-sm'>
          <tbody>
            <tr>
              <td className='text-right font-medium  pr-2 py-1 w-24'>Name:</td>
              <td className=''>test_cookie</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Purpose:</td>
              <td className=''>
                A session cookie used to check if the user's browser supports cookies.
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Provider:</td>
              <td className=''>.doubleclick.net</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Service:</td>
              <td className=''>
                DoubleClick{' '}
                <a
                  href='https://business.safety.google/privacy/'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:underline'
                >
                  View Service Privacy Policy
                </a>
              </td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Type:</td>
              <td className=''>server_cookie</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Expires in:</td>
              <td className=''>15 minutes</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    {/* Unclassified Cookies */}
    <section className='mb-6'>
      <h3 className='text-lg font-semibold  mb-2 underline'>Unclassified cookies:</h3>
      <p className=' text-sm leading-relaxed mb-4'>
        These are cookies that have not yet been categorized. We are in the process of classifying
        these cookies with the help of their providers.
      </p>

      <div className='border border-gray-200 rounded-md mb-4 p-4'>
        <table className='w-full text-sm'>
          <tbody>
            <tr>
              <td className='text-right font-medium  pr-2 py-1 w-24'>Name:</td>
              <td className=''>__Secure-next-auth.callback-url</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Provider:</td>
              <td className=''>dotabod.com</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Type:</td>
              <td className=''>server_cookie</td>
            </tr>
            <tr>
              <td className='text-right font-medium  pr-2 py-1'>Expires in:</td>
              <td className=''>session</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    {/* How can I control cookies on my browser? */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>How can I control cookies on my browser?</h2>
      <p className=' text-sm leading-relaxed'>
        As the means by which you can refuse cookies through your web browser controls vary from
        browser to browser, you should visit your browser's help menu for more information. Here are
        links for the most popular browsers:
      </p>
      <ul className='list-disc pl-6 mt-2 text-sm text-blue-600'>
        <li>
          <a
            href='https://support.google.com/chrome/answer/95647#zippy=%2Callow-or-block-cookies'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Chrome
          </a>
        </li>
        <li>
          <a
            href='https://support.microsoft.com/en-us/windows/delete-and-manage-cookies-168dab11-0753-043d-7c16-ede5947fc64d'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Internet Explorer
          </a>
        </li>
        <li>
          <a
            href='https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Firefox
          </a>
        </li>
        <li>
          <a
            href='https://support.apple.com/en-ie/guide/safari/sfri11471/mac'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Safari
          </a>
        </li>
        <li>
          <a
            href='https://support.microsoft.com/en-us/windows/microsoft-edge-browsing-data-and-privacy-bb8174ba-9d73-dcf2-9b4a-c582b4e640dd'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Edge
          </a>
        </li>
        <li>
          <a
            href='https://help.opera.com/en/latest/web-preferences/'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Opera
          </a>
        </li>
      </ul>
      <p className=' text-sm leading-relaxed mt-4'>
        In addition, most advertising networks offer you a way to opt out of targeted advertising.
        If you would like to find out more information, please visit:
      </p>
      <ul className='list-disc pl-6 mt-2 text-sm text-blue-600'>
        <li>
          <a
            href='http://www.aboutads.info/choices/'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Digital Advertising Alliance
          </a>
        </li>
        <li>
          <a
            href='https://youradchoices.ca/'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            Digital Advertising Alliance of Canada
          </a>
        </li>
        <li>
          <a
            href='http://www.youronlinechoices.com/'
            target='_blank'
            rel='noopener noreferrer'
            className='hover:underline'
          >
            European Interactive Digital Advertising Alliance
          </a>
        </li>
      </ul>
    </section>

    {/* What about other tracking technologies? */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>
        What about other tracking technologies, like web beacons?
      </h2>
      <p className=' text-sm leading-relaxed'>
        Cookies are not the only way to recognize or track visitors to a website. We may use other,
        similar technologies from time to time, like web beacons (sometimes called "tracking pixels"
        or "clear gifs"). These are tiny graphics files that contain a unique identifier that
        enables us to recognize when someone has visited our Website or opened an email including
        them. This allows us, for example, to monitor the traffic patterns of users from one page
        within a website to another, to deliver or communicate with cookies, to understand whether
        you have come to the website from an online advertisement displayed on a third-party
        website, to improve site performance, and to measure the success of email marketing
        campaigns. In many instances, these technologies are reliant on cookies to function
        properly, and so declining cookies will impair their functioning.
      </p>
    </section>

    {/* Flash Cookies */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>
        Do you use Flash cookies or Local Shared Objects?
      </h2>
      <p className=' text-sm leading-relaxed'>
        Websites may also use so-called "Flash Cookies" (also known as Local Shared Objects or
        "LSOs") to, among other things, collect and store information about your use of our
        services, fraud prevention, and for other site operations.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        If you do not want Flash Cookies stored on your computer, you can adjust the settings of
        your Flash player to block Flash Cookies storage using the tools contained in the{' '}
        <a
          href='http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager07.html'
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-600 hover:underline'
        >
          Website Storage Settings Panel
        </a>
        . You can also control Flash Cookies by going to the{' '}
        <a
          href='http://www.macromedia.com/support/documentation/en/flashplayer/help/settings_manager03.html'
          target='_blank'
          rel='noopener noreferrer'
          className='text-blue-600 hover:underline'
        >
          Global Storage Settings Panel
        </a>{' '}
        and following the instructions.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        Please note that setting the Flash Player to restrict or limit acceptance of Flash Cookies
        may reduce or impede the functionality of some Flash applications, including, potentially,
        Flash applications used in connection with our services or online content.
      </p>
    </section>

    {/* Targeted Advertising */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>Do you serve targeted advertising?</h2>
      <p className=' text-sm leading-relaxed'>
        Third parties may serve cookies on your computer or mobile device to serve advertising
        through our Website. These companies may use information about your visits to this and other
        websites in order to provide relevant advertisements about goods and services that you may
        be interested in. They may also employ technology that is used to measure the effectiveness
        of advertisements. The information collected through this process does not enable us or them
        to identify your name, contact details, or other details that directly identify you unless
        you choose to provide these.
      </p>
    </section>

    {/* Updates to Cookie Policy */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>How often will you update this Cookie Policy?</h2>
      <p className=' text-sm leading-relaxed'>
        We may update this Cookie Policy from time to time in order to reflect, for example, changes
        to the cookies we use or for other operational, legal, or regulatory reasons. Please
        therefore revisit this Cookie Policy regularly to stay informed about our use of cookies and
        related technologies.
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        The date at the top of this Cookie Policy indicates when it was last updated.
      </p>
    </section>

    {/* Managing Your Cookie Preferences */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold mb-2'>How can I manage my cookie preferences?</h2>
      <p className='text-sm leading-relaxed'>
        We respect your right to privacy and provide you with control over your cookie preferences.
        You can manage your cookie settings in several ways:
      </p>

      <h3 className='text-lg font-medium mt-4 mb-2'>On This Page</h3>
      <p className='text-sm leading-relaxed'>
        You can manage your cookie preferences directly on this page using the control panel above,
        which will open the same cookie settings interface you see when first visiting our site.
      </p>

      <h3 className='text-lg font-medium mt-4 mb-2'>Cookie Consent Banner</h3>
      <p className='text-sm leading-relaxed'>
        When you first visit our website, you'll see a cookie consent banner that allows you to:
      </p>
      <ul className='list-disc pl-8 text-sm leading-relaxed mt-2'>
        <li>Accept all cookies</li>
        <li>Reject non-essential cookies</li>
        <li>Customize your cookie preferences</li>
      </ul>

      <h3 className='text-lg font-medium mt-4 mb-2'>Dashboard Settings</h3>
      <p className='text-sm leading-relaxed'>
        If you have an account with us, you can also manage your cookie preferences through your
        account dashboard:
      </p>
      <ol className='list-decimal pl-8 text-sm leading-relaxed mt-2'>
        <li>Log in to your account</li>
        <li>
          Go to the{' '}
          <Link href='/dashboard/data' className='text-blue-600 hover:underline'>
            Data Management
          </Link>{' '}
          page
        </li>
        <li>Find the "Cookie Preferences" section</li>
      </ol>

      <h3 className='text-lg font-medium mt-4 mb-2'>Cookie Categories You Can Control</h3>
      <p className='text-sm leading-relaxed'>
        We group cookies into the following categories to make it easier for you to manage your
        preferences:
      </p>
      <ul className='pl-8 text-sm leading-relaxed mt-2'>
        <li>
          <strong>Necessary Cookies:</strong> These cookies are essential for the website to
          function properly and cannot be disabled.
        </li>
        <li>
          <strong>Analytics Cookies:</strong> These cookies help us understand how visitors interact
          with our website by collecting and reporting information anonymously.
        </li>
        <li>
          <strong>Marketing Cookies:</strong> These cookies are used for personalized ads and
          content. Note that our customer support chat will still work even if you disable marketing
          cookies.
        </li>
        <li>
          <strong>Preference Cookies:</strong> These cookies enable the website to remember
          information that changes the way the website behaves or looks.
        </li>
      </ul>

      <p className='text-sm leading-relaxed mt-4'>
        Your preferences will be saved and respected across all your visits to our website. You can
        change these preferences at any time.
      </p>
    </section>

    {/* Further Information */}
    <section className='mb-6'>
      <h2 className='text-xl font-semibold  mb-2'>Where can I get further information?</h2>
      <p className=' text-sm leading-relaxed'>
        If you have any questions about our use of cookies or other technologies, please contact us
        at:
      </p>
      <p className=' text-sm leading-relaxed mt-4'>
        <a href='mailto:privacy@dotabod.com'>privacy@dotabod.com</a>
      </p>
    </section>
  </div>
)
const CookiePolicyPage: NextPageWithLayout = () => {
  return (
    <Container className='py-24'>
      <CookiePolicy />
    </Container>
  )
}

CookiePolicyPage.getLayout = function getLayout(page: ReactElement) {
  return (
    <HomepageShell
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
