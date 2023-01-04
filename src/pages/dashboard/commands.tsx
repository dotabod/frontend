import CommandsCard from '@/components/Dashboard/Features/CommandsCard'
import DashboardShell from '@/components/DashboardShell'
import { Accordion, Chip, Group } from '@mantine/core'
import { useSession } from 'next-auth/react'
import Head from 'next/head'
import CommandDetail from '../../components/Dashboard/CommandDetail'

export default function CommandsPage() {
  const { status } = useSession()

  return status === 'authenticated' ? (
    <>
      <Head>
        <title>Dotabod | Commands</title>
      </Head>
      <DashboardShell
        subtitle="An exhaustive list of all commands available with the Dotabod chat bot."
        title="Commands"
      >
        <Accordion
          variant="separated"
          styles={{
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
              alignSelf: 'flex-start',
              // styles added to chevron when it should rotate
              '&[data-rotate]': {
                transform: 'rotate(-90deg)',
              },
            },
          }}
        >
          <Group className="mb-4 hidden">
            <Chip>Mod</Chip>
            <Chip>Everyone</Chip>
            <Chip>Enabled</Chip>
            <Chip>Disabled</Chip>
          </Group>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.keys(CommandDetail).map((key) => (
              <CommandsCard key={key} command={CommandDetail[key]} />
            ))}
          </div>
        </Accordion>
      </DashboardShell>
    </>
  ) : null
}
