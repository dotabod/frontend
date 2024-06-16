import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Form, Spin, Switch, Tag } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'
import { Input } from '../../Input'

export default function BetsCard() {
  const {
    data: isEnabled,
    loading: l0,
    updateSetting,
  } = useUpdateSetting(Settings.bets)
  const {
    data: info,
    loading,
    updateSetting: updateInfo,
  } = useUpdateSetting(Settings.betsInfo)

  const [form] = Form.useForm()

  useEffect(() => form.resetFields(), [info])

  return (
    <Card>
      <div className="title">
        <h3>Twitch predictions</h3>
      </div>
      <div className="subtitle">Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether
        you win or lose a match.
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Switch onChange={updateSetting} checked={isEnabled} />
        <span>Enable auto gamba</span>
      </div>

      <div className={clsx(!isEnabled && 'opacity-40', 'mt-6')}>
        <Spin spinning={loading} tip="Loading">
          <Form
            form={form}
            layout="vertical"
            initialValues={info}
            name="bets-form"
            onFinish={updateInfo}
          >
            <Form.Item
              colon={false}
              label="Title"
              name="title"
              help={
                <div className="my-2">
                  <Tag>[heroname]</Tag> will be replaced with the hero name
                </div>
              }
            >
              <Input placeholder="Title" maxLength={45} />
            </Form.Item>
            <div className="flex flex-col md:flex-row md:space-x-4">
              <Form.Item colon={false} label="Yes" name="yes">
                <Input
                  style={{ maxWidth: 108 }}
                  maxLength={25}
                  placeholder="Yes"
                />
              </Form.Item>
              <Form.Item colon={false} label="No" name="no">
                <Input
                  style={{ maxWidth: 108 }}
                  maxLength={25}
                  placeholder="No"
                />
              </Form.Item>
              <Form.Item
                colon={false}
                label="Duration"
                help="How long to keep bets open"
                name="duration"
              >
                <Input
                  style={{ maxWidth: 108 }}
                  min={30}
                  max={1800}
                  placeholder="240"
                  type="number"
                />
              </Form.Item>
            </div>
            <Form.Item colon={false} shouldUpdate>
              {() => (
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={
                    !form.isFieldsTouched() ||
                    !!form
                      .getFieldsError()
                      .filter(({ errors }) => errors.length).length
                  }
                >
                  Save
                </Button>
              )}
            </Form.Item>
          </Form>
        </Spin>
        <div className="flex flex-col items-center space-y-4">
          <Image
            alt="bets image"
            width={425}
            height={168}
            src="https://i.imgur.com/8ZsUxJR.png"
            className="bg-gray-500"
          />
          <span>Customize the prediction title and answers.</span>
        </div>
      </div>
    </Card>
  )
}
