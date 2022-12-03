import { Card } from '@/ui/card'
import { useBaseUrl } from '@/lib/hooks'
import { Badge, Button, Collapse, Display, Image } from '@geist-ui/core'
import { useSession } from 'next-auth/react'
import { CopyButton } from '@mantine/core'

export default function OverlayURL() {
  const user = useSession()?.data?.user
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)

  return (
    <Card>
      <Collapse
        shadow
        title="Step three. OBS Overlay"
        subtitle="Add a new Browser source to OBS."
      >
        <div className="space-y-2">
          <p>
            Copy and paste your personal URL into the URL field for the browser
            source.
          </p>

          <div className="space-x-2 text-xs">
            <Badge type="error" className="!bg-red-800 !text-xs">
              Warning
            </Badge>
            <span>Do not share or show this URL on stream</span>
          </div>
          <CopyButton value={copyURL}>
            {({ copied, copy }) => (
              <Button type="success" onClick={copy}>
                {copied ? 'Copied!' : 'Copy your URL'}
              </Button>
            )}
          </CopyButton>
        </div>
        <Display shadow caption="Dotabod browser source properties in OBS">
          <Image
            alt="dotabod browser source properties"
            height="450px"
            src="/images/dotabod-obs-config.png"
          />
        </Display>
      </Collapse>
    </Card>
  )
}
