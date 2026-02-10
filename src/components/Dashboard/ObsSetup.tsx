import { ReloadOutlined } from '@ant-design/icons' // Icon for refresh button
import * as Sentry from '@sentry/nextjs'
import { Alert, Button, Form, Input, message, Select, Space, Spin, Tooltip } from 'antd'
import Link from 'next/link'
import RegionalBlockingNote from './RegionalBlockingNote'

import { useSession } from 'next-auth/react'
import OBSWebSocket from 'obs-websocket-js'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'
import { useFeatureAccess } from '@/hooks/useSubscription'
import { Settings } from '@/lib/defaultSettings'
import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { type LnaPermissionState, queryLnaPermission, shouldCheckLna } from '@/lib/lna'
import { useTrack } from '@/lib/track'
import { FeatureWrapper } from '@/ui/card'

interface Scene {
  sceneIndex: number // Scene index
  sceneUuid: string // Unique identifier
  sceneName: string // Scene name
}

// Define structured error types
type ErrorCode =
  | 'CONNECTION_ERROR'
  | 'CONNECTION_CLOSED'
  | 'VERSION_TOO_OLD'
  | 'VERSION_TOO_NEW'
  | 'FETCH_SCENES_ERROR'
  | 'ADD_TO_SCENE_ERROR'
  | 'UNKNOWN_ERROR'

interface ObsError {
  code: ErrorCode
  message: string
  details?: string
  actionable: boolean
}

