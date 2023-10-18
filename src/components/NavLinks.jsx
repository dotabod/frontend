import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import DiscordSvg from '@/images/logos/discord.svg'
import GithubSvg from '@/images/logos/github.svg'
import TwitterSvg from '@/images/logos/twitter.svg'
import Image from 'next/image'
import { Tooltip } from 'antd'

export function NavLinks({ bottom = false }) {
  let [hoveredIndex, setHoveredIndex] = useState(null)

  return [
    ['Features', '#features'],
    ['Pricing', '#pricing'],
    ['FAQs', '#faqs'],
    ['Github', 'https://github.com/dotabod', GithubSvg, 'Github'],
    ['Twitter', 'https://twitter.com/dotabod_', TwitterSvg, 'Twitter'],
    ['Discord', 'https://discord.dotabod.com', DiscordSvg, 'Discord'],
    [
      'Support the project',
      'https://ko-fi.com/dotabod',
      <svg
        key="heart"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-5 w-5 text-red-500"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>,
      'Support the project',
    ],
    // ['Twitch', 'https://twitch.tv/dotabod/about', TwitchSvg],
  ].map(([label, href, Icon, tooltip], index) => {
    return (
      <Tooltip key={label} title={tooltip} disabled={!tooltip} position="top">
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          className="relative -my-2 -mx-3 flex items-center rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors delay-150 hover:text-gray-900 hover:delay-[0ms]"
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === index && (
              <motion.span
                key={index}
                className="absolute inset-0 rounded-lg bg-gray-100"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>

          <span className="relative z-10">
            {Icon?.type === 'svg' && <span>{Icon}</span>}

            {Icon?.type !== 'svg' && Icon && (
              <Image
                src={Icon}
                width={18}
                height={18}
                alt={label}
                className="pointer-events-none"
              />
            )}
            {!Icon && label}
          </span>
        </a>
      </Tooltip>
    )
  })
}
