import { useTransformRes } from '@/lib/hooks/useTransformRes'
export interface Cdn {
  low: string
  medium: string
  high: string
}

export interface Emote {
  type: string
  id: string
  code: string
  owner?: string
  cdn: Cdn
}

export type Emotes = Emote[]

export const TextWithEmotes = ({
  emotes,
  text,
}: {
  emotes: Emotes
  text: string
}) => {
  const res = useTransformRes()

  const textWithEmotes = text.split(' ').map((word) => {
    const emote = emotes.find((e) => e.code === word)
    if (emote) {
      return (
        <img
          key={emote.id}
          src={emote.cdn.medium}
          alt={emote.code}
          width={res({ w: 25 })}
          height={res({ h: 25 })}
          className="mx-1 inline"
        />
      )
    }
    return word
  })

  return (
    <div className="space-x-1">
      {textWithEmotes.map((word, i) => (
        <span key={i} className="text-slate-50">
          {word}
        </span>
      ))}
    </div>
  )
}
