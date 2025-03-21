import { Settings } from '@/lib/defaultSettings'
import clsx from 'clsx'
import LastFmCard from './lastfm/LastFmCard'
import { Input, Typography, Form } from 'antd'
import { TierSwitch } from '../Dashboard/Features/TierSwitch'
import { Card } from '@/ui/card'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useEffect } from 'react'
import { useState } from 'react'

const { Paragraph } = Typography

export default function LastFmOverlay() {
  const { data: username, updateSetting } = useUpdateSetting<string>(Settings.lastFmUsername)
  const [inputValue, setInputValue] = useState('')
  const sampleTrack = {
    artist: 'Artist Name',
    title: 'Track Title',
    album: 'Album Name',
    albumArt: 'https://cdn.7tv.app/emote/01FWR6BNTR0007SGPMW6AKG0Q9/4x.avif',
  }

  // Set input value once when username is loaded
  useEffect(() => {
    if (username !== undefined && inputValue === '') {
      setInputValue(username)
    }
  }, [username, inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    if (inputValue !== username) {
      updateSetting(inputValue)
    }
  }

  return (
    <Card title='Last.fm' className='w-full' feature='lastFmOverlay'>
      <Paragraph type='secondary' className='mb-4'>
        Show your currently playing music from Last.fm on your overlay. Connect your Last.fm account
        to display what you're listening to while streaming.
      </Paragraph>

      <div className={clsx('py-4 transition-all')}>
        <div className='flex flex-col items-start space-y-3 md:space-y-4'>
          <div className='flex flex-col items-start space-y-2'>
            <TierSwitch
              hideTierBadge
              settingKey={Settings.lastFmOverlay}
              label='Show Last.fm now playing'
            />
            <TierSwitch
              hideTierBadge
              settingKey={Settings.commandLastFm}
              label='Enable !song command'
            />
          </div>

          <div className='w-full max-w-sm'>
            <Form.Item
              label='Last.fm Username'
              colon={false}
              help={
                <>
                  Enter your Last.fm username to display your currently playing tracks.{' '}
                  <a
                    href={`https://www.last.fm/user/${username || ''}`}
                    target='_blank'
                    rel='noopener noreferrer'
                  >
                    {`https://www.last.fm/user/${username || ''}`}
                  </a>
                </>
              }
              htmlFor='lastfm-username'
            >
              <Input
                id='lastfm-username'
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                placeholder='Your Last.fm username'
                className='flex-1'
              />
            </Form.Item>
          </div>
        </div>
      </div>

      <div className='my-6 flex justify-center space-x-4'>
        <LastFmCard track={sampleTrack} />
      </div>
    </Card>
  )
}
