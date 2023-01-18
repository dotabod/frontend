import clsx from 'clsx'
import { Badge } from '../../Badge'
import { Card } from '../../Card'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { Settings } from '@/lib/defaultSettings'

export const Rankbadge = ({
  image,
  leaderboard = false,
  rank,
  mainScreen = false,
  ...props
}) => {
  const res = useTransformRes()
  const { data: isEnabled } = useUpdateSetting(Settings['mmr-tracker'])

  if (!isEnabled) return null

  const className = clsx(
    !mainScreen &&
      (leaderboard || ['80.png', '92.png'].includes(image) ? '-mt-1' : '-mt-3'),
    'font-mono'
  )
  const style = {
    fontSize: res ? res({ h: 22 }) : 16,
  }

  const Numbers = () =>
    leaderboard || rank ? (
      <span className={className} style={style}>
        {leaderboard && '#'}
        {rank}
      </span>
    ) : null

  if (mainScreen) {
    return (
      <div
        {...props}
        className="flex h-full items-center space-x-1 text-[#e4d98d]"
      >
        <Badge
          res={res}
          width={res({ w: 75 })}
          height={res({ h: 75 })}
          image={image}
          style={{
            marginTop: res({ h: 20 }),
          }}
        />
        <Numbers />
      </div>
    )
  }
  return (
    <Card className="rounded-bl-none" {...props}>
      <Badge res={res} image={image} />
      <Numbers />
    </Card>
  )
}
