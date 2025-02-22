import clsx from 'clsx'
import type { ReactNode } from 'react'
import { MagicCard } from './magic-card'

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) => {
  return (
    <div className={clsx('grid w-full auto-rows-[22rem] grid-cols-3 gap-4', className)}>
      {children}
    </div>
  )
}

type BentoGridItemProps = {
  name: ReactNode
  className: string
  background?: ReactNode
  Icon?: any
  description: ReactNode
  href?: string
  cta?: ReactNode
  disableHover?: boolean
}

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  disableHover = true,
}: BentoGridItemProps) => (
  <div
    className={clsx(
      'group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl',
      'transform-gpu bg-gray-950 [border:1px_solid_rgba(255,255,255,.1)] [box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]',
      className,
    )}
  >
    <MagicCard gradientColor='#262626'>
      {background && <div>{background}</div>}
      <div
        className={clsx('z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300', {
          'group-hover:-translate-y-10': !disableHover,
        })}
      >
        {Icon && (
          <Icon
            className={clsx(
              'h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out',
              {
                'group-hover:scale-75': !disableHover,
              },
            )}
          />
        )}
        <h3 className='text-xl font-semibold text-neutral-300 pointer-events-auto'>{name}</h3>
        <div className='max-w-lg text-neutral-400'>{description}</div>
      </div>

      {cta && (
        <div
          className={clsx(
            'absolute bottom-0 flex w-full transform-gpu flex-row items-center p-4 transition-all duration-300',
            {
              'translate-y-10 opacity-0': !disableHover,
              'group-hover:translate-y-0 group-hover:opacity-100': !disableHover,
            },
          )}
        >
          <div className='pointer-events-auto'>{cta}</div>
        </div>
      )}
      <div
        className={clsx('absolute inset-0 transform-gpu transition-all duration-300', {
          'group-hover:bg-neutral-800/10': !disableHover,
        })}
      />
    </MagicCard>
  </div>
)

export { BentoCard, BentoGrid, type BentoGridItemProps }
