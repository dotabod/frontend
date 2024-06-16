import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Switch, Tooltip } from 'antd'

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
        <Switch
          loading={l3}
          onChange={updateTellChatBets}
          checked={tellChatBets}
        />
        <span>
          Tell chat when bets open, close, or get remade due to hero swap or
          match not scored scenario
        </span>
      </div>
      <div className="mt-5 flex items-center space-x-2">
        <Tooltip
          placement="bottom"
          title="When you win/lose a match or change your mmr manually"
          className="flex items-center space-x-2"
        >
          <Switch checked={tellChatNewMMR} onChange={updateChatNewMmr} />
          <span>Tell chat anytime mmr changes</span>
        </Tooltip>
      </div>
    </Card>
  )
}
