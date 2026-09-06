import { Alert, Tag } from 'antd'

export default function RegionalBlockingNote() {
  return (
    <Alert
      message='Overlay works in your browser but stays blank in OBS?'
      description={
        <div className='space-y-2'>
          <p>
            Some ISPs (mostly in Russia) block the servers the overlay relies on. A VPN running in
            Chrome will let the overlay URL load in a regular browser tab, but OBS uses its own
            built-in browser that doesn&apos;t share your VPN, so the overlay stays blocked there.
          </p>
          <p>
            Install{' '}
            <a
              href='https://github.com/Flowseal/zapret-discord-youtube'
              target='_blank'
              rel='noreferrer'
              className='text-blue-500 hover:underline'
            >
              zapret-discord-youtube
            </a>{' '}
            to route around the block system-wide. Then add <Tag>dotabod.com</Tag> and{' '}
            <Tag>gsi.dotabod.com</Tag> to <code>lists/list-general.txt</code>, each on its own line.
            If the overlay still won&apos;t load, try the older{' '}
            <a
              href='https://github.com/Flowseal/zapret-discord-youtube/releases/tag/1.9.0b'
              target='_blank'
              rel='noreferrer'
              className='text-blue-500 hover:underline'
            >
              v1.9.0b release
            </a>
            .
          </p>
        </div>
      }
      type='info'
      showIcon
    />
  )
}
