import { beforeAll, describe, expect, it } from 'vitest'

import { guardDomAgainstTranslation } from '@/lib/translate-dom-guard'

// Mimic Google Translate: move a React-owned text node into a wrapper element
// so its original parent no longer holds it.
const translatedParagraph = () => {
  const paragraph = document.createElement('p')
  const text = document.createTextNode('Hello')
  paragraph.append(text)

  const wrapper = document.createElement('span')
  paragraph.append(wrapper)
  wrapper.append(text)

  return { paragraph, text, wrapper }
}

// These tests call removeChild/insertBefore directly because those are the
// calls React makes during a commit.
describe(guardDomAgainstTranslation, () => {
  beforeAll(() => {
    guardDomAgainstTranslation()
  })

  it('ignores removeChild for a node that was moved to another parent', () => {
    const { paragraph, text, wrapper } = translatedParagraph()

    // oxlint-disable-next-line unicorn/prefer-dom-node-remove -- the React call under test
    expect(() => paragraph.removeChild(text)).not.toThrow()
    expect(text.parentNode).toBe(wrapper)
  })

  it('ignores insertBefore against a reference node that was moved', () => {
    const { paragraph, text } = translatedParagraph()
    const inserted = document.createElement('span')

    // oxlint-disable-next-line unicorn/prefer-modern-dom-apis -- the React call under test
    expect(() => paragraph.insertBefore(inserted, text)).not.toThrow()
    expect(inserted.parentNode).toBeNull()
  })

  it('still removes and inserts normally when the DOM is untouched', () => {
    const list = document.createElement('ul')
    const first = document.createElement('li')
    const second = document.createElement('li')
    list.append(second)

    // oxlint-disable-next-line unicorn/prefer-modern-dom-apis -- the React call under test
    list.insertBefore(first, second)
    expect([...list.children]).toStrictEqual([first, second])

    // oxlint-disable-next-line unicorn/prefer-dom-node-remove -- the React call under test
    list.removeChild(first)
    expect([...list.children]).toStrictEqual([second])
  })
})
