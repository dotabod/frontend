import { Card } from '@/ui/card'
import { DisableButton } from '@/components/DisableButton'
import { Display, Image } from '@geist-ui/core'

export default function PicksCard() {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Picks</Card.Title>
        <Card.Description>
          Block your picks to deter people from banning your heros or countering
          your picks. Radiant blocker shown below as an example. The bot will
          pick the right overlay depending on which team you end up on.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Display
          shadow
          caption="Picks blocker that auto places itself over your pick screen"
        >
          <Image
            alt="picks blocker"
            height="400px"
            src="/images/block-radiant-picks.png"
            className="bg-gray-500"
            style={{
              backgroundImage:
                "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
            }}
          />
        </Display>
      </Card.Content>
      <Card.Footer>
        <DisableButton />
      </Card.Footer>
    </Card>
  )
}
