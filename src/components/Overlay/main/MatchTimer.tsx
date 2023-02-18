import { zeroPad } from 'react-countdown'

export const MatchTimer = ({ res, duration }) => {
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60

  return (
    <div className="flex text-center">
      <span className="z-40 m-0 rounded bg-[#6380a3] px-1 tracking-wide text-white">
        {minutes}:{zeroPad(seconds)}
      </span>
    </div>
  )
}
