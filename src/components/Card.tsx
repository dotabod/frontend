import clsx from 'clsx'

export const Card = ({ children = null, className = '', ...props }) => {
  return (
    <div
      className={clsx(
        className,
        'flex flex-col items-center rounded bg-slate-700/50 p-1 text-white/90'
      )}
      {...props}
    >
      {children}
    </div>
  )
}
