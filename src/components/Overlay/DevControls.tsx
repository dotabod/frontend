import { Button, Checkbox, type CheckboxChangeEvent, Input, InputNumber, Select } from 'antd'
import { motion } from 'framer-motion'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { type blockType, isDev } from '@/lib/devConsts'
import type { ChatMessage } from '@/lib/hooks/useSocket'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

export const DevControls = ({
  block,
  setBlock,
  showDevImage,
  setShowDevImage,
  chatMessages,
  setChatMessages,
}: {
  block: blockType
  setBlock: (block: blockType) => void
  showDevImage: boolean
  setShowDevImage: (showDevImage: boolean) => void
  chatMessages: ChatMessage[]
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
}) => {
  const { data: refreshRate, updateSetting } = useUpdateSetting<number>(Settings.lastFmRefreshRate)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const router = useRouter()
  const [devModeEnabled, setDevModeEnabled] = useState(
    typeof localStorage !== 'undefined' && localStorage.getItem('isDev') === 'true',
  )
  const [testChatMessage, setTestChatMessage] = useState('')

  // Ref to store timeout IDs for chat message cleanup (same as socket handler)
  const messageTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const handleTeamChange = (value: 'radiant' | 'dire' | null) => {
    setBlock({ ...block, team: value })
  }

  const handleTypeChange = (value: blockType['type']) => {
    setBlock({ ...block, type: value })
  }

  const handleIntervalChange = (value: number | null) => {
    if (value) {
      updateSetting(value)
    }
  }

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    },
    [position],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        })
      }
    },
    [isDragging, dragStart],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleShowDevImageChange = (e: CheckboxChangeEvent) => {
    setShowDevImage(e.target.checked)
  }

  const handleDevModeToggle = (e: CheckboxChangeEvent) => {
    const isEnabled = e.target.checked
    setDevModeEnabled(isEnabled)
    if (isEnabled) {
      localStorage.setItem('isDev', 'true')
    } else {
      localStorage.removeItem('isDev')
    }
    router.reload()
  }

  const handleReload = () => {
    router.reload()
  }

  const handleAddTestChatMessage = () => {
    if (testChatMessage.trim()) {
      const messageWithTimestamp = {
        message: testChatMessage.trim(),
        timestamp: Date.now(),
      }

      // Add message to state
      setChatMessages((prev: ChatMessage[]) => [...prev.slice(-7), messageWithTimestamp])

      // Set up timeout to remove message after 10 seconds
      const messageId = messageWithTimestamp.timestamp.toString()
      const timeoutId = setTimeout(() => {
        setChatMessages((prev: ChatMessage[]) =>
          prev.filter((msg) => (msg.timestamp || 0).toString() !== messageId),
        )
        messageTimeoutsRef.current.delete(messageId)
      }, 10000) // 10 seconds

      // Store timeout ID for cleanup
      messageTimeoutsRef.current.set(messageId, timeoutId)
      setTestChatMessage('')
    }
  }

  const handleAddSampleMessage = (message: string) => {
    const messageWithTimestamp = {
      message,
      timestamp: Date.now(),
    }

    // Add message to state
    setChatMessages((prev: ChatMessage[]) => [...prev.slice(-7), messageWithTimestamp])

    // Set up timeout to remove message after 10 seconds
    const messageId = messageWithTimestamp.timestamp.toString()
    const timeoutId = setTimeout(() => {
      setChatMessages((prev: ChatMessage[]) =>
        prev.filter((msg) => (msg.timestamp || 0).toString() !== messageId),
      )
      messageTimeoutsRef.current.delete(messageId)
    }, 10000) // 10 seconds

    // Store timeout ID for cleanup
    messageTimeoutsRef.current.set(messageId, timeoutId)
  }

  const handleClearChatMessages = () => {
    // Clear all timeouts
    messageTimeoutsRef.current.forEach((timeoutId) => {
      clearTimeout(timeoutId)
    })
    messageTimeoutsRef.current.clear()

    // Clear messages
    setChatMessages([])
  }

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      // Clear all message timeouts on unmount
      messageTimeoutsRef.current.forEach((timeoutId) => {
        clearTimeout(timeoutId)
      })
      messageTimeoutsRef.current.clear()
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  if (!isDev) return null

  return (
    <motion.div
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        position: 'fixed',
        top: '1rem',
        left: '1rem',
        zIndex: 50,
      }}
      className='flex flex-col gap-3 p-4 rounded-lg shadow-lg bg-gray-900/80 backdrop-blur-md'
    >
      <div
        onMouseDown={handleMouseDown}
        className='absolute top-0 right-0 left-0 h-6 bg-gray-800/50 rounded-t-lg flex items-center justify-center text-xs text-gray-400 cursor-move select-none'
      >
        Drag to move
      </div>

      {/* Block controls group */}
      <div className='flex flex-col gap-2 mt-4'>
        <div className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
          Block Controls
        </div>
        <div className='flex gap-2'>
          <Select
            value={block.team}
            onChange={handleTeamChange}
            options={[
              { value: 'radiant', label: 'Radiant' },
              { value: 'dire', label: 'Dire' },
              { value: null, label: 'None' },
            ]}
            style={{ width: 120 }}
            placeholder='Select team'
          />
          <Select
            value={block.type}
            onChange={handleTypeChange}
            options={[
              { value: 'picks', label: 'Picks' },
              { value: 'playing', label: 'Playing' },
              { value: 'strategy', label: 'Strategy' },
              { value: 'strategy-2', label: 'Strategy 2' },
              { value: 'spectator', label: 'Spectator' },
              { value: null, label: 'None' },
            ]}
            style={{ width: 120 }}
            placeholder='Select type'
          />
        </div>
      </div>

      {/* LastFM settings group */}
      <div className='flex flex-col gap-2'>
        <div className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
          LastFM Settings
        </div>
        <InputNumber
          value={typeof refreshRate === 'number' ? refreshRate : 30}
          onChange={handleIntervalChange}
          min={1}
          max={300}
          style={{ width: 120 }}
          addonAfter='sec'
          placeholder='LastFM interval'
        />
      </div>

      {/* Dev Image Toggle */}
      <div className='flex items-center gap-2 mt-2'>
        <Checkbox
          checked={showDevImage}
          onChange={handleShowDevImageChange}
          className='text-xs text-gray-300'
        >
          Show Dev Image
        </Checkbox>
      </div>

      {/* Dev Mode Toggle */}
      <div className='flex items-center gap-2 mt-2'>
        <Checkbox
          checked={devModeEnabled}
          onChange={handleDevModeToggle}
          className='text-xs text-gray-300'
        >
          Persist Dev Mode
        </Checkbox>
      </div>

      {/* Reload Button */}
      <Button onClick={handleReload}>Reload Page</Button>

      {/* Chat Messages Testing group */}
      <div className='flex flex-col gap-2'>
        <div className='text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1'>
          Chat Messages Testing
        </div>
        <div className='flex gap-2'>
          <Input
            value={testChatMessage}
            onChange={(e) => setTestChatMessage(e.target.value)}
            placeholder='Enter test chat message'
            style={{ width: 200 }}
            onPressEnter={handleAddTestChatMessage}
          />
          <Button onClick={handleAddTestChatMessage} size='small'>
            Add Message
          </Button>
        </div>
        <div className='flex gap-2'>
          <Button onClick={handleClearChatMessages} size='small' danger>
            Clear Messages
          </Button>
          <span className='text-xs text-gray-400 self-center'>{chatMessages.length} messages</span>
        </div>
        <div className='flex flex-wrap gap-1'>
          <Button size='small' onClick={() => handleAddSampleMessage('Hello everyone!')}>
            Sample 1
          </Button>
          <Button size='small' onClick={() => handleAddSampleMessage('Good luck team!')}>
            Sample 2
          </Button>
          <Button size='small' onClick={() => handleAddSampleMessage('Nice play!')}>
            Sample 3
          </Button>
          <Button size='small' onClick={() => handleAddSampleMessage('GG WP')}>
            Sample 4
          </Button>
        </div>
      </div>
    </motion.div>
  )
}

// Dev mode toggle button for development environment
export const DevModeToggle = () => {
  const router = useRouter()

  if (typeof process === 'undefined' || process.env.NODE_ENV !== 'development' || isDev) return null

  const enableDevMode = () => {
    localStorage.setItem('isDev', 'true')
    router.reload()
  }

  return (
    <motion.div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 50,
      }}
      className='p-2 rounded-lg shadow-lg bg-gray-900/80 backdrop-blur-md'
    >
      <Button type='primary' onClick={enableDevMode}>
        Enable Dev Mode
      </Button>
    </motion.div>
  )
}
