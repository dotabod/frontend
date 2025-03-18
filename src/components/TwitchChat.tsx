import clsx from 'clsx'
import ModImage from './ModImage'

export default function TwitchChat({
  command = '',
  className = '',
  modOnly = false,
  responses = [],
  response = '',
}: {
  command?: string
  className?: string
  modOnly?: boolean
  responses?: React.ReactNode[]
  response?: React.ReactNode
}) {
  if (response) responses.push(response)
  return (
    <div
      className={clsx(className, 'mt-2 max-w-xs rounded-sm border p-2 text-sm', 'border-gray-700')}
    >
      {command && (
        <span>
          {modOnly && <ModImage />}
          <span className='font-bold text-[#8a2be2]'>techleed</span>
          <span className='mr-1'>: </span>
          <span>{command}</span>
        </span>
      )}
      <span>
        {responses.map((response, responseIndex) => (
          <div key={`chat-response-${responseIndex}`}>
            <ModImage />
            <span className='font-bold text-[#c90909]'>dotabod</span>
            <span className=''>: </span>
            <span className='text-[#EFEFF1]'>{response}</span>
          </div>
        ))}
      </span>
    </div>
  )
}
