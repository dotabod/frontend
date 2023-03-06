import useLanguageTranslations, {
  CrowdinLanguage,
  getLanguageProgress,
} from '@/lib/hooks/useLanguageTranslation'
import { useUpdateLocale } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Progress, Select } from 'antd'
import clsx from 'clsx'
import Link from 'next/link'
import { forwardRef } from 'react'

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string
  translation?: CrowdinLanguage
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ translation, label, ...others }: ItemProps, ref) => (
    <div
      ref={ref}
      className="flex items-center justify-between space-x-2"
      {...others}
    >
      <div className="flex items-center space-x-2">
        <span>{label}</span>
      </div>
      <div
        className={clsx(
          (!translation?.data?.languageId ||
            translation?.data?.languageId === 'en') &&
            'hidden'
        )}
      >
        {translation?.data?.translationProgress < 80 ? (
          <span className="text-red-600">
            {translation?.data?.translationProgress}% translated
          </span>
        ) : (
          <span className="text-green-600">
            {translation?.data?.translationProgress}% translated
          </span>
        )}
      </div>
    </div>
  )
)

SelectItem.displayName = 'SelectItem'

export default function LanguageCard() {
  const {
    data: localeOption,
    loading: loadingLocale,
    update: updateLocale,
  } = useUpdateLocale()

  const data = useLanguageTranslations()
  const languageProgress = getLanguageProgress(
    data?.progress,
    localeOption?.locale
  )
  const arr = data?.progress ? Object.values(data?.progress) : []
  console.log(arr, data)

  return (
    <Card>
      <div className="title">
        <h3>Language</h3>
      </div>
      <div className="subtitle mb-2">
        The @dotabod Twitch chat bot will speak in this language.
      </div>

      <div>
        <Select
          loading={loadingLocale}
          placeholder="Language selector"
          className="w-full transition-all"
          options={arr.map((x: CrowdinLanguage) => ({
            value: x.data.languageId,
            label: (
              <SelectItem
                label={x.data.languageId}
                translation={getLanguageProgress(
                  data?.progress,
                  x.data.languageId
                )}
              />
            ),
          }))}
          value={localeOption?.locale}
          onChange={(value) => updateLocale(value)}
        />
      </div>

      {languageProgress?.data && (
        <div className="mt-4">
          <div>{languageProgress?.data?.translationProgress}% translated</div>
          <Progress
            showInfo={false}
            percent={languageProgress?.data?.translationProgress}
            size="small"
          />
          <div className="flex flex-row items-center space-x-4">
            {languageProgress?.data?.translationProgress < 100 ? (
              <Link
                href={`https://crowdin.com/translate/dotabod/all/en-${languageProgress?.data?.languageId}?filter=basic&value=0`}
                target="_blank"
                passHref
              >
                <Button>Help finish translation</Button>
              </Link>
            ) : (
              <Link
                href={`https://crowdin.com/translate/dotabod/all/en-${languageProgress?.data?.languageId}?filter=basic&value=0`}
                target="_blank"
                passHref
              >
                <Button>Help with proofreading</Button>
              </Link>
            )}
            <Link
              href="https://crowdin.com/project/dotabod"
              target="_blank"
              passHref
            >
              <Button>View all translations</Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}
