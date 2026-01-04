import { Button, Progress, Select, Spin } from 'antd'
import clsx from 'clsx'
import Image from 'next/image'
import { forwardRef } from 'react'
import NumberTicker from '@/components/magicui/number-ticker'
import useLanguageTranslations, {
  type CrowdinLanguage,
  getLanguageProgress,
} from '@/lib/hooks/useLanguageTranslation'
import { useUpdateLocale } from '@/lib/hooks/useUpdateSetting'
import { Card } from '@/ui/card'

interface ItemProps extends React.ComponentPropsWithoutRef<'div'> {
  label: string
  translation?: CrowdinLanguage | undefined
  code: string
}

const SelectItem = forwardRef<HTMLDivElement, ItemProps>(
  ({ code, translation, label, ...others }: ItemProps, ref) => (
    <div
      ref={ref}
      className='flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-2'
      {...others}
    >
      <span>{label}</span>
      {!Number.isNaN(Number(translation?.data?.translationProgress)) && (
        <div style={{ width: 170 }} className='min-w-fit'>
          <span
            className={clsx(
              'w-11',
              !translation?.data?.translationProgress && 'text-gray-600',
              translation?.data?.translationProgress &&
                translation?.data?.translationProgress > 0 &&
                translation?.data?.translationProgress < 80 &&
                'text-amber-600',
              translation?.data?.translationProgress &&
                translation?.data?.translationProgress > 80 &&
                'text-green-400',
            )}
          >
            <Progress size='small' percent={translation?.data?.translationProgress} />
          </span>
        </div>
      )}
    </div>
  ),
)

SelectItem.displayName = 'SelectItem'

export default function LanguageCard() {
  const { data: localeOption, loading: loadingLocale, update: updateLocale } = useUpdateLocale()

  const { isLoading, data } = useLanguageTranslations({
    languageId: localeOption?.locale,
  })
  const languageProgress = getLanguageProgress(
    data && {
      ...data,
      total: data.total ?? 0, // Provide default value of 0 for undefined total
    },
    localeOption?.locale,
  )

  const arr = (data?.languageProgress ? Object.values(data.languageProgress) : []).map((x) => {
    const fullLanguage = data?.project?.targetLanguages?.find((t) => t.id === x.data.languageId)

    if (!fullLanguage) {
      return {
        value: 'en',
        id: 'en-US',
        label: 'English',
      }
    }

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
    <div className='space-x-1 flex flex-row items-center mb-2'>
      <span>Used by</span>
      {isLoading ? (
        <Spin size='small' />
      ) : (
        <>
          <NumberTicker value={data?.total || data?.percentage || 0} />
          {!data?.total && data?.percentage && '% of '}
        </>
      )}
      <span>dotabods</span>
      <Image
        className='inline align-bottom'
        src='/images/emotes/peepofat.gif'
        height={28}
        width={28}
        unoptimized
        alt='peepofat'
      />
    </div>
  )

  return (
    <Card>
      <div className='title'>
        <h3>Language</h3>
      </div>
      <div className='subtitle mb-2'>The @dotabod Twitch chat bot will speak in this language.</div>
      {languageProgress?.data ? (
        <div className='mt-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
            <span>
              <NumberTicker value={languageProgress?.data?.translationProgress || 0} />
              <span>% translated</span>
            </span>
            {data?.total === 1 && (
              <span>
                You&apos;re the only one using this language
                <Image
                  className='inline align-bottom'
                  src='https://cdn.7tv.app/emote/6293b16a3fae4eb13f5e5f60/2x.webp'
                  height={28}
                  width={28}
                  alt='lonely'
                />
              </span>
            )}
            {data?.total !== 1 && <UsedBy />}
          </div>
        </div>
      ) : (
        <UsedBy />
      )}
      <div>
        <Select
          showSearch
          filterOption={(input, option) =>
            option
              ? (arr.find((a) => a.value === option.value)?.label ?? '')
                  .toLowerCase()
                  .includes(input?.toLowerCase() ?? '')
              : false
          }
          loading={loadingLocale || isLoading}
          placeholder='Language selector'
          className='w-full transition-all'
          options={arr.map((x) => ({
            value: x.value,
            label: (
              <SelectItem
                label={x.label}
                code={x.id}
                translation={getLanguageProgress(
                  data && {
                    ...data,
                    total: data.total ?? 0,
                  },
                  x.value,
                )}
              />
            ),
          }))}
          value={localeOption?.locale}
          onChange={(value) => updateLocale(value)}
        />
      </div>

      <div className='mt-2'>
        <Button
          loading={isLoading}
          href='https://crowdin.com/project/dotabod'
          target='_blank'
          type='link'
        >
          {languageProgress?.data?.translationProgress != null &&
          languageProgress.data.translationProgress < 100
            ? 'Help complete on Crowdin'
            : 'Fix locale issues on Crowdin'}
        </Button>
      </div>
    </Card>
  )
}
