import { Card } from '@/ui/card'
import { Button, Code, Display, Image, Keyboard, Snippet } from '@geist-ui/core'
import {
  ChevronDoubleLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'
import { useSession } from 'next-auth/react'
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
    "provider" "1"
    "map" "1"
    "player" "1"
    "hero" "1"
    "abilities" "1"
    "items" "1"
    "draft" "1"
    "events" "1"
    "buildings" "1"
    "wearables" "0"
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
      <Card.Header>
        <Card.Title>2. Dota GSI File</Card.Title>
        <Card.Description>
          This enables Dotabod to see your games.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4">
          <div>
            i. In Steam, right click Dota 2{' '}
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
            download={`gamestate_integration_dotabod-${user.name}.cfg`}
          >
            <Button type="secondary" className="!normal-case">
              Download config file
            </Button>
          </a>
          <div className="ml-4 space-y-4">
            <div>
              <Display
                shadow
                caption={
                  <>
                    <p>Full path to save config file to:</p>
                    <Code>
                      C:\Program Files (x86)\Steam\steamapps\common\dota 2
                      beta\game\dota\cfg\gamestate_integration
                    </Code>
                  </>
                }
              >
                <Image
                  alt="dotabod browser source properties"
                  height="170px"
                  src="/images/steam-browse-files.png"
                />
              </Display>
            </div>
          </div>

          <div>
            ii. Follow{' '}
            <Link
              className="text-blue-500 hover:text-blue-300"
              href="https://support.overwolf.com/en/support/solutions/articles/9000212745-how-to-enable-game-state-integration-for-dota-2"
              target="_blank"
            >
              these instructions
            </Link>{' '}
            to add <Code>-gamestateintegration</Code> to your Dota 2 launch
            options in Steam.
          </div>

          <div>iii. Restart Steam and Dota 2 client.</div>
        </div>
      </Card.Content>
    </Card>
  )
}
