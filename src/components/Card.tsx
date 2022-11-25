'use client'

export const Card = ({ children }) => {
  return (
    <div className="flex flex-col items-center rounded bg-blue-200/20 p-1 text-white/80">
      {children}
    </div>
  )
}
