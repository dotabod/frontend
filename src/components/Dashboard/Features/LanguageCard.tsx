import useLanguageTranslations, {
  CrowdinLanguage,
  crowdinToLocale,
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
  code: string
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ code, translation, label, ...others }: ItemProps, ref) => (
    <div
      ref={ref}
      className="flex items-center justify-between space-x-2"
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

  const { isLoading, data } = useLanguageTranslations()
  const languageProgress = getLanguageProgress(
    data?.languageProgress,
    localeOption?.locale
  )
  const arr = (
    data?.languageProgress ? Object.values(data?.languageProgress) : []
  ).map((x) => ({
    ...x,
    data: {
      ...x.data,
      languageId: crowdinToLocale(x.data.languageId),
      name: data?.project?.targetLanguages
        ? Object.values(data?.project?.targetLanguages).find(
            (t) => t.id === x.data.languageId
          ).name
        : 'Unknown',
    },
  }))

  arr.push({
    data: {
      languageId: 'en',
      name: 'English',
    },
  })

  arr.sort((a, b) => {
    const nameA = a.data.name.toUpperCase() // ignore upper and lowercase
    const nameB = b.data.name.toUpperCase() // ignore upper and lowercase
    if (nameA < nameB) {
      return -1
    }
    if (nameA > nameB) {
      return 1
    }
    return 0
  })

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
          options={arr.map((x: CrowdinLanguage) => ({
            value: x.data.languageId,
            label: (
              <SelectItem
                label={
                  data?.project?.targetLanguages
                    ? Object.values(data?.project?.targetLanguages).find(
                        (t) => crowdinToLocale(t.id) === x.data.languageId
                      )?.name || 'English'
                    : 'English'
                }
                code={
                  data?.project?.targetLanguages
                    ? Object.values(data?.project?.targetLanguages).find(
                        (t) => crowdinToLocale(t.id) === x.data.languageId
                      )?.id || 'en-US'
                    : 'en-US'
                }
                translation={getLanguageProgress(
                  data?.languageProgress,
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