const ObsSetup: React.FC = () => {
  const track = useTrack()
  const [connected, setConnected] = useState(false)
  const [baseWidth, setBaseWidth] = useState<number | null>(null)
  const [baseHeight, setBaseHeight] = useState<number | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [selectedScenes, setSelectedScenes] = useState<string[]>([])
  const [scenesWithSource, setScenesWithSource] = useState<string[]>([])
  const [error, setError] = useState<ObsError | null>(null)
  const [form] = Form.useForm()
  const [obs, setObs] = useState<OBSWebSocket | null>(null)
  const [lnaPermissionState, setLnaPermissionState] = useState<LnaPermissionState | null>(null)
  const [lnaChecked, setLnaChecked] = useState(false)
  const user = useSession()?.data?.user
  const overlayUrl = useBaseUrl(`overlay/${user ? user.id : ''}`)
  const { hasAccess } = useFeatureAccess('autoOBS')

  const {
    data: obsPort,
    loading: l0,
    updateSetting: updatePort,
  } = useUpdateSetting<number>(Settings.obsServerPort)
  const {
    data: obsPassword,
    loading: l1,
    updateSetting: updatePassword,
  } = useUpdateSetting<string>(Settings.obsServerPassword)

  const debouncedFormSubmit = useDebouncedCallback(() => {
    form.submit()
  }, 600)

  // Check LNA permission state on mount
  useEffect(() => {
    const checkLnaPermission = async () => {
      if (!shouldCheckLna()) {
        setLnaChecked(true)
        return
      }

      try {
        const state = await queryLnaPermission()
        setLnaPermissionState(state)
        setLnaChecked(true)

        // Track permission state for monitoring
        if (state === 'granted') {
          track('lna/obs_status_granted')
        } else if (state === 'denied') {
          track('lna/obs_status_denied')
        } else if (state === 'prompt') {
          track('lna/obs_status_prompt_shown')
        }
      } catch (err) {
        // If permission query fails, treat as unsupported
        setLnaPermissionState('unsupported')
        setLnaChecked(true)
      }
    }

    checkLnaPermission()
  }, [track])

  useEffect(() => {
    const formPassword = form.getFieldValue('password')

    if (!formPassword && obsPort && obsPassword) {
      form.resetFields()
      setObs(new OBSWebSocket())
    } else if (!obs && obsPort && obsPassword) {
      setObs(new OBSWebSocket())
    }
  }, [obsPort, obsPassword, form, obs])

  useEffect(() => {
    if (!obs || !hasAccess) return

    const handleConnectionClosed = (error?: Error) => {
      console.log('OBS connection closed', error)
      setConnected(false)
      setError({
        code: 'CONNECTION_CLOSED',
        message: 'Connection to OBS lost',
        details: error?.message || 'Unknown error',
        actionable: true,
      })
      track('obs/connection_closed', { error: error?.message || 'No error details' })
    }

    const handleConnectionError = (error: Error) => {
      console.log('OBS connection error:', error)
      setConnected(false)
      setError({
        code: 'CONNECTION_ERROR',
        message: 'Connection error',
        details: error.message || 'Unknown error',
        actionable: true,
      })
      track('obs/connection_error', { error: error.message })
    }

    // Register event handlers
    obs.on('ConnectionClosed', handleConnectionClosed)
    obs.on('ConnectionError', handleConnectionError)

    const connectObs = async () => {
      // Check LNA permission before connecting (for future WebSocket gating)
      // Note: Currently WebSockets are not yet gated by LNA, but we prepare for it
      if (shouldCheckLna() && lnaChecked && lnaPermissionState === 'denied') {
        setError({
          code: 'CONNECTION_ERROR',
          message: 'Local network access denied',
          details:
            'Your browser has denied permission to connect to OBS. Please allow local network access in your browser settings.',
          actionable: true,
        })
        track('obs/lna_denied_blocked')
        return
      }

      try {
        const obsHost = 'localhost'
        const obsPortValue = form.getFieldValue('port') || 4455
        const obsPasswordValue = form.getFieldValue('password') || ''

        await obs.connect(`ws://${obsHost}:${obsPortValue}`, obsPasswordValue, {
          eventSubscriptions: 0b1111111111111111,
        })
        setConnected(true)
        setError(null) // Clear any previous connection errors

        track('obs/connect_success', { port: obsPortValue })

        const getVersion = await obs.call('GetVersion')
        const obsVersion = getVersion.obsVersion

        const [major, minor, patch] = obsVersion.split('.').map(Number)
        if (
          major < 30 ||
          (major === 30 && minor < 2) ||
          (major === 30 && minor === 2 && patch < 3)
        ) {
          setError({
            code: 'VERSION_TOO_OLD',
            message: 'OBS version 30.2.3 or above is required',
            actionable: true,
          })
          console.log('Error: OBS version 30.2.3 or above is required')
          track('obs/version_error', { version: obsVersion })
          return
        }

        // Check if version is too new (31.0 or above)
        if (major >= 31) {
          setError({
            code: 'VERSION_TOO_NEW',
            message:
              'OBS version 31 or above may cause blank overlay issues. If your overlay loads correctly, you can ignore this warning',
            actionable: false,
          })
          console.log('Warning: OBS version 31 or above may cause blank overlay issues')
          track('obs/version_warning', { version: obsVersion })
        }

        const videoSettings = await obs.call('GetVideoSettings')
        const fetchedBaseWidth = videoSettings.baseWidth
        const fetchedBaseHeight = videoSettings.baseHeight
        setBaseWidth(fetchedBaseWidth)
        setBaseHeight(fetchedBaseHeight)

        await fetchScenes(fetchedBaseWidth, fetchedBaseHeight)
      } catch (err: unknown) {
        const errorObj = err as Error
        setError({
          code: 'CONNECTION_ERROR',
          message: 'Error connecting to OBS',
          details: errorObj.message,
          actionable: true,
        })
        console.log('Error:', errorObj)
        track('obs/connection_error', { error: errorObj.message })
      }
    }

    connectObs()

    return () => {
      // Clean up all event listeners
      obs.off('ConnectionClosed', handleConnectionClosed)
      obs.off('ConnectionError', handleConnectionError)

      try {
        obs.disconnect()
      } catch (err) {
        console.log('Error disconnecting from OBS:', err)
      }

      setConnected(false)
    }
  }, [obs, hasAccess, form, track, lnaChecked, lnaPermissionState])

  // Modify fetchScenes to accept baseWidth and baseHeight
  const fetchScenes = async (currentBaseWidth: number, currentBaseHeight: number) => {
    if (!obs || !hasAccess) return

    try {
      // Fetch the list of scenes
      const sceneListResponse = await obs.call('GetSceneList')
      const sceneUuids = sceneListResponse.scenes.map(
        (scene: { sceneUuid: string }) => scene.sceneUuid,
      )
      setScenes(sceneListResponse.scenes as unknown as Scene[])

      // Check each scene for the existence of the browser source
      const scenesWithOverlay = await checkScenesForSource(sceneUuids)
      setScenesWithSource(scenesWithOverlay)

      if (sceneUuids.length === 1) {
        const singleScene = sceneUuids[0]
        if (!scenesWithOverlay.includes(singleScene)) {
          // If there's only one scene and it doesn't have the overlay, auto-add
          setSelectedScenes([singleScene])
          await handleSceneSelect([singleScene], currentBaseWidth, currentBaseHeight)
        } else {
          // If the single scene already has the overlay, no action needed
          setSelectedScenes(scenesWithOverlay)
        }
      }

      // Only clear errors that are actionable
      if (error?.actionable) {
        setError(null)
      }
    } catch (err: unknown) {
      const errorObj = err as Error
      setError({
        code: 'FETCH_SCENES_ERROR',
        message: 'Error fetching scenes',
        details: errorObj.message,
        actionable: true,
      })
      console.log('Error:', errorObj)
      Sentry.captureException(errorObj)
      track('obs/fetch_scenes_error', { error: errorObj.message })
    }
  }

  // Modify handleSceneSelect to accept baseWidth and baseHeight
  const handleSceneSelect = async (
    scenesToAdd: string[],
    currentBaseWidth: number,
    currentBaseHeight: number,
  ) => {
    if (!obs || scenesToAdd.length === 0 || !hasAccess) return

    track('obs/add_to_scene')

    const newScenes = scenesToAdd.filter((scene) => !scenesWithSource.includes(scene))

    let addedScenes = 0

    for (const selectedScene of newScenes) {
      try {
        // Fetch the list of inputs for the selected scene
        const sceneItemsResponse = await obs.call('GetSceneItemList', {
          sceneUuid: selectedScene,
        })

        // Check if the browser source already exists in the selected scene
        const existingSourceInScene = sceneItemsResponse.sceneItems.find(
          (item: { sourceName: string }) => item.sourceName === '[dotabod] main overlay',
        )

        if (existingSourceInScene) {
          message.info(`Source already exists in scene: ${selectedScene}`)
          continue // Skip adding the source to this scene
        }

        // If the source doesn't exist, create the browser source
        const inputListResponse = await obs.call('GetInputList')
        const existingInput = inputListResponse.inputs.find(
          (input: { inputName: string }) => input.inputName === '[dotabod] main overlay',
        )

        if (existingInput) {
          // If the input exists globally, add it to the selected scene
          const createSceneItemResponse = await obs.call('CreateSceneItem', {
            sceneUuid: selectedScene,
            sourceName: '[dotabod] main overlay',
            sceneItemEnabled: true, // Enable the item by default
          })
          await obs.call('SetSceneItemLocked', {
            sceneUuid: selectedScene,
            sceneItemId: createSceneItemResponse.sceneItemId,
            sceneItemLocked: true,
          })
          addedScenes++
          message.success(`Existing source added to scene: ${selectedScene}`)
        } else {
          // If the input doesn't exist, create a new browser source using CreateInput
          const createInputResponse = await obs.call('CreateInput', {
            sceneUuid: selectedScene,
            inputName: '[dotabod] main overlay',
            inputKind: 'browser_source',
            inputSettings: {
              css: '',
              url: overlayUrl,
              width: currentBaseWidth,
              height: currentBaseHeight,
              webpage_control_level: 4, // Allow OBS to control the webpage
            },
          })
          await obs.call('SetSceneItemLocked', {
            sceneUuid: selectedScene,
            sceneItemId: createInputResponse.sceneItemId,
            sceneItemLocked: true,
          })
          addedScenes++
          message.success(`New browser source created and added to scene: ${selectedScene}`)
        }
      } catch (err: unknown) {
        const errorObj = err as Error
        setError({
          code: 'ADD_TO_SCENE_ERROR',
          message: 'Error adding browser source to scene',
          details: errorObj.message,
          actionable: true,
        })
        console.log('Error:', errorObj)
        Sentry.captureException(errorObj)
        track('obs/add_to_scene_error', { error: errorObj.message })
      }
    }

    if (addedScenes > 0) {
      message.success(`Overlay added to ${addedScenes} scene(s).`)
    }

    // Refetch the list of scenes after adding the source
    await fetchScenes(currentBaseWidth, currentBaseHeight)
  }

  const checkScenesForSource = async (sceneUuids: string[]): Promise<string[]> => {
    if (!obs) return []

    const scenesWithOverlay: string[] = []

    // Check each scene for the existence of the browser source
    for (const scene of sceneUuids) {
      try {
        const sceneItemsResponse = await obs.call('GetSceneItemList', {
          sceneUuid: scene,
        })

        const existingSourceInScene = sceneItemsResponse.sceneItems.find(
          (item: { sourceName: string }) => item.sourceName === '[dotabod] main overlay',
        )

        if (existingSourceInScene) {
          scenesWithOverlay.push(scene)
        }
      } catch (err: unknown) {
        const errorObj = err as Error
        console.log(`Error checking scene "${scene}":`, errorObj)
        Sentry.captureException(errorObj)
        // Continue checking other scenes even if one fails
      }
    }

    setScenesWithSource(scenesWithOverlay)
    return scenesWithOverlay
  }

  const handleFormSubmit = (values) => {
    if (!hasAccess) {
      message.error('Pro subscription required for this feature')
      return
    }

    if (values.password.length > 45) {
      message.error('Password is too long')
      return
    }

    setObs(new OBSWebSocket())
    updatePort(Number(values.port))
    updatePassword(`${values.password}`)

    track('obs/connect', { port: values.port })
  }

  // Helper function to render error action buttons based on error code
  const renderErrorAction = () => {
    if (!error) return null

    switch (error.code) {
      case 'CONNECTION_ERROR':
      case 'CONNECTION_CLOSED':
      case 'FETCH_SCENES_ERROR':
      case 'ADD_TO_SCENE_ERROR':
      case 'UNKNOWN_ERROR':
        return <Button onClick={() => setObs(new OBSWebSocket())}>Retry</Button>

      case 'VERSION_TOO_OLD':
        return (
          <Button type='primary' href='https://obsproject.com/download' target='_blank'>
            Update OBS
          </Button>
        )

      case 'VERSION_TOO_NEW':
        return (
          <Button
            type='primary'
            href='https://github.com/obsproject/obs-studio/releases/download/30.2.3/OBS-Studio-30.2.3-Windows-Installer.exe'
            target='_blank'
          >
            Download OBS 30.2.3
          </Button>
        )

      default:
        return null
    }
  }

  // Helper function to get the alert type based on error code
  const getAlertType = () => {
    if (!error) return 'info'

    switch (error.code) {
      case 'VERSION_TOO_NEW':
        return 'warning'
      case 'VERSION_TOO_OLD':
      case 'CONNECTION_ERROR':
      case 'CONNECTION_CLOSED':
      case 'FETCH_SCENES_ERROR':
      case 'ADD_TO_SCENE_ERROR':
      case 'UNKNOWN_ERROR':
        return 'error'
      default:
        return 'info'
    }
  }

  // Helper to render additional info based on error code
  const renderAdditionalInfo = () => {
    if (!error) return null

    switch (error.code) {
      case 'VERSION_TOO_NEW':
        return (
          <Alert
            message='Some users experience completely blank overlays in OBS v31+ due to Chromium changes. If your overlay appears correctly, you can continue using your current version. Otherwise, download v30.2.3 and run the installer to downgrade - no need to uninstall first.'
            type='info'
            showIcon
          />
        )
      default:
        return null
    }
  }

  return (
    <FeatureWrapper feature='autoOBS'>
      <Form
        initialValues={{ port: obsPort, password: obsPassword }}
        form={form}
        onFinish={handleFormSubmit}
        layout='vertical'
        style={{ maxWidth: 600, margin: '0 auto' }}
        className='space-y-2'
      >
        <Space direction='vertical' size='middle' className='mb-4'>
          {lnaChecked && lnaPermissionState === 'denied' && !connected && (
            <Alert
              className='max-w-2xl'
              message='Local network access denied'
              description={
                <span>
                  Your browser has denied permission to connect to OBS. Please allow local network
                  access in your browser settings and refresh this page.{' '}
                  <Link href='/dashboard/help'>Learn more about fixing this issue</Link>.
                </span>
              }
              type='error'
              showIcon
            />
          )}
          {lnaChecked && lnaPermissionState === 'prompt' && !connected && (
            <Alert
              className='max-w-2xl'
              message='Browser permission required'
              description={
                <span>
                  Chrome will ask for permission to connect to OBS on your computer when you attempt
                  to connect. Please click &quot;Allow&quot; when prompted.
                </span>
              }
              type='info'
              showIcon
            />
          )}
          {!error && scenesWithSource.length > 0 && (
            <Alert
              message='Overlay setup complete'
              type='success'
              description={`Added the Dotabod overlay on scene(s): ${scenesWithSource
                .map((sceneUuid) => {
                  const scene = scenes.find((s) => s.sceneUuid === sceneUuid)
                  return scene ? scene.sceneName : sceneUuid
                })
                .join(', ')}`}
              showIcon
              action={
                <Link href='/dashboard?step=4'>
                  <Button>Go to step 4</Button>
                </Link>
              }
            />
          )}
          {!error && connected && scenesWithSource.length === 0 && (
            <Alert message='Connected to OBS, now select your scenes below' type='info' showIcon />
          )}

          {error && (
            <Alert
              message={`${error.message}${error.code !== 'VERSION_TOO_NEW' ? '. Make sure OBS is running and the WebSocket server is enabled. Press OK after enabling the server.' : ''}`}
              type={getAlertType()}
              showIcon
              action={<div className='space-x-4'>{renderErrorAction()}</div>}
            />
          )}

          {/* Show version recommendation alert if no errors or if error is non-actionable */}
          {(!error || !error.actionable) && (
            <Alert
              message='OBS v30.2.3 is recommended. Versions below 30.2.3 or 31.0 and above are not supported.'
              type='warning'
              showIcon
              action={
                <Button
                  type='primary'
                  href='https://github.com/obsproject/obs-studio/releases/download/30.2.3/OBS-Studio-30.2.3-Windows-Installer.exe'
                  target='_blank'
                >
                  Download OBS 30.2.3
                </Button>
              }
            />
          )}

          {renderAdditionalInfo()}

          <RegionalBlockingNote />
        </Space>
        <Spin spinning={l0 || l1} tip='Loading'>
          {!connected && (
            <Space size='middle'>
              <Form.Item
                name='password'
                className='flex-1'
                label='OBS WebSocket Password'
                rules={[
                  {
                    required: true,
                    message: 'Please enter the OBS WebSocket password!',
                  },
                  {
                    max: 45,
                    message: 'Password is too long',
                  },
                ]}
              >
                <Input
                  autoComplete='new-password'
                  placeholder='Enter the OBS WebSocket password'
                  onPressEnter={() => form.submit()}
                  onChange={debouncedFormSubmit}
                />
              </Form.Item>

              <Form.Item
                name='port'
                label='Port'
                rules={[
                  {
                    required: true,
                    message: 'Please enter the OBS WebSocket port!',
                  },
                ]}
              >
                <Input
                  autoComplete='off'
                  placeholder='4455'
                  type='number'
                  min={1}
                  max={65535}
                  onChange={debouncedFormSubmit}
                  onPressEnter={() => form.submit()}
                />
              </Form.Item>
            </Space>
          )}
          {!error?.actionable && connected && scenes.length > 1 && (
            <Form.Item
              label={
                <Space>
                  <span>Choose the scene where Dota 2 is captured</span>
                  <Tooltip title='Refresh scenes'>
                    <Button
                      disabled={!connected}
                      icon={<ReloadOutlined />}
                      onClick={async () => {
                        if (baseWidth !== null && baseHeight !== null) {
                          await fetchScenes(baseWidth, baseHeight)
                          track('obs/refresh_scenes')
                        } else {
                          message.error('Video settings not loaded yet.')
                        }
                      }}
                      type='default'
                      shape='circle'
                      title='Refresh scenes'
                      size='small'
                    />
                  </Tooltip>
                </Space>
              }
            >
              <div className='flex flex-row items-center space-x-4'>
                <Select
                  className='notranslate max-w-sm'
                  disabled={!connected}
                  mode='multiple'
                  defaultOpen
                  placeholder='Select scene(s)'
                  value={selectedScenes}
                  onChange={(value) => {
                    track('obs/select_scene', { scene: value.join(', ') })
                    setSelectedScenes(value)
                  }}
                  options={scenes.map((scene) => ({
                    label: (
                      <span translate='no' className='notranslate'>
                        {scene.sceneName}
                      </span>
                    ),
                    value: scene.sceneUuid,
                    disabled: scenesWithSource.includes(scene.sceneUuid),
                  }))}
                />
                {!error?.actionable && connected && scenes.length > 1 && (
                  <Button
                    type='primary'
                    onClick={async () => {
                      if (baseWidth !== null && baseHeight !== null) {
                        await handleSceneSelect(selectedScenes, baseWidth, baseHeight)
                      } else {
                        message.error('Video settings not loaded yet.')
                      }
                    }}
                    disabled={
                      !connected ||
                      selectedScenes.length === 0 ||
                      selectedScenes.every((scene) => scenesWithSource.includes(scene))
                    }
                  >
                    Submit
                  </Button>
                )}
              </div>
            </Form.Item>
          )}
        </Spin>

        {!connected && (
          <div className='space-y-4'>
            <div className='flex flex-col items-center space-y-2'>
              <div>
                In OBS, go to Tools → Websocket Server → Enable → Apply → Show connect info → Copy
                password. Make sure you press Apply or OK at the end to enable the server.
              </div>
              <video
                className='rounded-lg'
                width='924'
                height='720'
                controls
                playsInline
                autoPlay
                muted
                loop
              >
                <source src='/images/setup/how-to-obs-websocket.mp4' type='video/mp4' />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}
      </Form>
    </FeatureWrapper>
  )
}

export { ObsSetup }
