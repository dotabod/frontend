import ModImage from './ModImage'

export default function TwitchChat({
  command,
  modOnly = false,
  responses = [],
  response = null,
}) {
  if (response) responses.push(response)
  return (
    <div className="mt-2 rounded border p-2">
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
            <div className="inline">{response}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
