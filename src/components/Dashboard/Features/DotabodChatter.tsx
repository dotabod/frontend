import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Tooltip } from 'antd'
import { TierSwitch } from './TierSwitch'

export default function DotabodChatter() {
  const {
    data: tellChatBets,
    updateSetting: updateTellChatBets,
    loading: l3,
  } = useUpdateSetting(Settings.tellChatBets)

  const { data: tellChatNewMMR, updateSetting: updateChatNewMmr } =
    useUpdateSetting(Settings.tellChatNewMMR)

  return (
    <Card>
      <div className="title">
        <h3>Dotabod</h3>
      </div>

      <div className="mt-5 flex items-center space-x-2">
        <TierSwitch
          settingKey={Settings.tellChatBets}
          label="Tell chat when bets open, close, or get remade due to hero swap or match not scored scenario"
        />
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Tooltip
          placement="bottom"
          title="When you win/lose a match or change your mmr manually"
          className="flex items-center space-x-2"
        >
          <TierSwitch
            settingKey={Settings.tellChatNewMMR}
            label="Tell chat anytime mmr changes"
          />
        </Tooltip>
      </div>
    </Card>
  )
}
