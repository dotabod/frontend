import { act } from '@testing-library/react'
import { useEffect } from 'react'
import { hydrateRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { HydratedContent } from '../hydrated-content'

describe(HydratedContent, () => {
  it('reveals server-rendered content without remounting its effects or DOM', async () => {
    const mount = vi.fn<() => void>()
    const unmount = vi.fn<() => void>()
    const Page = () => {
      useEffect(() => {
        mount()
        return unmount
      }, [])

      return <button type='button'>Page content</button>
    }
    const content = (
      <HydratedContent>
        <Page />
      </HydratedContent>
    )
    const container = document.createElement('div')
    container.innerHTML = renderToString(content)
    document.body.append(container)
    const button = container.querySelector('button')
    expect(container.firstElementChild).toHaveStyle({ visibility: 'hidden' })
    let root: Root | undefined

    try {
      await act(async () => {
        root = hydrateRoot(container, content)
        await Promise.resolve()
      })

      expect(container.querySelector('button')).toBe(button)
      expect(button).toBeVisible()
      expect(mount).toHaveBeenCalledOnce()
      expect(unmount).not.toHaveBeenCalled()
    } finally {
      act(() => {
        root?.unmount()
      })
      container.remove()
    }

    expect(unmount).toHaveBeenCalledOnce()
  })
})
