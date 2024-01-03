import React, { CSSProperties } from 'react'
import { Logomark } from 'src/components/Logo'
import { Settings } from '@/lib/defaultSettings'
import { useUpdateSetting } from '@/lib/hooks/useUpdateSetting'
import { WinChance } from '@/lib/hooks/useSocket'
import { secondsToDuration, motionProps } from '@/ui/utils'
import { motion } from 'framer-motion'
import { useTransformRes } from '@/lib/hooks/useTransformRes'
import { TextWithEmotes } from './TextWithEmotes'
import { AnimatedNumber } from './AnimatedNumber'
import clsx from 'clsx'

interface CustomStyle extends CSSProperties {
  '--value'?: number
}

const SeparatorImg = ({ pos, children, ...props }) => (
  <div
    className="relative bottom-[15px] duration-[2s] ease-in-out"
    style={{
      left: `calc(${Math.min(pos, 98)}% - 15px)`,
    }}
  >
    <Logomark
      {...props}
      className="rounded-full bg-black shadow-[0_0_10px_0_rgba(0,0,0,0.5)]"
      style={{
        height: '30px',
        width: '30px',
      }}
    />
    <div className="flex space-x-2">{children}</div>
  </div>
)

const FillRadiant = ({ width }) => (
  <div
    className="rounded-l bg-gradient-to-r from-green-500 to-lime-500 text-right"
    style={{ width: `${width}%`, transition: 'width 1.5s ease-in-out' }}
  />
)

const FillDire = ({ width }) => (
  <div
    className="rounded-r bg-gradient-to-r from-red-600 to-red-500"
    style={{ width: `${width}%`, transition: 'width 1.5s ease-in-out' }}
  />
)

const Text = ({ pos = null, className = '', children }) => (
  <div
    className={clsx(
      `text-shadow relative flex translate-x-[-50%] flex-col text-center text-sm text-white duration-[2s] ease-in-out`,
      className,
    )}
    style={{ left: pos ? `${Math.min(pos, 98)}%` : 0 }}
  >
    {children}
  </div>
)

export const WinProbability = ({
  radiantWinChance,
}: {
  radiantWinChance: WinChance
}) => {
  const { data: isEnabled } = useUpdateSetting(Settings.winProbabilityOverlay)
  const res = useTransformRes()

  if (!isEnabled || !radiantWinChance) {
    return null
  }

  // Make sure radiantWinChance.value is between 0 and 100
  radiantWinChance.value = Math.min(Math.max(radiantWinChance.value, 0), 100)

  return (
    <motion.div id="win-probability" key="wp-overlay-inner" {...motionProps}>
      <div
        className={`relative rounded transition-[top_0.2s_ease-out,_opacity_0.2s_ease] ${
          radiantWinChance.visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Text pos={radiantWinChance.value}>
          <h1
            className="font-outline-2 text-center font-bold text-slate-50"
            style={{
              fontSize: res({ h: 20 }),
            }}
          >
            <TextWithEmotes emotes={[]} text="Win probability" />
          </h1>
        </Text>
        <div className="flex h-[5px] shadow-[0_0_10px_0_rgba(0,0,0,0.5)]">
          <FillRadiant width={radiantWinChance.value} />
          <FillDire width={100 - radiantWinChance.value} />
        </div>
        <SeparatorImg alt="logo" pos={radiantWinChance.value}>
          <Text className="font-outline-2 !flex-row text-center font-bold !text-green-400">
            <AnimatedNumber
              from={100 - radiantWinChance.value}
              to={radiantWinChance.value}
            />
            <span>%</span>
          </Text>
          <Text className="font-outline-2 !flex-row text-center font-bold !text-red-400">
            <AnimatedNumber
              from={radiantWinChance.value}
              to={100 - radiantWinChance.value}
            />
            <span>%</span>
          </Text>
        </SeparatorImg>

        <Text className="bottom-[20px]" pos={radiantWinChance.value}>
          <span className="font-outline-2 text-slate-50">
            {secondsToDuration(radiantWinChance.time)} (2m delay)
          </span>
        </Text>
      </div>
    </motion.div>
  )
}
