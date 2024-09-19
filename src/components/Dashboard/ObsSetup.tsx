import { Settings } from '@/lib/defaultSettings'
import { useBaseUrl } from '@/lib/hooks/useBaseUrl'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { useTrack } from '@/lib/track'
import { ReloadOutlined } from '@ant-design/icons' // Icon for refresh button
import * as Sentry from '@sentry/nextjs'
import {
  Alert,
  Button,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Tooltip,
  message,
} from 'antd'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import OBSWebSocket from 'obs-websocket-js'
import { useEffect, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

interface Scene {
  sceneIndex: number // Scene index
  sceneUuid: string // Unique identifier
  sceneName: string // Scene name
}

const ObsSetup: React.FC = () => {
  const track = useTrack()
  const [connected, setConnected] = useState(false)
  const [baseWidth, setBaseWidth] = useState<number | null>(null)
  const [baseHeight, setBaseHeight] = useState<number | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
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
        const obsPortValue = form.getFieldValue('port') || 4455
        const obsPasswordValue = form.getFieldValue('password') || ''

        // Connect to OBS WebSocket
        await obs.connect(`ws://${obsHost}:${obsPortValue}`, obsPasswordValue)
        setConnected(true)

        track('obs/connect_success', { port: obsPortValue })

        // Fetch the base canvas resolution
        const videoSettings = await obs.call('GetVideoSettings')
        const fetchedBaseWidth = videoSettings.baseWidth
        const fetchedBaseHeight = videoSettings.baseHeight
        setBaseWidth(fetchedBaseWidth)
        setBaseHeight(fetchedBaseHeight)

        // Fetch the list of scenes and handle auto-add if necessary
        await fetchScenes(fetchedBaseWidth, fetchedBaseHeight)
        setError(null)
      } catch (err: any) {
        setError(err.message || 'Error connecting to OBS')
        console.error('Error:', err)
        Sentry.captureException(err)
        track('obs/connection_error', { error: err.message })
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

  // Modify fetchScenes to accept baseWidth and baseHeight
  const fetchScenes = async (
    currentBaseWidth: number,
    currentBaseHeight: number
  ) => {
    if (!obs) return

    try {
      // Fetch the list of scenes
      const sceneListResponse = await obs.call('GetSceneList')
      const sceneUuids = sceneListResponse.scenes.map(
        (scene: any) => (scene as Scene).sceneUuid
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
          await handleSceneSelect(
            [singleScene],
            currentBaseWidth,
            currentBaseHeight
          )
        } else {
          // If the single scene already has the overlay, no action needed
          setSelectedScenes(scenesWithOverlay)
        }
      }

      setError(null)
    } catch (err: any) {
      setError('Error fetching scenes')
      console.error('Error:', err)
      Sentry.captureException(err)
      track('obs/fetch_scenes_error', { error: err.message })
    }
  }

  // Modify handleSceneSelect to accept baseWidth and baseHeight
  const handleSceneSelect = async (
    scenesToAdd: string[],
    currentBaseWidth: number,
    currentBaseHeight: number
  ) => {
    if (!obs || scenesToAdd.length === 0) return

    track('obs/add_to_scene')

    const newScenes = scenesToAdd.filter(
      (scene) => !scenesWithSource.includes(scene)
    )

    let addedScenes = 0

    for (const selectedScene of newScenes) {
      try {
        // Fetch the list of inputs for the selected scene
        const sceneItemsResponse = await obs.call('GetSceneItemList', {
          sceneUuid: selectedScene,
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
            sceneUuid: selectedScene,
            sourceName: '[dotabod] main overlay',
            sceneItemEnabled: true, // Enable the item by default
          })
          addedScenes++
          message.success(`Existing source added to scene: ${selectedScene}`)
        } else {
          // If the input doesn't exist, create a new browser source using CreateInput
          await obs.call('CreateInput', {
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
          addedScenes++
          message.success(
            `New browser source created and added to scene: ${selectedScene}`
          )
        }
      } catch (err: any) {
        setError(err.message || 'Error adding browser source to scene')
        console.error('Error:', err)
        Sentry.captureException(err)
        track('obs/add_to_scene_error', { error: err.message })
      }
    }

    if (addedScenes > 0) {
      message.success(`Overlay added to ${addedScenes} scene(s).`)
    }

    // Refetch the list of scenes after adding the source
    await fetchScenes(currentBaseWidth, currentBaseHeight)
  }

  const checkScenesForSource = async (
    sceneUuids: string[]
  ): Promise<string[]> => {
    if (!obs) return []

    const scenesWithOverlay: string[] = []

    // Check each scene for the existence of the browser source
    for (const scene of sceneUuids) {
      try {
        const sceneItemsResponse = await obs.call('GetSceneItemList', {
          sceneUuid: scene,
        })

        const existingSourceInScene = sceneItemsResponse.sceneItems.find(
          (item: any) => item.sourceName === '[dotabod] main overlay'
        )

        if (existingSourceInScene) {
          scenesWithOverlay.push(scene)
        }
      } catch (err: any) {
        console.error(`Error checking scene "${scene}":`, err)
        // Continue checking other scenes even if one fails
      }
    }

    setScenesWithSource(scenesWithOverlay)
    return scenesWithOverlay
  }

  const handleFormSubmit = () => {
    setObs(new OBSWebSocket()) // Create a new OBSWebSocket instance
    updatePort(Number(form.getFieldValue('port')))
    updatePassword(`${form.getFieldValue('password')}`)

    track('obs/connect', { port: form.getFieldValue('port') })
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
      {scenesWithSource.length > 0 && (
        <Alert
          message="Overlay setup complete"
          type="success"
          description={`The overlay has been added to OBS on scene(s): ${scenesWithSource
            .map((sceneUuid) => {
              const scene = scenes.find((s) => s.sceneUuid === sceneUuid)
              return scene ? scene.sceneName : sceneUuid
            })
            .join(', ')}`}
          showIcon
          action={
            <Link href="/dashboard?step=4">
              <Button>Go to step 4</Button>
            </Link>
          }
        />
      )}
      {connected && scenesWithSource.length === 0 && (
        <Alert message="Connected to OBS" type="success" showIcon />
      )}

      {error && (
        <Alert
          message={`Error: ${error}`}
          type="error"
          showIcon
          action={
            <Button onClick={() => setObs(new OBSWebSocket())}>Retry</Button>
          }
        />
      )}

      <Spin spinning={l0 || l1} tip="Loading">
        {!connected && (
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
        )}
        <div>
          {connected && scenes.length > 1 && (
            <Form.Item
              label={
                <Space>
                  <span>Choose the scene where Dota 2 is captured</span>
                  <Tooltip title="Refresh scenes">
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
                      type="default"
                      shape="circle"
                      title="Refresh scenes"
                      size="small"
                    />
                  </Tooltip>
                </Space>
              }
            >
              <Select
                className="notranslate"
                disabled={!connected}
                mode="multiple"
                placeholder="Select scene(s)"
                value={selectedScenes}
                onChange={(value) => {
                  track('obs/select_scene', { scene: value.join(', ') })
                  setSelectedScenes(value)
                }}
                options={scenes.map((scene) => ({
                  label: (
                    <span translate="no" className="notranslate">
                      {scene.sceneName}
                    </span>
                  ),
                  value: scene.sceneUuid,
                  disabled: scenesWithSource.includes(scene.sceneUuid),
                }))}
              />
            </Form.Item>
          )}

          {/* Show the Add button only if there are multiple scenes */}
          {connected && scenes.length > 1 && (
            <Button
              type="primary"
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
                selectedScenes.every((scene) =>
                  scenesWithSource.includes(scene)
                )
              }
            >
              Add
            </Button>
          )}
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
