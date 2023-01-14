import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import DiscordSvg from '@/images/logos/discord.svg'
import GithubSvg from '@/images/logos/github.svg'
import Image from 'next/image'

export function NavLinks({ bottom = false }) {
  let [hoveredIndex, setHoveredIndex] = useState(null)

  return [
    ['Features', '#features'],
    ['Pricing', '#pricing'],
    ['FAQs', '#faqs'],
    ['Github', 'https://github.com/dotabod', GithubSvg],
    ['Discord', 'https://discord.dotabod.com', DiscordSvg],
    // ['Twitch', 'https://twitch.tv/dotabod/about', TwitchSvg],
  ].map(([label, href, Icon], index) => (
    <Link
      key={label}
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
        {Icon && (
          <Image
            src={Icon}
            width={18}
            height={18}
            alt="dota logo"
            className="pointer-events-none"
          />
        )}
        {!Icon && label}
      </span>
    </Link>
  ))
}
