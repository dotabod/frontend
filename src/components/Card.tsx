'use client'

export const Card = ({ children }) => {
  return (
    <div className="flex flex-col items-center rounded bg-gray-500/50 p-1 text-white/60">
      {children}
    </div>
  )
}
