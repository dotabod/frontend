import { Card } from '@/ui/card'
import { Button, Code, Display, Keyboard } from '@geist-ui/core'
import { ChevronRightIcon } from '@heroicons/react/24/outline'
import { Accordion } from '@mantine/core'
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
    <Accordion.Item value="exportcfg">
      <Card className="p-0">
        <Accordion.Control>
          <div className="title command">
            <h3>Step two. Dota 2 integration</h3>
          </div>
          <div className="subtitle">Enable Dotabod to see your games</div>
        </Accordion.Control>

        <Accordion.Panel>
          <div className="space-y-4 px-8 pb-8 text-sm text-dark-300">
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
                <video width="508" height="504" controls autoPlay muted loop>
                  <source
                    src="/images/setup/how-to-create-cfg.mp4"
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>
              </Display>
            </div>

            <div>
              2. Add <Code>-gamestateintegration</Code> to your Dota 2 launch
              options in Steam.{' '}
              <Link
                className="text-blue-400 hover:text-blue-300"
                href="https://support.overwolf.com/en/support/solutions/articles/9000212745-how-to-enable-game-state-integration-for-dota-2"
                target="_blank"
              >
                Instructions here
              </Link>
              , or follow the video below.
            </div>

            <Display shadow>
              <video width="482" height="392" controls autoPlay muted loop>
                <source
                  src="/images/setup/how-to-gsi-properties.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </Display>

            <div>3. Restart Dota 2.</div>
          </div>
        </Accordion.Panel>
      </Card>
    </Accordion.Item>
  )
}
