import { QuestionCircleOutlined } from '@ant-design/icons'
import { CopyButton } from '@mantine/core'
import { Button, Tabs, Tag } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import { useTrack } from '@/lib/track'
import { Card } from '@/ui/card'
import { TierBadge } from './Features/TierBadge'
import { ObsSetup } from './ObsSetup'

export default function OBSOverlay() {
  const user = useSession()?.data?.user
  const track = useTrack()
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)

  const [activeKey, setActiveKey] = useState('auto')
  const router = useRouter()

  const updateUrlWithOverlayType = (newOverlayType: 'auto' | 'text' | 'video') => {
    // Update the URL without adding a new history entry
    router.replace(
      {
        pathname: router.pathname,
        query: { ...router.query, overlayType: newOverlayType },
      },
      undefined,
      { shallow: true },
    ) // `shallow: true` to not trigger data fetching methods again
  }

  useEffect(() => {
    const parsedStep = router.query.overlayType as string
    if (parsedStep === 'auto' || parsedStep === 'text' || parsedStep === 'video') {
      setActiveKey(parsedStep)
    }
  }, [router.query.overlayType])

  const CopyInstructions = () => (
    <div className='flex flex-col items-center gap-4 md:flex-row'>
      <CopyButton value={copyURL}>
        {({ copied, copy }) => (
          <Button
            type='dashed'
            className={clsx(copied && 'border-green-600! text-green-600!')}
            onClick={() => {
              copy()
              track('overlay/copy_url')
            }}
          >
            {copied ? 'Copied to clipboard!' : 'Copy your browser source URL'}
          </Button>
        )}
      </CopyButton>
      <div className='mt-4 gap-2 text-xs md:mt-0'>
        <Tag color='red'>Warning</Tag>
        <span>Do not share or show this URL on stream</span>
      </div>
    </div>
  )

  const OBSVideo = () => (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Tag className='text-xs!'>Note</Tag>
        <span>OBS and Streamlabs have the same instructions</span>
      </div>

      <CopyInstructions />
      <p>Paste this into the URL field when making the browser source</p>
      <div className='flex flex-col items-center space-y-4'>
        <video
          className='rounded-lg'
          playsInline
          width='630'
          height='766'
          controls
          autoPlay
          muted
          loop
        >
          <source src='/images/setup/how-to-obs.mp4' type='video/mp4' />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  )

  const OBSText = () => (
    <div className='space-y-2'>
      <div className='flex items-center gap-2'>
        <Tag className='text-xs!'>Note</Tag>
        <span>OBS and Streamlabs have the same instructions</span>
      </div>

      <p>
        1. Let&apos;s see what our canvas resolution is set to. Open OBS Studio and go to File &gt;
        Settings
      </p>
      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          width={331}
          unoptimized
          height={292}
          src='/images/setup/obs-step-1.png'
        />
      </div>

      <p>
        2. Remember your &quot;Base (Canvas) Resolution&quot;. It&apos;s usually 1920x1080 but you
        could have a different one.
      </p>
      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          width={544}
          unoptimized
          height={310}
          src='/images/setup/obs-step-2.png'
        />
      </div>

      <p>
        3. Close the settings window. Now let&apos;s add the browser source. Under Sources click Add
        &gt; Browser and press OK.
      </p>

      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          width={572}
          unoptimized
          height={256}
          src='/images/setup/obs-step-3.png'
        />
      </div>

      <p>
        4. Fill out the properties, entering your &quot;Base (Canvas) Resolution&quot; from Step 2
        earlier. If you had 1920x1080, put 1920 for width, and 1080 for height.
      </p>
      <div className='ml-4 space-y-4'>
        <p>
          Copy and paste your personal URL into the URL field (1) for the browser source. Click OK
          to save.
        </p>

        <CopyInstructions />
      </div>

      <div className='flex flex-col items-center space-y-4'>
        <Image
          alt='dotabod browser source properties'
          unoptimized
          width={635}
          height={519}
          src='/images/setup/obs-step-4.png'
        />
      </div>
      <p>5. Right click the Dotabod browser source &gt; Transform &gt; Fit to screen.</p>
    </div>
  )

  return (
    <Card>
      <div className='mb-4 flex items-center gap-2'>
        <span>
          <b>Why?</b> Dotabod can show game related overlays on your stream. Your medal, the
          blockers, prediction polls, and more. Some commands like !hero require the overlay.
        </span>
        <Image
          className='inline'
          alt='ok emote'
          unoptimized
          src='https://cdn.7tv.app/emote/6268904f4f54759b7184fa72/1x.webp'
          width={28}
          height={28}
        />
      </div>
      <div className='space-y-4 px-8 pb-8 text-sm text-gray-300'>
        <Tabs
          defaultActiveKey={activeKey}
          activeKey={activeKey}
          destroyInactiveTabPane
          onTabClick={(key) => {
            track('overlay/change_tab', { tab: key })
          }}
          onChange={updateUrlWithOverlayType}
          items={[
            {
              label: (
                <span>
                  Automatic (OBS) <TierBadge feature='autoOBS' />
                </span>
              ),
              key: 'auto',
              children: <ObsSetup />,
            },
            { label: 'Manual (text)', key: 'text', children: <OBSText /> },
            {
              label: 'Manual (video)',
              key: 'video',
              children: <OBSVideo />,
            },
          ]}
        />
      </div>
      <p className='flex items-center gap-2'>
        <QuestionCircleOutlined />
        <span>
          Having trouble? Let us know what happened{' '}
          <Link target='_blank' href='/dashboard/help'>
            from the help page
          </Link>
          , and then try{' '}
          <Link
            onClick={() => {
              track('overlay/manual_steps')
            }}
            href='/dashboard?step=3&overlayType=text'
          >
            the manual steps
          </Link>
          .
        </span>
      </p>
    </Card>
  )
}
