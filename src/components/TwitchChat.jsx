import clsx from 'clsx'
import ModImage from './ModImage'

export default function TwitchChat({
  command = null,
  modOnly = false,
  responses = [],
  response = null,
  dark = false,
}) {
  if (response) responses.push(response)
  return (
    <div
      className={clsx(
        'mt-2 max-w-xs rounded border p-2',
        dark && 'border-dark-500'
      )}
    >
      {command && (
        <div>
          {modOnly && <ModImage />}
          <span className="font-bold text-[#8a2be2]">techleed</span>
          <span className="mr-1">:</span>
          <div className="inline">{command}</div>
        </div>
      )}
      <div className="space-y-1">
        {responses.map((response, i) => (
          <div key={i}>
            <ModImage />
            <span className="font-bold text-[#c90909]">dotabod</span>
            <span className="mr-1">:</span>
            <div className={clsx('inline', dark && 'text-[#EFEFF1]')}>
              {response}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
