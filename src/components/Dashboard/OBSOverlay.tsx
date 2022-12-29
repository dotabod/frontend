import { useBaseUrl } from '@/lib/hooks'
import { Card } from '@/ui/card'
import { Badge, Collapse, Display } from '@geist-ui/core'
import { Button, CopyButton, Tabs } from '@mantine/core'
import clsx from 'clsx'
import { useSession } from 'next-auth/react'
import Image from 'next/image'

export default function OBSOverlay() {
  const user = useSession()?.data?.user
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)

  const CopyInstructions = () => (
    <div className="flex items-center space-x-4">
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
            {copied ? 'Copied to clipboard!' : 'Copy your personal URL'}
          </Button>
        )}
      </CopyButton>
      <div className="space-x-2 text-xs">
        <Badge type="error" className="!bg-red-800 !text-xs">
          Warning
        </Badge>
        <span>Do not share or show this URL on stream</span>
      </div>
    </div>
  )

  return (
    <Card>
      <Collapse
        shadow
        title="Step three. OBS Overlay"
        subtitle="Add a new Browser source to OBS."
      >
        <Tabs
          unstyled
          variant="pills"
          defaultValue="streamlabs"
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
              padding: `${theme.spacing.xs}px ${theme.spacing.md}px`,
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
          <Tabs.List className="space-x-2">
            <Tabs.Tab value="streamlabs">
              <div className="flex items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 34 34"
                  width="28px"
                  height="28px"
                >
                  <path
                    data-v-7d802fce=""
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M6.82335 16.6233C6.82335 13.193 6.82335 11.4779 7.49093 10.1677C8.07816 9.01516 9.01516 8.07816 10.1677 7.49093C11.4779 6.82335 13.193 6.82335 16.6233 6.82335H21.5233C24.9537 6.82335 26.6688 6.82335 27.979 7.49093C29.1315 8.07816 30.0685 9.01516 30.6558 10.1677C31.3233 11.4779 31.3233 13.193 31.3233 16.6233V18.0233C31.3233 21.4537 31.3233 23.1688 30.6558 24.479C30.0685 25.6315 29.1315 26.5685 27.979 27.1558C26.6688 27.8233 24.9537 27.8233 21.5233 27.8233H12.4233C10.4632 27.8233 9.48307 27.8233 8.73438 27.4419C8.07581 27.1063 7.54038 26.5709 7.20483 25.9123C6.82335 25.1636 6.82335 24.1835 6.82335 22.2233V16.6233ZM15.5733 17.3233C15.5733 16.3568 16.3568 15.5733 17.3233 15.5733C18.2898 15.5733 19.0733 16.3568 19.0733 17.3233V20.8233C19.0733 21.7898 18.2898 22.5733 17.3233 22.5733C16.3568 22.5733 15.5733 21.7898 15.5733 20.8233V17.3233ZM24.3233 15.5733C23.3568 15.5733 22.5733 16.3568 22.5733 17.3233V20.8233C22.5733 21.7898 23.3568 22.5733 24.3233 22.5733C25.2898 22.5733 26.0733 21.7898 26.0733 20.8233V17.3233C26.0733 16.3568 25.2898 15.5733 24.3233 15.5733Z"
                    fill="#ffffff"
                  ></path>
                </svg>
                <span>Streamlabs instructions</span>
              </div>
            </Tabs.Tab>
            <Tabs.Tab value="obs">
              <div className="flex items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 26 26"
                  width="28px"
                  height="28px"
                  className="fill-white"
                >
                  <path d="M 12 2 C 6.477 2 2 6.477 2 12 C 2 17.523 6.477 22 12 22 C 17.523 22 22 17.523 22 12 C 22 6.477 17.523 2 12 2 z M 12 4 C 16.181463 4 19.61786 7.2270498 19.964844 11.320312 C 19.481459 10.413126 18.757219 9.6236674 17.802734 9.0898438 C 17.051734 8.6688438 16.244547 8.4511563 15.435547 8.4101562 C 15.100547 9.0301562 14.604047 9.5503906 13.998047 9.9003906 C 13.400047 10.245391 12.708891 10.425531 11.962891 10.394531 C 11.669891 10.382531 11.371656 10.350203 11.097656 10.283203 C 9.5036563 9.8312031 8.3335625 8.3726719 8.3515625 6.6386719 C 8.3587644 5.8896788 8.5946558 5.189527 8.9804688 4.5957031 C 9.9130649 4.2139454 10.931652 4 12 4 z M 7.4199219 5.453125 C 6.880601 6.3227352 6.5630006 7.3430796 6.578125 8.4316406 C 6.589125 9.2926406 6.8048281 10.097359 7.1738281 10.818359 C 7.8788281 10.798359 8.5756406 10.970313 9.1816406 11.320312 C 9.7796406 11.665313 10.282906 12.174937 10.628906 12.835938 C 10.764906 13.094938 10.880984 13.347375 10.958984 13.609375 C 11.380984 15.224375 10.700687 16.982844 9.1796875 17.839844 C 8.5316856 18.205587 7.8142359 18.352907 7.1113281 18.318359 C 5.2225061 16.853667 4 14.569541 4 12 C 4 9.2930335 5.3561254 6.901436 7.4199219 5.453125 z M 16.671875 11.003906 C 17.285023 11.019996 17.9025 11.186984 18.46875 11.521484 C 19.110994 11.900775 19.598406 12.450422 19.919922 13.078125 C 19.390421 16.979679 16.044369 20 12 20 C 10.790885 20 9.647738 19.722586 8.6191406 19.240234 C 9.6423128 19.272696 10.683437 19.037909 11.619141 18.480469 C 12.359141 18.040469 12.950625 17.449531 13.390625 16.769531 C 13.020625 16.169531 12.820313 15.479297 12.820312 14.779297 C 12.820312 14.089297 13.010156 13.399531 13.410156 12.769531 C 13.567156 12.522531 13.715438 12.305328 13.898438 12.111328 C 14.639688 11.370078 15.649961 10.97709 16.671875 11.003906 z" />
                </svg>
                <span>OBS instructions</span>
              </div>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="streamlabs" pt="xs">
            <div className="mt-4 space-y-4">
              <div className="space-x-2">
                <Badge type="warning" className="!text-xs">
                  Warning
                </Badge>
                <span className="!text-xs">
                  Streamlabs for Dotabod only supports 1920x1080 canvas size.
                  Use OBS if you require custom resolutions.
                </span>
              </div>

              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  width={453}
                  unoptimized
                  height={320}
                  src="/images/streamlabs-warning.png"
                />
              </Display>

              <p>
                1. Let&apos;s add the browser source. Under Sources click Add
                &gt; Browser and press OK.
              </p>

              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  width={773}
                  unoptimized
                  height={350}
                  src="/images/streamlabs-step-1.png"
                />
              </Display>

              <p>
                2. Fill out the properties, 1920 for width and 1080 for height.
                Other resolutions don&apos;t work on Streamlabs (only OBS).
              </p>
              <div className="ml-4 space-y-4">
                <p>
                  Copy and paste your personal URL into the URL field (1) for
                  the browser source. Then press OK.
                </p>

                <CopyInstructions />
              </div>

              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  unoptimized
                  width={533}
                  height={567}
                  src="/images/streamlabs-step-2.png"
                />
              </Display>
              <p>
                3. Now we want it to be full screen. Right click the Dotabod
                browser source &gt; Transform &gt; Stretch to screen
              </p>
              <Display shadow>
                <Image
                  alt="dotabod browser source properties"
                  unoptimized
                  width={380}
                  height={428}
                  src="/images/obs-last-step.png"
                />
              </Display>
              <p>
                4. All done! Test it by joining a bot match. Look at your
                Streamlabs preview to confirm the overlay is showing. You should
                see the WL overlay, but badge may be missing until you fill out
                your MMR from the settings page.
              </p>
            </div>
          </Tabs.Panel>

          <Tabs.Panel value="obs" pt="xs">
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
                  src="/images/obs-step-1.png"
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
                  src="/images/obs-step-2.png"
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
                  src="/images/obs-step-3.png"
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
                  src="/images/obs-step-4.png"
                />
              </Display>
              <p>
                5. Right click the Dotabod browser source &gt; Transform &gt;
                Fit to screen.
              </p>
              <p>
                6. All done! Dotabod browser source should be full screen now.
                Test it by joining a bot match! Look at your OBS preview to
                confirm the overlay is showing. You should see the WL overlay,
                but badge may be missing until you fill out your MMR from the
                settings page.
              </p>
            </div>
          </Tabs.Panel>
        </Tabs>
      </Collapse>
    </Card>
  )
}
