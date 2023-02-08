import { Menu } from '@mantine/core'
import Link from 'next/link'
import clsx from 'clsx'
import KofiIcon from '@/images/logos/Kofi'
import Image from 'next/image'
import BoostyLogo from '@/images/logos/BoostyIcon.png'
import { HeartIcon } from '@heroicons/react/24/outline'

export const DonationMenu = ({ trigger = null }) => (
  <Menu trigger="hover" openDelay={100} closeDelay={100}>
    <Menu.Target>
      {trigger ? (
        trigger
      ) : (
        <Link
          href="Dashboard#"
          onClick={(e) => e.preventDefault()}
          className={clsx(
            'text-dark-300 hover:fill-dark-100 hover:text-dark-100',
            'group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors'
          )}
        >
          <HeartIcon
            className={clsx(
              `!text-red-500 group-hover:text-white`,
              'mr-3 h-6 w-6 flex-shrink-0'
            )}
            aria-hidden="true"
          />
          Support the project
        </Link>
      )}
    </Menu.Target>

    <Menu.Dropdown>
      <Menu.Item
        component="a"
        href="https://ko-fi.com/dotabod"
        target="_blank"
        icon={<KofiIcon className="h-6 w-6" />}
      >
        Support on Ko-fi
      </Menu.Item>
      <Menu.Item
        component="a"
        href="https://boosty.to/dotabod"
        target="_blank"
        icon={<Image src={BoostyLogo} height={24} width={24} alt="boosty" />}
      >
        Boosty (for Russians{' '}
        <Image
          className="inline"
          src="https://cdn.7tv.app/emote/603cb5a2c20d020014423c65/2x.webp"
          height={24}
          width={24}
          alt="KKomrade"
        />
        )
      </Menu.Item>
    </Menu.Dropdown>
  </Menu>
)
