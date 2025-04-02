import { Tooltip } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { GiftIcon } from 'lucide-react'

export function NavLinks({ bottom = false }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)

  const additional = []
  if (bottom) {
    additional.push(['Privacy Policy', '/privacy-policy'])
    additional.push(['Terms of Service', '/terms-of-service'])
    additional.push(['Cookie Policy', '/cookies'])
    additional.push(['Discord', 'https://discord.dotabod.com'])
  }

  return [
    ['Features', '/#features'],
    ['Pricing', '/#pricing'],
    ['FAQs', '/#faqs'],
    ['Blog', '/blog'],
    ['Gift Pro', '/gift', 'Gift Dotabod Pro to your favorite streamer'],
    ...additional,
  ].map(([label, href, tooltip], index) => {
    const isGiftLink = label === 'Gift Pro'

    return (
      <Tooltip key={label} title={tooltip} disabled={!tooltip} position='top'>
        <a
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          className='relative -mx-3 -my-2 flex items-center rounded-lg px-3 py-2 text-sm text-gray-300! transition-colors delay-150 hover:text-gray-500 hover:delay-[0ms]'
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
            {isGiftLink && <GiftIcon className="h-4 w-4" />}
            {label}
          </span>
        </a>
      </Tooltip>
    )
  })
}
