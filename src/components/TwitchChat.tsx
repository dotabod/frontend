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
        <div>
          {modOnly && <ModImage />}
          <span className='font-bold text-[#8a2be2]'>techleed</span>
          <span className='mr-1'>:</span>
          <div className='inline'>{command}</div>
        </div>
      )}
      <div className='space-y-1'>
        {responses.map((response, i) => (
          <div key={i}>
            <ModImage />
            <span className='font-bold text-[#c90909]'>dotabod</span>
            <span className='mr-1'>:</span>
            <div className={clsx('inline', 'text-[#EFEFF1]')}>{response}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
