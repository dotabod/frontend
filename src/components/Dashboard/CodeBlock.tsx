import { CheckOutlined, CopyOutlined } from '@ant-design/icons'
import { sendGAEvent } from '@next/third-parties/google'
import { Button, Tooltip, Typography } from 'antd'
import Link from 'next/link'
import { useState } from 'react'

const CodeBlock = () => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    sendGAEvent({
      action: 'click',
      category: 'install',
      label: 'copy_windows_installer',
    })
    navigator.clipboard
      .writeText('powershell -c "irm dotabod.com/install.ps1 | iex"')
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
      })
  }

  return (
    <div className="mb-4 mt-0 sm:max-w-sm lg:max-w-2xl max-w-full">
      <div className="mb-1 flex p-5 sm:p-4 xs:p-3 justify-between items-center flex-row border-2 border-purple-400 rounded text-lg sm:text-base xs:text-sm">
        <pre className="bg-gray-900 overflow-hidden text-white rounded mb-0">
          <code>
            <span className="command-line">
              <span style={{ color: '#F8F8F2' }}>powershell </span>
              <span style={{ color: 'var(--color-purple-400)' }}>-c</span>
              <span style={{ color: '#F8F8F2' }}> </span>
              <span style={{ color: '#E9F284' }}>"</span>
              <span style={{ color: '#F1FA8C' }}>
                irm dotabod.com/install.ps1 | iex
              </span>
              <span style={{ color: '#E9F284' }}>"</span>
            </span>
          </code>
        </pre>
        <Tooltip title={copied ? 'Copied!' : 'Copy'}>
          <Button
            type="link"
            onClick={handleCopy}
            icon={
              copied ? (
                <CheckOutlined className="text-white" />
              ) : (
                <CopyOutlined className="text-white" />
              )
            }
            className="text-white opacity-70 hover:opacity-100"
          />
        </Tooltip>
      </div>
      <div className="flex flex-row justify-between items-center">
        <Link
          target="_blank"
          href="https://github.com/dotabod/frontend/blob/master/public/install.ps1"
          className=" !text-gray-400"
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
