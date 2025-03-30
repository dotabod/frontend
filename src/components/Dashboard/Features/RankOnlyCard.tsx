import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Form, Select, Spin } from 'antd'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { TierSwitch } from './TierSwitch'

// Rank mapping used to determine minimumRankTier from selected rank
const rankToTier = {
  Herald: 10,
  Guardian: 20,
  Crusader: 30,
  Archon: 40,
  Legend: 50,
  Ancient: 60,
  Divine: 70,
  Immortal: 80,
}

type RankTierInfo = {
  enabled: boolean
  minimumRank: keyof typeof rankToTier
  minimumRankTier: number
}

// Type for the form values which may be partial during submission
type FormValues = {
  minimumRank?: keyof typeof rankToTier
}

export const RankOnlyCard = () => {
  const {
    data: info,
    loading,
    updateSetting: updateInfo,
  } = useUpdateSetting<RankTierInfo>(Settings.rankOnly)

  const [isEnabled, setIsEnabled] = useState(false)
  const [form] = Form.useForm<FormValues>()

  // Initialize local state when info is loaded
  useEffect(() => {
    if (info) {
      setIsEnabled(info.enabled)
      form.setFieldsValue({
        minimumRank: info.minimumRank || 'Herald',
      })
    }
  }, [form, info])

  const handleFormSubmit = (values: FormValues) => {
    // Automatically determine the minimumRankTier based on the selected rank
    const minimumRank = values.minimumRank || 'Herald'
    const minimumRankTier = rankToTier[minimumRank] || rankToTier.Herald

    updateInfo({
      enabled: true, // Form is only enabled when rank only mode is enabled
      minimumRank,
      minimumRankTier,
    })
  }

  const ranks = Object.keys(rankToTier) as Array<keyof typeof rankToTier>

  return (
    <Card title='Rank Only' feature='rankOnly'>
      <div className='subtitle'>Restrict chat to users with a specific rank or higher.</div>
      <div>
        Only allow users who have linked their Dota 2 account and have achieved the minimum rank to
        chat in your channel.
      </div>
      <div className='mt-5 flex items-center space-x-2'>
        <TierSwitch
          hideTierBadge
          settingKey={Settings.rankOnly}
          checked={isEnabled}
          onChange={(checked) => {
            console.log(checked, info?.enabled)
            setIsEnabled(checked)

            const updatedInfo = {
              enabled: checked,
              minimumRank: info?.minimumRank || 'Herald',
              minimumRankTier: info?.minimumRankTier || 10,
            }
            // Only update if the enabled state is actually changing
            if (info?.enabled !== checked) {
              updateInfo(updatedInfo)
            }
          }}
          label='Enable rank only mode'
        />
      </div>

      <div className={clsx(!isEnabled && 'opacity-40', 'mt-6')}>
        <Spin spinning={loading} tip='Loading'>
          <Form
            form={form}
            layout='vertical'
            initialValues={{
              minimumRank: info?.minimumRank || 'Herald',
            }}
            name='rank-only-form'
            onFinish={handleFormSubmit}
          >
            <div className='flex flex-col md:flex-row md:gap-4'>
              <Form.Item colon={false} label='Minimum Rank' name='minimumRank'>
                <Select style={{ width: 150 }}>
                  {ranks.map((rank) => (
                    <Select.Option key={rank} value={rank}>
                      {rank}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </div>
            <Form.Item colon={false} shouldUpdate>
              {() => (
                <Button
                  type='primary'
                  htmlType='submit'
                  disabled={
                    !isEnabled ||
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
      </div>
    </Card>
  )
}
