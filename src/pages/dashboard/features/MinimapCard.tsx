"use client"
import { Card } from "@/ui/card"
import { DisableButton } from "@/components/DisableButton"
import { Display, Image } from "@geist-ui/core"

export function MinimapCard(): JSX.Element {
  return (
    <Card>
      <Card.Header>
        <Card.Title>Minimap</Card.Title>
        <Card.Description>
          Block your minimap to deter people from destroying your wards or observing teammate
          positions. This overlay will make it confusing to see where the true wards are.
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex items-center space-x-6">
        <Display shadow caption="Minimap blocker that auto places itself over your minimap">
          <Image
            alt="minimap blocker"
            height="244px"
            src="/images/731-Simple-Large-AntiStreamSnipeMap.png"
            style={{
              backgroundImage:
                "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUAQMAAAC3R49OAAAABlBMVEX////09PQtDxrOAAAAE0lEQVQI12P4f4CBKMxg/4EYDAAFkR1NiYvv7QAAAABJRU5ErkJggg==')",
            }}
          />
        </Display>
        {/* <Image
          alt="minimap blocker"
          width={244}
          height={244}
          src="/images/731-Complex-Large-AntiStreamSnipeMap.png"
        /> */}
      </Card.Content>
      <Card.Footer>
        <DisableButton />
      </Card.Footer>
    </Card>
  )
}
