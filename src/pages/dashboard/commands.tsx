import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import DashboardShell from '@/components/DashboardShell'
import { getValueOrDefault } from '@/lib/DBSettings'
import { useUpdate } from '@/lib/useUpdateSetting'
import {
  Accordion,
  AccordionProps,
  Center,
  Group,
  SegmentedControl,
  TextInput,
} from '@mantine/core'
import { useHotkeys, useInputState, useLocalStorage } from '@mantine/hooks'
import { AnimatePresence, motion } from 'framer-motion'
import { ListX } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import { useState } from 'react'
import CommandDetail from '../../components/Dashboard/CommandDetail'

export default function CommandsPage() {
  const { status } = useSession()
  const [permission, setPermission] = useLocalStorage({
    key: 'command-display-permission',
    defaultValue: 'All',
  })
  const [enabled, setEnabled] = useLocalStorage({
    key: 'command-display-enabled',
    defaultValue: 'All',
  })
  const { data } = useUpdate(`/api/settings`)

  const [isFinding, setIsFinding] = useState(false)
  const [value, setValue] = useState<string[] | string>('')

  useHotkeys([
    [
      'mod+f',
      () => {
        setIsFinding(true)
        setValue(Object.keys(CommandDetail))
      },
      {
        preventDefault: false,
      },
    ],
    [
      'escape',
      () => {
        setIsFinding(false)
        setValue('')
      },
      {
        preventDefault: false,
      },
    ],
  ])

  const [searchTerm, setSearchTerm] = useInputState('')

  const filteredCommands = Object.keys(CommandDetail)
    .filter((command) => {
      const isEnabled = getValueOrDefault(
        CommandDetail[command].key,
        data?.settings
      )
      if (enabled === 'Enabled' && CommandDetail[command].key) {
        return isEnabled === true
      } else if (enabled === 'Disabled') {
        return isEnabled === false
      }
      return true
    })
    .filter((command) => {
      if (permission === 'Mods') {
        return CommandDetail[command].allowed === 'mods'
      } else if (permission === 'Plebs') {
        return CommandDetail[command].allowed === 'all'
      }
      return true
    })
    .filter((command) => {
      let containsStringValue = false
      ;['alias', 'title', 'description', 'cmd'].forEach((key) => {
        if (Array.isArray(CommandDetail[command][key])) {
          CommandDetail[command][key].forEach((alias) => {
            if (alias.toLowerCase().includes(searchTerm.toLowerCase())) {
              containsStringValue = true
            }
          })
        } else if (
          CommandDetail[command][key]
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        ) {
          containsStringValue = true
        }
      })

      if (searchTerm && !containsStringValue) {
        return false
      }
      return true
    })

  const accordionStyles: AccordionProps['styles'] = {
    item: {
      marginTop: '0px !important',
      padding: 0,
      margin: 0,
      // styles added to all items
      backgroundColor: 'transparent',
      borderColor: 'transparent',

      '.subtitle': {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },

      // styles added to expanded item
      '&[data-active]': {
        '& .subtitle': {
          overflow: 'initial',
          textOverflow: 'unset',
          whiteSpace: 'normal',
        },
        backgroundColor: 'transparent',
        borderColor: 'transparent',
      },
    },

    content: {
      padding: 0,
    },

    control: {
      padding: 23,
    },

    chevron: {
      position: 'absolute',
      alignSelf: 'flex-start',
      // styles added to chevron when it should rotate
      '&[data-rotate]': {
        transform: 'rotate(-90deg)',
      },
    },
  }

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Commands</title>
      </Head>
      <DashboardShell
        subtitle="An exhaustive list of all commands available with the Dotabod chat bot."
        title="Commands"
      >
        <div className="flex justify-between">
          <Group className="mb-4">
            <SegmentedControl
              value={permission}
              onChange={setPermission}
              data={['All', 'Mods', 'Plebs']}
              color="blue"
            />
            <SegmentedControl
              value={enabled}
              onChange={setEnabled}
              data={['All', 'Enabled', 'Disabled']}
              color="blue"
            />
          </Group>
          <TextInput
            placeholder="Search commands..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
        <Accordion
          multiple={isFinding}
          value={value}
          onChange={setValue}
          variant="separated"
          styles={accordionStyles}
        >
          {filteredCommands.length < 1 && (
            <Center style={{ height: 200 }}>
              <div className="flex flex-col items-center text-center text-dark-300">
                <ListX size={80} />
                <p>Could not find any matching commands.</p>
              </div>
            </Center>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {filteredCommands.map((key) => (
                <motion.div layout key={key}>
                  <CommandsCard id={key} command={CommandDetail[key]} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </Accordion>
      </DashboardShell>
    </>
  ) : null
}
