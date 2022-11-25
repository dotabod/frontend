'use client'

export const Card = ({ children }) => {
  return (
    <div className="flex flex-col items-center rounded bg-slate-700/50 p-1 text-white/90">
      {children}
    </div>
  )
}
