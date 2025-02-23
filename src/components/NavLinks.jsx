import DiscordSvg from '@/images/logos/discord.svg'
import GithubSvg from '@/images/logos/github.svg'
import StatusSvg from '@/images/logos/status.svg'
import { Tooltip } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import Image from 'next/image'
import { useState } from 'react'

export function NavLinks({ bottom = false }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const additional = []
  if (bottom) {
    additional.push(['Privacy Policy', '/privacy-policy'])
    additional.push(['Terms of Service', '/terms-of-service'])
    additional.push(['Cookie Policy', '/cookies'])
  }

  return [
    ['Features', '/#features'],
    ['Pricing', '/#pricing'],
    ['FAQs', '/#faqs'],
    ...additional,
    ['Status', 'https://status.dotabod.com', StatusSvg, 'Status'],
    ['Github', 'https://github.com/dotabod', GithubSvg, 'Github'],
    ['Discord', 'https://discord.dotabod.com', DiscordSvg, 'Discord'],
  ].map(([label, href, Icon, tooltip], index) => {
    return (
      <Tooltip key={label} title={tooltip} disabled={!tooltip} position='top'>
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          className='relative -mx-3 -my-2 flex items-center rounded-lg px-3 py-2 text-sm !text-gray-300 transition-colors delay-150 hover:text-gray-500 hover:delay-[0ms]'
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <AnimatePresence>
            {hoveredIndex === index && (
              <motion.span
                key={index}
                className='absolute inset-0 rounded-lg bg-gray-700'
                layoutId='hoverBackground'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.15 } }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>

          <span className='relative z-10 flex items-center gap-2'>
            {Icon?.type === 'svg' && <span>{Icon}</span>}

            {Icon?.type !== 'svg' && Icon && (
              <Image
                src={Icon}
                width={18}
                height={18}
                alt={label}
                className='pointer-events-none'
              />
            )}
            {bottom && label}
            {!bottom &&!Icon && label}
          </span>
        </a>
      </Tooltip>
    )
  })
}
