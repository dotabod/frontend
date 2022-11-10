import { Card } from '@/ui/card'
import { useBaseUrl } from '@/lib/hooks'
import { Display, Image, Snippet } from '@geist-ui/core'
import { useSession } from 'next-auth/react'

export default function OverlayURL() {
  const user = useSession()?.data?.user
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)

  return (
    <Card>
      <Card.Header>
        <Card.Title>OBS Overlay</Card.Title>
        <Card.Description>
          Copy the below settings to your browser source in OBS. Change the URL
          to the one below.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Snippet symbol="" width="500px">
          {copyURL}
        </Snippet>

        <Display shadow caption="Dotabod browser source properties in OBS">
          <Image
            alt="dotabod browser source properties"
            height="433px"
            src="/images/dotabod-obs-config.png"
          />
        </Display>
      </Card.Content>
    </Card>
  )
}
