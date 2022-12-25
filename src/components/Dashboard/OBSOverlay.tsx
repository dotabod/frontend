import { Card } from '@/ui/card'
import { useBaseUrl } from '@/lib/hooks'
import { Badge, Button, Collapse, Display } from '@geist-ui/core'
import { useSession } from 'next-auth/react'
import { CopyButton } from '@mantine/core'
import Image from 'next/image'

export default function OBSOverlay() {
  const user = useSession()?.data?.user
  const copyURL = useBaseUrl(`overlay/${user ? user.id : ''}`)

  return (
    <Card>
      <Collapse
        shadow
        title="Step three. OBS Overlay"
        subtitle="Add a new Browser source to OBS."
      >
        <div className="mt-4 space-y-4">
          <p>1. Open OBS Studio and go to File &gt; Settings</p>
          <Display shadow>
            <Image
              alt="dotabod browser source properties"
              width={331}
              unoptimized
              height={292}
              src="/images/obs-step-1.png"
            />
          </Display>

          <p>
            2. Remember your &quot;Base (Canvas) Resolution&quot;. It&apos;s
            usually 1920x1080 but you could have a different one. Don&apos;t
            copy 1234x789, that&apos;s just there as an example.
          </p>
          <Display shadow>
            <Image
              alt="dotabod browser source properties"
              width={572}
              unoptimized
              height={256}
              src="/images/obs-step-2.png"
            />
          </Display>

          <p>
            3. Close the settings window, and under Sources click Add &gt;
            Browser and press OK.
          </p>

          <Display shadow>
            <Image
              alt="dotabod browser source properties"
              width={572}
              unoptimized
              height={256}
              src="/images/obs-step-3.png"
            />
          </Display>

          <p>
            4. Fill out the properties, entering your &quot;Base (Canvas)
            Resolution&quot; from Step 2 earlier.
          </p>
          <p>
            Copy and paste your personal URL into the URL field (1) for the
            browser source.
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
          <Display shadow>
            <Image
              alt="dotabod browser source properties"
              unoptimized
              width={635}
              height={519}
              src="/images/obs-step-4.png"
            />
          </Display>
          <p>5. Done!</p>
        </div>
      </Collapse>
    </Card>
  )
}
