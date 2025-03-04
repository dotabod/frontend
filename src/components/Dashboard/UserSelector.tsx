import { captureException } from '@sentry/nextjs'
import { Select, Spin, Tooltip } from 'antd'
import { useCallback, useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface UserSelectorProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  style?: React.CSSProperties
  disabled?: boolean
  required?: boolean
}

/**
 * UserSelector component that allows searching and selecting users.
 * Note: This component returns the provider account ID (e.g., Twitch ID),
 * not the internal user ID from the database.
 */
const UserSelector = ({
  value,
  onChange,
  placeholder = 'Select a user',
  style = { width: '100%' },
  disabled = false,
  required = false,
}: UserSelectorProps) => {
  const [fetching, setFetching] = useState(false)
  const [options, setOptions] = useState<{ value: string; label: string; image: string }[]>([])
  const fetchRef = useRef(0)

  const fetchOptions = useCallback(async (searchValue: string) => {
    try {
      const res = await fetch(`/api/get-moderated-channels?search=${searchValue}`)
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`)
      }
      const channels = await res.json()
      return channels
    } catch (error) {
      captureException(error)
      console.error('Error fetching users:', error)
      return []
    }
  }, [])

  const debounceFetcher = useDebouncedCallback((searchValue: string) => {
    fetchRef.current += 1
    const fetchId = fetchRef.current
    setOptions([])
    setFetching(true)

    if (!searchValue?.trim()) {
      setFetching(false)
      return
    }

    fetchOptions(searchValue).then((newOptions) => {
      if (fetchId !== fetchRef.current) {
        // for fetch callback order
        return
      }

      if (Array.isArray(newOptions)) {
        setOptions(newOptions)
      }
      setFetching(false)
    })
  }, 300)

  const renderOptionLabel = (imageSrc: string, name: string) => (
    <div className='flex flex-row items-center gap-2'>
      <img
        alt='User Profile'
        width={30}
        height={30}
        className='rounded-full flex'
        onError={(e) => {
          e.currentTarget.src = '/images/hero/default.png'
        }}
        src={imageSrc || '/images/hero/default.png'}
      />
      <span>{name}</span>
    </div>
  )

  const fullOptions = options.map((option) => ({
    value: option.value,
    name: option.label,
    label: renderOptionLabel(option.image, option.label),
  }))

  return (
    <Tooltip title="This selector returns the user's provider account ID (e.g., Twitch ID)">
      <Select
        allowClear
        showSearch
        value={value}
        onChange={onChange}
        onSearch={debounceFetcher}
        notFoundContent={fetching ? <Spin size='small' /> : null}
        placeholder={placeholder}
        style={style}
        optionFilterProp='name'
        loading={fetching}
        options={fullOptions}
        disabled={disabled}
        status={required && !value ? 'error' : undefined}
      />
    </Tooltip>
  )
}

export default UserSelector
