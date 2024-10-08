import clsx from 'clsx'
import { useTranslation } from 'next-i18next'

export const Card = ({ children = null, className = '', ...props }) => {
  const { t } = useTranslation('common')

  return (
    <div
      className={clsx(
        className,
        'flex flex-col items-center rounded bg-slate-700/50 p-1 text-white/90'
      )}
      {...props}
    >
      {t(children)}
    </div>
  )
}
