import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { Button, Tooltip, Typography } from 'antd'
import Link from 'next/link'
import { useState } from 'react'

import { useTrack } from '@/lib/track'

const CodeBlock = () => {
  const track = useTrack()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    track('install/copy_windows_installer')

    void navigator.clipboard
      .writeText(`powershell -c "irm https://${window.location.host}/install | iex"`)
      .then(() => {
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
        }, 2500)
      })
  }

  return (
    <div className='mt-0 mb-4 max-w-full sm:max-w-sm lg:max-w-2xl'>
      <div className='xs:p-3 xs:text-sm mb-1 flex flex-row items-center justify-between rounded-sm border-2 border-purple-400 p-5 text-lg sm:p-4 sm:text-base'>
        <pre className='mb-0 overflow-hidden rounded-sm bg-gray-900 text-white'>
          <code>
            <span className='command-line'>
              <span style={{ color: '#F8F8F2' }}>powershell </span>
              <span style={{ color: 'var(--color-purple-400)' }}>-c</span>
              <span style={{ color: '#F8F8F2' }}> </span>
              <span style={{ color: '#E9F284' }}>&quot;</span>
              <span style={{ color: '#F1FA8C' }}>
                irm https://{window.location.host}/install | iex
              </span>
              <span style={{ color: '#E9F284' }}>&quot;</span>
            </span>
          </code>
        </pre>
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <Button
            type='link'
            onClick={handleCopy}
            icon={
              copied ? (
                <CheckOutlined className='text-white' />
              ) : (
                <CopyOutlined className='text-white' />
              )
            }
            className='text-white opacity-70 hover:opacity-100'
          />
        </Tooltip>
      </div>
      <div className='flex flex-row items-center justify-between'>
        <Link
          target='_blank'
          href='https://github.com/dotabod/frontend/blob/master/src/lib/private/install.ps1'
          className='text-gray-400!'
        >
          View source
        </Link>

        <div>
          Paste in <Typography.Text keyboard>⊞ Win</Typography.Text> +{' '}
          <Typography.Text keyboard>R</Typography.Text>
        </div>
      </div>
    </div>
  )
}

export default CodeBlock
