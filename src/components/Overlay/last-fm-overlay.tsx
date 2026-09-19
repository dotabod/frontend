import { Form, Input } from 'antd'
import { clsx } from 'clsx'
import { useEffect, useRef, useState } from 'react'

import { Settings } from '@/lib/default-settings'
import { useUpdateSetting } from '@/lib/hooks/use-update-setting'
import { Card } from '@/ui/card'

import { TierSwitch } from '../Dashboard/Features/tier-switch'
import LastFmCard from './lastfm/last-fm-card'

const LastFmOverlay = () => {
  const { data: username, updateSetting } = useUpdateSetting<string>(Settings.lastFmUsername)
  const [inputValue, setInputValue] = useState('')
  const initializedRef = useRef(false)
  const sampleTrack = {
    album: 'Album Name',
    albumArt: 'https://cdn.7tv.app/emote/01FWR6BNTR0007SGPMW6AKG0Q9/4x.avif',
    artist: 'Artist Name',
    title: 'Track Title',
  }

  // Set input value only once when username is first loaded
  useEffect(() => {
    if (username !== undefined && !initializedRef.current) {
      setInputValue(username)
      initializedRef.current = true
    }
  }, [username])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    if (inputValue !== username) {
      updateSetting(inputValue)
    }
  }

  const hasUsername = username && username.trim() !== ''

  return (
    <Card title='Spotify / Youtube' className='w-full' feature='lastFmOverlay'>
      <div className={clsx('py-4 transition-all')}>
        <div className='flex flex-col items-start space-y-3 md:space-y-4'>
          <div className='flex flex-col items-start space-y-2'>
            <TierSwitch
              hideTierBadge
              settingKey={Settings.lastFmOverlay}
              label='Show currently playing song'
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
                  {hasUsername ? (
                    <a
                      href={`https://www.last.fm/user/${username || ''}`}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      View Last.fm profile
                    </a>
                  ) : null}
                  <div className='mt-2'>
                    Connect your music services to Last.fm:{' '}
                    <a
                      href='https://www.last.fm/settings/applications'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-500 hover:underline'
                    >
                      Spotify
                    </a>{' '}
                    |{' '}
                    <a
                      href='https://chromewebstore.google.com/detail/lastfm-scrobbler-for-yout/kjhnjfldmodoikafpfhfehngokaiegok'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-500 hover:underline'
                    >
                      YouTube
                    </a>
                  </div>
                  <div className='mt-2 text-amber-600'>
                    Important: You must disable &quot;Hide recent listening information&quot; in
                    your{' '}
                    <a
                      href='https://www.last.fm/settings/privacy'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-blue-500 hover:underline'
                    >
                      Last.fm privacy settings
                    </a>{' '}
                    for your currently playing tracks to be visible.
                  </div>
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

      <div className='my-6 flex justify-center'>
        <LastFmCard track={sampleTrack} />
      </div>
    </Card>
  )
}

export default LastFmOverlay
