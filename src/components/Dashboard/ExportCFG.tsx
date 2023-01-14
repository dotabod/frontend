import { Card } from '@/ui/card'
import { Button, Code, Collapse, Display, Keyboard } from '@geist-ui/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import Link from 'next/link'

export default function ExportCFG() {
  const user = useSession()?.data?.user
  const fileData = `"Dotabod Configuration"
{
  "uri" "${process.env.NEXT_PUBLIC_GSI_WEBSOCKET_URL}"
  "timeout" "5.0"
  "buffer" "0.5"
  "throttle" "0.5"
  "heartbeat" "30.0"
  "data"
  {
    "abilities" "1"
    "buildings" "1"
    "events" "1"
    "hero" "1"
    "items" "1"
    "map" "1"
    "player" "1"
    "provider" "1"
    "wearables" "1"
  }
  "auth"
  {
    "token" "${user?.id}"
  }
}
`
  const blob = new Blob([fileData], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  return (
    <Card>
      <Collapse
        shadow
        title="Step two. Dota GSI"
        subtitle="Enable Dotabod to see your games."
      >
        <div className="space-y-4">
          <div>
            1. In Steam, right click Dota 2{' '}
            <ChevronRightIcon height={12} className="inline" /> Manage{' '}
            <ChevronRightIcon height={12} className="inline" /> Browse local
            files. Then open the folder to{' '}
            <Keyboard>\game\dota\cfg\gamestate_integration\</Keyboard>
          </div>
          <p className="ml-4 text-xs">
            If you do not have a{' '}
            <Keyboard className="!text-xs">gamestate_integration</Keyboard>{' '}
            folder, create it.
          </p>
          <a
            className="ml-4 block w-48"
            href={url}
            download={`gamestate_integration_dotabod.cfg`}
          >
            <Button type="success" className="!normal-case">
              Download config file
            </Button>
          </a>
          <div className="space-y-4">
            <Display
              caption={
                <>
                  <p>Full path to save config file to:</p>
                  <Code>
                    ...\Steam\steamapps\common\dota 2
                    beta\game\dota\cfg\gamestate_integration\
                  </Code>
                </>
              }
              shadow
            >
              <Image
                unoptimized
                alt="steam gamestate folder"
                height={608}
                width={518}
                src="/images/setup/how-to-create-cfg.gif"
              />
            </Display>
          </div>

          <div>
            2. Follow{' '}
            <Link
              className="text-blue-400 hover:text-blue-300"
              href="https://support.overwolf.com/en/support/solutions/articles/9000212745-how-to-enable-game-state-integration-for-dota-2"
              target="_blank"
            >
              these instructions
            </Link>{' '}
            to add <Code>-gamestateintegration</Code> to your Dota 2 launch
            options in Steam.
          </div>

          <div>3. Restart Dota 2.</div>
        </div>
      </Collapse>
    </Card>
  )
}
