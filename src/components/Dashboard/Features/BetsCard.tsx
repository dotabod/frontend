import { Button, Form, Spin, Tag } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Input } from '../../Input'
import { TierSwitch } from './TierSwitch'

export default function BetsCard() {
  const { data: isEnabled } = useUpdateSetting<boolean>(Settings.bets)
  const {
    data: info,
    loading,
    updateSetting: updateInfo,
  } = useUpdateSetting<{
    title: string
    yes: string
    no: string
    duration: number
  }>(Settings.betsInfo)

  const [form] = Form.useForm()

  useEffect(() => form.resetFields(), [info])

  return (
    <Card title='Twitch predictions' feature='bets'>
      <div className='subtitle'>Let your chatters bet on your matches.</div>
      <div>
        Chatters can use their native Twitch channel points to bet on whether you win or lose a
        match.
      </div>
      <div className='mt-5 flex items-center space-x-2'>
        <TierSwitch hideTierBadge settingKey={Settings.bets} label='Enable auto gamba' />
      </div>

      <div className={clsx(!isEnabled && 'opacity-40', 'mt-5 flex items-center space-x-2')}>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.discardZeroBets}
          label='Discard predictions when one side has zero predictions'
        />
      </div>

      <div className={clsx(!isEnabled && 'opacity-40', 'mt-6')}>
        <Spin spinning={loading} tip='Loading'>
          <Form
            form={form}
            layout='vertical'
            initialValues={info}
            name='bets-form'
            onFinish={(values) => {
              const updatedValues = values
              updatedValues.duration = `${values.duration}`
              updateInfo(values)
            }}
          >
            <Form.Item
              colon={false}
              label='Title'
              name='title'
              help={
                <div className='my-2 text-xs flex flex-row items-center'>
                  <Tag>[heroname]</Tag>
                  <span>will be replaced with the hero name</span>
                </div>
              }
            >
              <Input placeholder='Title' maxLength={45} />
            </Form.Item>
            <div className='flex flex-col md:flex-row md:gap-4'>
              <Form.Item colon={false} label='Yes' name='yes'>
                <Input style={{ maxWidth: 108 }} maxLength={25} placeholder='Yes' />
              </Form.Item>
              <Form.Item colon={false} label='No' name='no'>
                <Input style={{ maxWidth: 108 }} maxLength={25} placeholder='No' />
              </Form.Item>
              <Form.Item
                colon={false}
                label='Duration'
                help='How long to keep bets open'
                name='duration'
              >
                <Input
                  style={{ maxWidth: 108 }}
                  min={30}
                  max={1800}
                  placeholder='240'
                  type='number'
                />
              </Form.Item>
            </div>
            <Form.Item colon={false} shouldUpdate>
              {() => (
                <Button
                  type='primary'
                  htmlType='submit'
                  disabled={
                    !form.isFieldsTouched() ||
                    !!form.getFieldsError().filter(({ errors }) => errors.length).length
                  }
                >
                  Save
                </Button>
              )}
            </Form.Item>
          </Form>
        </Spin>
        <div className='flex flex-col items-center space-y-4'>
          <Image
            alt='bets image'
            width={425}
            height={168}
            src='https://i.imgur.com/8ZsUxJR.png'
            className='bg-gray-500'
          />
          <span>Customize the prediction title and answers.</span>
        </div>
      </div>
    </Card>
  )
}
