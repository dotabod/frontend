import { Settings } from '@/lib/defaultSettings'
import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { ReloadOutlined } from '@ant-design/icons' // Icon for refresh button
import { sendGAEvent } from '@next/third-parties/google'
import * as Sentry from '@sentry/nextjs'
import { track } from '@vercel/analytics/react'
import { Alert, Button, Form, Input, Select, Space, Spin, message } from 'antd'
import { useSession } from 'next-auth/react'
import OBSWebSocket from 'obs-websocket-js'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

const ObsSetup: React.FC = () => {
  const [connected, setConnected] = useState(false)
  const [baseWidth, setBaseWidth] = useState<number | null>(null)
  const [baseHeight, setBaseHeight] = useState<number | null>(null)
  const [scenes, setScenes] = useState<string[]>([])
  const [selectedScenes, setSelectedScenes] = useState<string[]>([])
  const [scenesWithSource, setScenesWithSource] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [obs, setObs] = useState<OBSWebSocket | null>(null)
  const user = useSession()?.data?.user
  const overlayUrl = useBaseUrl(`overlay/${user ? user.id : ''}`)

  const {
    data: obsPort,
    loading: l0,
    updateSetting: updatePort,
  } = useUpdateSetting(Settings.obsServerPort)
  const {
    data: obsPassword,
    loading: l1,
    updateSetting: updatePassword,
  } = useUpdateSetting(Settings.obsServerPassword)

  const debouncedFormSubmit = useDebouncedCallback((value) => {
    form.submit()
  }, 600)

  useEffect(() => {
    const formPassword = form.getFieldValue('password')

    if (!formPassword && obsPort && obsPassword) {
      form.resetFields()
      setObs(new OBSWebSocket())
    } else if (!obs && obsPort && obsPassword) {
      setObs(new OBSWebSocket())
    }
  }, [obsPort, obsPassword])

  useEffect(() => {
    const connectObs = async () => {
      if (!obs) return

      try {
        const obsHost = 'localhost'
        const obsPort = form.getFieldValue('port') || 4455
        const obsPassword = form.getFieldValue('password') || ''

        // Connect to OBS WebSocket
        await obs.connect(`ws://${obsHost}:${obsPort}`, obsPassword)
        setConnected(true)
        sendGAEvent({
          label: 'connect_success',
          action: 'click',
          category: 'obs_overlay',
          user: user?.id,
        })
        track('obs/connect_success', { port: obsPort, user: user?.id })

        // Fetch the base canvas resolution
        const videoSettings = await obs.call('GetVideoSettings')
        setBaseWidth(videoSettings.baseWidth)
        setBaseHeight(videoSettings.baseHeight)

        // Fetch the list of scenes
        fetchScenes()
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error connecting to OBS')
        console.error('Error:', err)
        Sentry.captureException(err)
        track('obs/connection_error', { error: err.message })
        sendGAEvent({
          user: user?.id,
          label: 'connect_error',
          action: 'click',
          category: 'obs_overlay',
        })
      }
    }

    if (obs) {
      connectObs()
    }

    return () => {
      if (obs) {
        obs.disconnect()
        setConnected(false)
      }
    }
  }, [obs])

  const fetchScenes = async () => {
    if (!obs) return

    try {
      // Fetch the list of scenes
      const sceneListResponse = await obs.call('GetSceneList')
      const sceneNames = sceneListResponse.scenes.map(
        (scene: any) => scene.sceneName
      )
      setScenes(sceneNames)

      // Check each scene for the existence of the browser source
      checkScenesForSource(sceneNames)
      setError(null)
    } catch (err: any) {
      setError('Error fetching scenes')
      console.error('Error:', err)
      Sentry.captureException(err)
      track('obs/fetch_scenes_error', { error: err.message })
      sendGAEvent({
        label: 'fetch_scenes_error',
        action: 'click',
        category: 'obs_overlay',
      })
    }
  }

  const checkScenesForSource = async (sceneNames: string[]) => {
    if (!obs) return

    const scenesWithOverlay: string[] = []

    // Check each scene for the existence of the browser source
    for (const scene of sceneNames) {
      const sceneItemsResponse = await obs.call('GetSceneItemList', {
        sceneName: scene,
      })

      const existingSourceInScene = sceneItemsResponse.sceneItems.find(
        (item: any) => item.sourceName === '[dotabod] main overlay'
      )

      if (existingSourceInScene) {
        scenesWithOverlay.push(scene)
      }
    }

    setScenesWithSource(scenesWithOverlay)
    setSelectedScenes(scenesWithOverlay) // Preselect scenes with the browser source
  }

  const handleFormSubmit = () => {
    setObs(new OBSWebSocket()) // Create a new OBSWebSocket instance
    updatePort(Number(form.getFieldValue('port')))
    updatePassword(`${form.getFieldValue('password')}`)

    track('obs/connect', { port: form.getFieldValue('port') })
    sendGAEvent({
      label: 'connect',
      action: 'click',
      category: 'obs_overlay',
      port: form.getFieldValue('port'),
    })
  }

  const handleSceneSelect = async () => {
    if (!obs || selectedScenes.length === 0) return

    track('obs/add_to_scene', { user: user?.id })
    sendGAEvent({
      label: 'add_to_scene',
      action: 'click',
      category: 'obs_overlay',
    })

    const newScenes = selectedScenes.filter(
      (scene) => !scenesWithSource.includes(scene)
    )

    for (const selectedScene of newScenes) {
      try {
        // Fetch the list of inputs for the selected scene
        const sceneItemsResponse = await obs.call('GetSceneItemList', {
          sceneName: selectedScene,
        })

        // Check if the browser source already exists in the selected scene
        const existingSourceInScene = sceneItemsResponse.sceneItems.find(
          (item: any) => item.sourceName === '[dotabod] main overlay'
        )

        if (existingSourceInScene) {
          message.info(`Source already exists in scene: ${selectedScene}`)
          continue // Skip adding the source to this scene
        }

        // If the source doesn't exist, create the browser source
        const inputListResponse = await obs.call('GetInputList')
        const existingInput = inputListResponse.inputs.find(
          (input: any) => input.inputName === '[dotabod] main overlay'
        )

        if (existingInput) {
          // If the input exists globally, add it to the selected scene
          await obs.call('CreateSceneItem', {
            sceneName: selectedScene,
            sourceName: '[dotabod] main overlay',
            sceneItemEnabled: true, // Enable the item by default
          })

          message.success(`Existing source added to scene: ${selectedScene}`)
        } else {
          // If the input doesn't exist, create a new browser source using CreateInput
          await obs.call('CreateInput', {
            sceneName: selectedScene,
            inputName: '[dotabod] main overlay',
            inputKind: 'browser_source',
            inputSettings: {
              css: '',
              url: overlayUrl,
              width: baseWidth,
              height: baseHeight,
              webpage_control_level: 4, // Allow OBS to control the webpage
            },
          })

          message.success(
            `New browser source created and added to scene: ${selectedScene}`
          )
        }
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error adding browser source to scene')
        console.error('Error:', err)
        Sentry.captureException(err)
        track('obs/add_to_scene_error', { error: err.message })
        sendGAEvent({
          label: 'add_to_scene_error',
          action: 'click',
          category: 'obs_overlay',
        })
      }
    }

    // Refetch the list of scenes after adding the source
    fetchScenes()
  }

  return (
    <Form
      initialValues={{ port: obsPort, password: obsPassword }}
      form={form}
      onFinish={handleFormSubmit}
      layout="vertical"
      style={{ maxWidth: 600, margin: '0 auto' }}
      className="space-y-2"
    >
      {error && (
        <Alert
          message={`Error: ${error}`}
          type="error"
          showIcon
          className=",b-4"
          action={
            <Button onClick={() => setObs(new OBSWebSocket())}>Retry</Button>
          }
        />
      )}

      <Spin spinning={l0 || l1} tip="Loading">
        <div className="flex flex-col items-center space-x-4 md:flex-row">
          <Form.Item
            name="password"
            className="flex-1"
            label="OBS WebSocket Password"
            rules={[
              {
                required: true,
                message: 'Please enter the OBS WebSocket password!',
              },
            ]}
          >
            <Input.Password
              autoComplete="new-password"
              placeholder="Enter the OBS WebSocket password"
              onPressEnter={() => form.submit()}
              onChange={debouncedFormSubmit}
            />
          </Form.Item>

          <Form.Item
            name="port"
            label="Port"
            rules={[
              {
                required: true,
                message: 'Please enter the OBS WebSocket port!',
              },
            ]}
          >
            <Input
              autoComplete="off"
              placeholder="4455"
              type="number"
              min={1}
              max={65535}
              onChange={debouncedFormSubmit}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>
        </div>

        <div>
          <Form.Item
            label={
              <Space>
                <span>Scene(s) to add Dotabod to</span>
                <Button
                  disabled={!connected}
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    fetchScenes()
                    track('obs/refresh_scenes')
                    sendGAEvent({
                      label: 'refresh_scenes',
                      action: 'click',
                      category: 'obs_overlay',
                    })
                  }}
                  type="default"
                  shape="circle"
                  title="Refresh scenes"
                  size="small"
                />
              </Space>
            }
          >
            <Select
              disabled={!connected}
              mode="multiple"
              placeholder="Select scenes to add the overlay"
              value={selectedScenes}
              onChange={(value) => {
                track('obs/select_scene')
                sendGAEvent({
                  label: 'select_scene',
                  action: 'click',
                  category: 'obs_overlay',
                  scene: value,
                })
                return setSelectedScenes(value)
              }}
            >
              {scenes.map((scene) => (
                <Select.Option
                  key={scene}
                  value={scene}
                  disabled={scenesWithSource.includes(scene)}
                >
                  {scene}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Button
            type="primary"
            onClick={handleSceneSelect}
            disabled={
              !connected ||
              selectedScenes.length === 0 ||
              selectedScenes.every((scene) => scenesWithSource.includes(scene))
            }
          >
            Add to selected scenes
          </Button>
        </div>
      </Spin>

      {!connected && (
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <div>Video guide to retrieve the server password</div>
            <video
              className="rounded-lg"
              width="924"
              height="720"
              controls
              playsInline
              autoPlay
              muted
              loop
            >
              <source
                src="/images/setup/how-to-obs-websocket.mp4"
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </Form>
  )
}

export { ObsSetup }
