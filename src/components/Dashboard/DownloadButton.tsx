import React from 'react'
import { App, Button } from 'antd'
import Image from 'next/image'

function JustButton({ url, data, user, extension = 'cfg', onClick = null }) {
  return (
    <div>
      <a
        href={url}
        download={`gamestate_integration_dotabod-${user.name}.${extension}`}
        onClick={onClick}
        className="ml-4 block w-48"
      >
        {data?.beta_tester ? (
          <div>
            <Button type="primary">Download beta config file</Button>
            <p className="text-xs text-gray-500">
              To opt out of the beta type !beta in your chat
            </p>
          </div>
        ) : (
          <Button>Download config file</Button>
        )}
      </a>
    </div>
  )
}

function DownloadButton({ url, data, user }) {
  const { notification } = App.useApp()

  const handleDownloadClick = () => {
    // Check if the browser is Chrome
    const isChrome = navigator.userAgent.indexOf('Chrome') !== -1

    if (isChrome) {
      notification.open({
        key: 'downloadwarning',
        duration: 30,
        placement: 'bottomLeft',
        message: <div>Chrome warning</div>,
        description: (
          <div>
            <p>
              Chrome will display a warning message saying &quot;this type of
              file can harm your computer. do you want to keep
              gamestate_integrat....cfg anyway?&quot; This message only shows up
              because the file ends in .cfg, which Valve requires.
            </p>
            <p>
              <Image
                src="https://cdn.7tv.app/emote/60b0c36388e8246a4b120d7e/1x.webp"
                width={28}
                height={28}
                alt="susge emote"
                className="mr-1 inline"
              />
              Still sus? You can download it as a text file to skip this
              warning. But you&apos;ll need to rename it to .cfg
            </p>
            <a
              href={url}
              download={`gamestate_integration_dotabod-${user.name}.txt`}
            >
              <Button>Download as txt</Button>
            </a>
          </div>
        ),
      })
      notification.open({
        key: 'lookdown',
        duration: 30,
        message: '',
        placement: 'bottomLeft',
        description: (
          <div className="flex justify-center">
            <Image
              src="https://cdn.7tv.app/emote/637ce759abbb5b51a3aa0bc4/2x.webp"
              width={64}
              height={64}
              alt="lookdown emote"
              className="mt-4"
            />
          </div>
        ),
      })
    }
  }

  return (
    <JustButton
      url={url}
      data={data}
      user={user}
      onClick={handleDownloadClick}
    />
  )
}

export default DownloadButton
