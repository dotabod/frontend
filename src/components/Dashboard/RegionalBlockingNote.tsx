import { Alert, Tag } from 'antd'

export default function RegionalBlockingNote() {
  return (
    <Alert
      message='Regional blocking may prevent overlays or widgets'
      description={
        <span>
          The overlay may be blocked by your network and won't load. Try the community tool{' '}
          <a
            href='https://github.com/Flowseal/zapret-discord-youtube'
            target='_blank'
            rel='noreferrer'
            className='text-blue-500 hover:underline'
          >
            zapret-discord-youtube
          </a>{' '}
          — add <Tag>dotabod.com</Tag> and <Tag>gsi.dotabod.com</Tag> to{' '}
          <code>lists/list-general.txt</code>. If that doesn't work, try the older release{' '}
          <a
            href='https://github.com/Flowseal/zapret-discord-youtube/releases/tag/1.9.0b'
            target='_blank'
            rel='noreferrer'
            className='text-blue-500 hover:underline'
          >
            v1.9.0b
          </a>{' '}
          or contact support for help.
        </span>
      }
      type='info'
      showIcon
    />
  )
}
