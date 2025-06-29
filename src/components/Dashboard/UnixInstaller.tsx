import { Typography } from 'antd'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useUpdate } from '@/lib/hooks/useUpdateSetting'
import DownloadButton from './DownloadButton'

export default function UnixInstaller() {
  const user = useSession()?.data?.user
  const { data } = useUpdate({ path: '/api/settings' })

  const fileData = `"Dotabod Configuration"
{
  "uri" "${process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL}"
  "timeout" "5.0"
  "buffer" "0.5"
  "throttle" "0.5"
  "heartbeat" "30.0"
  "data"
  {
    "abilities" "1"
    "buildings" "1"
    "events" "1"
    "hero" "1"
    "items" "1"
    "map" "1"
    "player" "1"
    "provider" "1"
    "wearables" "1"
  }
  "auth"
  {
    "token" "${user?.id}"
  }
}
`
  const blob = new Blob([fileData], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  return (
    <>
      <div className='mb-4 space-x-2'>
        <span>
          <b>Why?</b> This step is necessary to ensure that Dota 2 knows which data Dotabod
          requires. It&apos;s a Valve approved way of getting game data.
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
      <div className='space-y-4'>
        <div className='flex flex-col items-center space-y-4'>
          <ol className='ml-4 list-decimal space-y-2'>
            <li>Open Steam and go to your game library.</li>
            <li>Right-click on Dota 2 and select &quot;Manage&quot;.</li>
            <li>
              From there, click on &quot;Browse local files&quot;. This will open the Dota 2 game
              folder.
            </li>
            <li>
              Navigate to the &quot;gamestate_integration&quot; folder within the
              &quot;\game\dota\cfg&quot; directory.
              <p className='text-xs'>
                If you don&apos;t already have a &quot;gamestate_integration&quot; folder,
                you&apos;ll need to create it.
              </p>
            </li>
            <li>
              <p>
                Download the file and drag it into the &quot;gamestate_integration&quot; folder.
              </p>
              <DownloadButton url={url} user={user} data={data} />
            </li>
            <div className='space-y-4'>
              <div className='flex flex-col items-center space-y-4'>
                <video
                  className='rounded-lg'
                  playsInline
                  width='508'
                  height='504'
                  controls
                  autoPlay
                  muted
                  loop
                >
                  <source src='/images/setup/how-to-create-cfg.mp4' type='video/mp4' />
                  Your browser does not support the video tag.
                </video>
                <div>
                  <div>Full path to save config file to:</div>
                  <Typography.Text code className='whitespace-pre-wrap break-all'>
                    .../Steam/steamapps/common/dota 2 beta/game/dota/cfg/gamestate_integration/
                  </Typography.Text>
                </div>
              </div>
            </div>
            <li className='space-x-1'>
              <p>
                <span>Add</span>
                <Typography.Text code>-gamestateintegration</Typography.Text>
                <span>to your Dota 2 launch options in Steam.</span>
              </p>
              <p>This allows the Dota 2 client to send game data to Dotabod.</p>
            </li>

            <div className='flex flex-col items-center space-y-4'>
              <video
                className='rounded-lg'
                playsInline
                width='482'
                height='392'
                controls
                autoPlay
                muted
                loop
              >
                <source src='/images/setup/how-to-gsi-properties.mp4' type='video/mp4' />
                Your browser does not support the video tag.
              </video>
            </div>
            <li>Restart Dota 2 to ensure that the changes take effect.</li>
          </ol>
        </div>
      </div>
    </>
  )
}
