import { useUpdateLocale } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Select } from 'antd'
import { localeOptions } from '@/components/Dashboard/locales'
import { FlagProps } from 'mantine-flagpack/declarations/create-flag'
import { forwardRef } from 'react'
import { USFlag } from 'mantine-flagpack'

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  Flag: (props: FlagProps) => JSX.Element
  label: string
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ Flag, label, ...others }: ItemProps, ref) => (
    <div ref={ref} className="flex items-center space-x-2" {...others}>
      <Flag w={24} radius={2} />
      <span className="ml-2">{label}</span>
    </div>
  )
)

SelectItem.displayName = 'SelectItem'

const CurrentFlag = (props) => {
  const Flag = localeOptions.find((x) => x.value === props.flag)?.Flag || USFlag
  return <Flag {...props} />
}

export default function LanguageCard() {
  const {
    data: localeOption,
    loading: loadingLocale,
    update: updateLocale,
  } = useUpdateLocale()

  const flagIcon = (
    <CurrentFlag
      flag={localeOption?.locale}
      w={25}
      h={17}
      radius={2}
      className="pl-2"
    />
  )

  return (
    <Card>
      <div className="title">
        <h3>Language</h3>
      </div>
      <div className="subtitle mb-2">
        The @dotabod Twitch chat bot will speak in this language.
      </div>

      <div>
        {!loadingLocale && (
          <Select
            placeholder="Language selector"
            className="max-w-fit transition-all"
            options={localeOptions.map((x) => ({
              ...x,
              label: <SelectItem Flag={x.Flag} label={x.label} />,
            }))}
            defaultValue={localeOption?.locale}
            onChange={(value) => updateLocale(value)}
          />
        )}
        {loadingLocale && (
          <Select
            placeholder="Language selector"
            className="max-w-fit"
            disabled
          />
        )}
      </div>
    </Card>
  )
}
