import { Switch } from 'antd'
import { TierBadge } from './TierBadge'
import type { SettingKeys } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'

interface TierSwitchProps {
  settingKey: SettingKeys
  label?: React.ReactNode
  className?: string
}

export function TierSwitch({ settingKey, label, className }: TierSwitchProps) {
  const {
    data: enabled,
    updateSetting,
    tierAccess,
  } = useUpdateSetting(settingKey)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Switch
        checked={enabled}
        onChange={updateSetting}
        disabled={!tierAccess.hasAccess}
      />
      {label && <span>{label}</span>}
      {!tierAccess.hasAccess && (
        <TierBadge requiredTier={tierAccess.requiredTier} />
      )}
    </div>
  )
}
