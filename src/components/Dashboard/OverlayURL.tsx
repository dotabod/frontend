import { Card } from '@/ui/card'
import { useBaseUrl } from '@/lib/hooks'
import { Collapse, Display, Image, Snippet } from '@geist-ui/core'
import { useSession } from 'next-auth/react'

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
        Add a new Browser source to OBS. Copy the settings shown below. Change
        the URL to:
        <Snippet
          symbol=""
          text={copyURL}
          className="!max-w-[500px] overflow-hidden"
        />
        <Display shadow caption="Dotabod browser source properties in OBS">
          <Image
            alt="dotabod browser source properties"
            height="433px"
            src="/images/dotabod-obs-config.png"
          />
        </Display>
      </Collapse>
    </Card>
  )
}
