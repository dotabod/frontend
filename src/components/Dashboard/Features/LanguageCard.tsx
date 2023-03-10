import useLanguageTranslations, {
  CrowdinLanguage,
  getLanguageProgress,
} from '@/lib/hooks/useLanguageTranslation'
import { useUpdateLocale } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'
import { Button, Progress, Select, Spin } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import Link from 'next/link'
import { forwardRef } from 'react'

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string
  translation?: CrowdinLanguage
  code: string
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ code, translation, label, ...others }: ItemProps, ref) => (
    <div
      ref={ref}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-2"
      {...others}
    >
      <div className="flex items-center space-x-2">
        <img
          width={30}
          height={30}
          alt={label}
          src={`https://d2gma3rgtloi6d.cloudfront.net/12e76b30/images/flags/small/${code}.png`}
        />
        <span>{label}</span>
      </div>
      {!isNaN(translation?.data?.translationProgress) && (
        <div>
          <span
            className={clsx(
              !translation?.data?.translationProgress && 'text-gray-600',
              translation?.data?.translationProgress > 0 &&
                translation?.data?.translationProgress < 80 &&
                'text-amber-600',
              translation?.data?.translationProgress > 80 && 'text-green-400'
            )}
          >
            {translation?.data?.translationProgress}% translated
          </span>
        </div>
      )}
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

  const { isLoading, data } = useLanguageTranslations({
    languageId: localeOption?.locale,
  })
  const languageProgress = getLanguageProgress(
    data?.languageProgress,
    localeOption?.locale
  )
  const arr = (
    data?.languageProgress ? Object.values(data?.languageProgress) : []
  ).map((x) => {
    const fullLanguage = Object.values(data?.project?.targetLanguages).find(
      (t) => t.id === x.data.languageId
    )

    return {
      value: fullLanguage.locale,
      id: fullLanguage.id,
      label: data?.project?.targetLanguages ? fullLanguage.name : 'Unknown',
    }
  })

  arr.push({
    value: 'en',
    id: 'en-US',
    label: 'English',
  })

  arr.sort((a, b) => {
    const nameA = a.label.toUpperCase() // ignore upper and lowercase
    const nameB = b.label.toUpperCase() // ignore upper and lowercase
    if (nameA < nameB) {
      return -1
    }
    if (nameA > nameB) {
      return 1
    }
    return 0
  })

  const UsedBy = () => (
    <span className="space-x-1">
      <span>Used by</span>
      {isLoading ? (
        <Spin size="small" className="!mr-2" />
      ) : (
        <span>
          {data?.total
            ? `${data?.total.toLocaleString()}`
            : `${data?.percentage?.toLocaleString()}% of`}
        </span>
      )}
      <span>dotabods</span>
      <Image
        className="inline align-bottom"
        src="/images/emotes/peepofat.gif"
        height={28}
        width={28}
        alt="peepofat"
      />
    </span>
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
        <Select
          loading={loadingLocale || isLoading}
          placeholder="Language selector"
          className="w-full transition-all"
          options={arr.map((x) => ({
            value: x.value,
            label: (
              <SelectItem
                label={x.label}
                code={x.id}
                translation={getLanguageProgress(data?.languageProgress, x.id)}
              />
            ),
          }))}
          value={localeOption?.locale}
          onChange={(value) => updateLocale(value)}
        />
      </div>

      {languageProgress?.data ? (
        <div className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <span>
              {languageProgress?.data?.translationProgress}% translated
            </span>
            {data?.total === 1 && (
              <span>
                You&apos;re the only one using this language
                <Image
                  className="inline align-bottom"
                  src="https://cdn.7tv.app/emote/6293b16a3fae4eb13f5e5f60/2x.webp"
                  height={28}
                  width={28}
                  alt="lonely"
                />
              </span>
            )}
            {data?.total !== 1 && <UsedBy />}
          </div>
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
                <Button>Found a translation error?</Button>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <UsedBy />
      )}
    </Card>
  )
}
