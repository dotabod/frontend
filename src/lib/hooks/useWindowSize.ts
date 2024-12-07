import { useEffect, useState } from 'react'

export interface Size {
  width: number | undefined
  height: number | undefined
}

export const useWindowSize = (): Size => {
  const [windowSize, setWindowSize] = useState<Size>({
    width: 1920,
    height: 1080,
  })

  useEffect(() => {
    function handleResize() {
      const newWidth = window.innerWidth
      const newHeight = window.innerHeight

      // Update state only if the size has changed
      if (windowSize.width !== newWidth || windowSize.height !== newHeight) {
        setWindowSize({
          width: newWidth,
          height: newHeight,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [windowSize]) // Add windowSize as a dependency

  return windowSize
}
