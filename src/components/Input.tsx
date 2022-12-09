import clsx from 'clsx'

export const Input = ({ className = '', ...props }) => {
  return (
    <div
      className={clsx(
        className,
        'group flex max-w-[483px] items-center justify-start overflow-hidden rounded-lg border border-solid border-dark-900 bg-dark-900 transition-all duration-200 focus-within:border-blue-500 focus-within:ring-[4px] focus-within:ring-blue-500 focus-within:ring-opacity-30 hover:border-blue-500'
      )}
    >
      <input
        className="w-full border-none bg-transparent py-3 px-4 text-base text-dark-100  outline-none placeholder:text-dark-300"
        {...props}
      />
    </div>
  )
}
