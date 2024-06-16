export const LiveIcon = () => {
  return (
    <div className="flex items-center space-x-2">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m5 4V7" />
      </svg>
      <span className="animate-pulse rounded-md bg-red-700 px-2 py-0.5 text-xs">
        Live
      </span>
    </div>
  )
}
