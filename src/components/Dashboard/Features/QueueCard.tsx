import { Settings, defaultSettings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Form, Spin } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { useEffect } from 'react'
import { TierInput } from './TierInput'
import { TierSwitch } from './TierSwitch'

export default function QueueCard() {
  const { data: isEnabled, loading } = useUpdateSetting(Settings.queueBlocker)
  const { data: isFindingMatchEnabled } = useUpdateSetting(Settings.queueBlockerFindMatch)
  const {
    data: findMatchText,
    updateSetting: updateFindMatchText,
    tierAccess,
  } = useUpdateSetting(Settings.queueBlockerFindMatchText)

  const [form] = Form.useForm()
  useEffect(() => form.resetFields(), [findMatchText])

  return (
    <Card title='Queue blocker' feature='queueBlockerFindMatchText'>
      <div className='subtitle'>
        Stream snipers won&apos;t know what your queue time is to be able to snipe you.
      </div>
      <div className='mt-5 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.queueBlocker}
          label='Enable queue blocker overlay'
        />
      </div>
      <div className='mb-5 mt-5 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.queueBlockerFindMatch}
          label='Show finding match'
        />
      </div>
      <Spin spinning={loading} tip='Loading'>
        <Form
          form={form}
          layout='vertical'
          initialValues={{ text: findMatchText }}
          name='bets-form'
          onFinish={(form) => updateFindMatchText(form.text)}
        >
          <Form.Item colon={false} label={<span>Custom find match text</span>} name='text'>
            <TierInput
              hideTierBadge
              settingKey={Settings.queueBlockerFindMatchText}
              placeholder={defaultSettings.queueBlockerFindMatchText}
              maxLength={45}
              helpText='Max 45 characters'
            />
          </Form.Item>
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

      <div>
        Both the &quot;PLAY DOTA&quot; in the bottom right, and the &quot;Finding match&quot; at the
        top left while in main menu will be blocked.
      </div>
      <div
        className={clsx(
          'mt-2 flex flex-col items-center space-y-12 transition-all',
          !isEnabled && 'opacity-40',
        )}
      >
        <div className='flex flex-wrap items-center justify-center space-x-4'>
          {isFindingMatchEnabled ? (
            <Image
              className={clsx('mt-4 inline rounded-xl border-2 border-transparent transition-all')}
              alt='queue blocker'
              width={497}
              height={208}
              src='https://i.imgur.com/ZYHTWgq.png'
            />
          ) : (
            <Image
              className={clsx('mt-4 inline rounded-xl border-2 border-transparent transition-all')}
              alt='queue blocker'
              width={497}
              height={208}
              src='https://i.imgur.com/PmMjd4V.png'
            />
          )}

          <Image
            className={clsx('mt-4 inline rounded-xl border-2 border-transparent transition-all')}
            alt='queue blocker'
            width={204}
            height={247}
            src='https://i.imgur.com/ZHyrR1k.png'
          />
        </div>
      </div>
    </Card>
  )
}
