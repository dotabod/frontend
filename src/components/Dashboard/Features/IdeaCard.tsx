import { Card } from '@/ui/card'
import React from 'react'
import clsx from 'clsx'

export default function IdeaCard() {
  return (
    <Card className="hover:border-indigo-800">
      <div className="title">
        <h3>Have an idea?</h3>
      </div>
      <div className="subtitle mb-2">
        <a href="https://discord.dotabod.com">Tell us on Discord</a> what
        you&apos;d like to see!
      </div>
      <div className="flex flex-col items-center space-y-4">
        <img
          className={clsx(
            '!h-[150px] !w-[400px] rounded-xl border-2 border-transparent transition-all'
          )}
          alt="secret feature"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAABDhJREFUWIWFl22S8zYMgx/Q7gXbk/T43Y2I9wdJWcnuTJPh+COJAIIg5ejvf/41GGfileR6kd/frO9v8uuL9fUf6/urYn2TfpFK8oK8A98X/uuG+8ZXR9ykAnORFitFLrEScsFadbQhEP0Sz/lxquPm/uTzHvjHnZ9rncc5vzUAAVhIQiGYEM+5BTkr6IPpJ4kPuM+vC2S4QwKpStBADhF9zChCCiHXYm4uSBg1cH+2r3/TTRScdz53XAGuC2O4AmfgCHSJuIJMoZxM+hjgeNTYpP4PnEdMC+5rCCQkBppACmeQt5CjynMS2MAN/lYGHbAFpCNCwjIOuK/rwq4LrSKAA/vCDsJBZJOglbAwxjHgj/z8KEET5yP7ELZLARvs+WHJcXlhB8pAdxAEImAdWs+Ks+iH6LTsdUsFHsaU4uZUwJBqBYjKPoO4SwW5TKgDzbsEFVvjg8Zpf7VaIz9mFDC2UBMwDe4B7yBAgbLptxccOrJ+B8VUa48XKPO62/npAifSBeRT+1Ghu0CnEfNIq7HLbOrbh1m9q4CHXtQkvK+IMpRjg19XkG/gRxnmfSzc1n6bTXpT4OmQp0B+5kCVILf8dg0iXZX5VuA6CGRNsiEzg0kdT6d+eqKtfk5Cq7oAhF3TL45QCF0QVoFa1XQ+uv2YU6cXf59N3mRu9R4wLSPRo5eOOo99Txs4XL2/l+CYU9IG0bjvafQygOA+N7uSj58RxxQLiN5G03W+h9HbkPRos7N+jt7XN/1l4ykqkn8nEaBsEsDV6/gRcZvvXXpP2m/gYO7agvzx4RHy3uNqs3yOk/UmcBT9NNwpvjFyrWvDbXqo1DymGvwhINyKnCQqJtOcxTXST9S8r1K4zzthdwmq/WoQfQY7HhVqLzdX8NzX01o7fU/GegA1wA+Ju8DcoOsX8EQkcs6UqHebzNoPU32vAVri4ZIH+Bl39tOhnaQXzg6vNxJVjiLhXkwNOuCzPXjenp8+fe8pcZf8znw1sSRzkXmQyAVekKVAqZC7Y3Rk/hwrs7S3ObM9NLI/isO9DgXcBN5JJHihXF2KKoMw2U82hDf49JRkMgd8HlPa5D4VWK9mljj7f0G+yNUKTBwKQG7H99NatVVna1xDqnc89efaHda+S3Ov9araNAHni1wvnE9UCRZqP4RG3sNwUdfVltUVST+C4UeBN9PDvfLFuMVOvF67FFuBwwcoj07zznyXYDqhDTjZv7l/k3grgRvwVSTWC59l6BLMcJpHcd5MWCWIzjlksuuvU/pJOEcB2B7gyHybsEtgaiY847Yy1tkBmj9P/Yw801GHCfGhQK5NgMzDeNmzYOaBjzH7FEHjhb0N16yvTUmH+48htVXoSTgt4a71Hj7pij2McoOe28u+1pE17BHN8f29K7q6Ze8Fk6V3jxag9sbhnfd+6XjQ7GNJ8qg0G9mD7s0Fwx9Qwh0RR8iNEAAAAABJRU5ErkJggg=="
        />
        <span>Your idea will be here soon ™</span>
      </div>
    </Card>
  )
}
