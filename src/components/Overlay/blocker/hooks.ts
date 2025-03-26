import { type RefObject, useCallback, useEffect, useState } from 'react'

export const useWindowResize = (callback: () => void) => {
  useEffect(() => {
    window.addEventListener('resize', callback)

    // Initial call
    callback()

    // Clean up
    return () => window.removeEventListener('resize', callback)
  }, [callback])
}

export const useDynamicResizing = (ref: RefObject<HTMLDivElement | null>) => {
  const [uiRescale, setUiRescale] = useState(1)

  const resizeHandler = useCallback(() => {
    const content = ref.current
    if (!content) return

    setUiRescale(
      Math.min(window.innerWidth / content.offsetWidth, window.innerHeight / content.offsetHeight),
    )
  }, [ref])

  return { uiRescale, resizeHandler }
}
