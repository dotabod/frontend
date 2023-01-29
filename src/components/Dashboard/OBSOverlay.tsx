import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import { Card } from '@/ui/card'
import { Badge, Display } from '@geist-ui/core'
import { Button, Center, CopyButton, Tabs } from '@mantine/core'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import {
  ChatBubbleBottomCenterTextIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/solid'

export default function OBSOverlay() {
  const user = useSession()?.data?.user
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)

  const CopyInstructions = () => (
    <div className="flex flex-col items-center space-x-4 md:flex-row">
      <CopyButton value={copyURL}>
        {({ copied, copy }) => (
          <Button
            variant="outline"
            color="green"
            className={clsx(
              copied && '!border-green-600 !bg-green-600',
              'border-blue-500 bg-blue-600 text-dark-200 transition-colors hover:bg-blue-500'
            )}
            onClick={copy}
          >
            {copied ? 'Copied to clipboard!' : 'Copy your browser source URL'}
          </Button>
        )}
      </CopyButton>
      <div className="mt-4 space-x-2 text-xs md:mt-0">
        <Badge type="error" className="!bg-red-800 !text-xs">
          Warning
        </Badge>
        <span>Do not share or show this URL on stream</span>
      </div>
    </div>
  )

  return (
    <Card>
      <div className="title command">
        <h3>Step three. Stream Overlay</h3>
      </div>
      <div className="subtitle">
        Add a new browser source to your streaming software.
      </div>
      <div className="space-y-4 px-8 pb-8 text-sm text-dark-300">
        <Tabs
          unstyled
          variant="pills"
          defaultValue="video"
          styles={(theme) => ({
            tab: {
              ...theme.fn.focusStyles(),
              backgroundColor:
                theme.colorScheme === 'dark'
                  ? theme.colors.dark[6]
                  : theme.white,
              color:
                theme.colorScheme === 'dark'
                  ? theme.colors.dark[0]
                  : theme.colors.gray[9],
              border: `1px solid ${
                theme.colorScheme === 'dark'
                  ? theme.colors.dark[6]
                  : theme.colors.gray[4]
              }`,
              borderRadius: theme.radius.sm,
              transitionProperty: 'all',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
              transitionDuration: '150ms',
              padding: `${theme.spacing.xs}px ${theme.spacing.xs}px`,
              cursor: 'pointer',
              fontSize: theme.fontSizes.sm,
              display: 'flex',
              alignItems: 'center',

              '&:hover': {
                backgroundColor: theme.colors.blue[5],
              },

              '&:disabled': {
                opacity: 0.5,
                cursor: 'not-allowed',
              },

              '&[data-active]': {
                backgroundColor: theme.colors.blue[6],
                borderColor: theme.colors.blue[6],
                color: theme.white,
              },

              '&:not([data-active])': {},
            },

            tabIcon: {
              marginRight: theme.spacing.xs,
              display: 'flex',
              alignItems: 'center',
            },

            tabsList: {
              display: 'flex',
            },
          })}
        >
          <Tabs.List className="mt-4 flex flex-col space-y-4 md:flex-row md:space-y-0 md:space-x-2">
            <Tabs.Tab value="video">
              <div className="flex items-center space-x-2">
                <VideoCameraIcon width={24} height={24} />
                <span>Video instructions</span>
              </div>
            </Tabs.Tab>
            <Tabs.Tab value="text">
              <div className="flex items-center space-x-2">
                <ChatBubbleBottomCenterTextIcon width={24} height={24} />
                <span>Text instructions</span>
              </div>
            </Tabs.Tab>
          </Tabs.List>
          <div className="mt-4 flex items-center space-x-2">
            <Badge className="!text-xs" type="secondary">
              Note
            </Badge>
            <span>OBS and Streamlabs have the same instructions</span>
          </div>
          <Tabs.Panel value="video" className="ml-6 mt-12">
            <Center className="flex flex-col space-y-4">
              <CopyInstructions />
              <p>
                Paste this into the URL field when making the browser source
              </p>
            </Center>
            <Display shadow>
              <video width="630" height="766" controls autoPlay muted loop>
                <source src="/images/setup/how-to-obs.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </Display>
          </Tabs.Panel>
          <Tabs.Panel value="text" className="ml-6 mt-12">
            <div className="mt-4 space-y-4">
              <p>
                1. Let&apos;s see what our canvas resolution is set to. Open OBS
                Studio and go to File &gt; Settings
              </p>
              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  width={331}
                  unoptimized
                  height={292}
                  src="/images/setup/obs-step-1.png"
                />
              </Display>

              <p>
                2. Remember your &quot;Base (Canvas) Resolution&quot;. It&apos;s
                usually 1920x1080 but you could have a different one. Don&apos;t
                copy 1234x789, that&apos;s just there as an example.
              </p>
              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  width={544}
                  unoptimized
                  height={310}
                  src="/images/setup/obs-step-2.png"
                />
              </Display>

              <p>
                3. Close the settings window. Now let&apos;s add the browser
                source. Under Sources click Add &gt; Browser and press OK.
              </p>

              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  width={572}
                  unoptimized
                  height={256}
                  src="/images/setup/obs-step-3.png"
                />
              </Display>

              <p>
                4. Fill out the properties, entering your &quot;Base (Canvas)
                Resolution&quot; from Step 2 earlier. If you had 1920x1080, put
                1920 for width, and 1080 for height.
              </p>
              <div className="ml-4 space-y-4">
                <p>
                  Copy and paste your personal URL into the URL field (1) for
                  the browser source. Click OK to save.
                </p>

                <CopyInstructions />
              </div>

              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  unoptimized
                  width={635}
                  height={519}
                  src="/images/setup/obs-step-4.png"
                />
              </Display>
              <p>
                5. Right click the Dotabod browser source &gt; Transform &gt;
                Fit to screen.
              </p>
            </div>
          </Tabs.Panel>
        </Tabs>
      </div>
    </Card>
  )
}
