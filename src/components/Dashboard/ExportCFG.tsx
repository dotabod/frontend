import { Card } from '@/ui/card'
import { Button, Code, Snippet } from '@geist-ui/core'
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
          <div>i. Download the config file and save it to the path below.</div>

          <div className="ml-4 space-y-4">
            <div>
              <Snippet
                symbol=""
                text="C:\Program Files (x86)\Steam\steamapps\common\dota 2
            beta\game\dota\cfg\gamestate_integration\"
                width="750px"
              />
              <p className="mt-2 text-xs">
                If you do not have a <Code>\cfg\gamestate_integration\</Code>{' '}
                folder, create it.
              </p>
            </div>
            <a
              className="block w-48"
              href={url}
              download={`gamestate_integration_dotabod-${user.name}.cfg`}
            >
              <Button type="secondary" className="!normal-case">
                Download config file
              </Button>
            </a>
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
