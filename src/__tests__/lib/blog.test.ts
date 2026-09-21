import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'

import { getAllPosts, getLatestPost, getPostSource } from '@/lib/blog'

describe('blog post sources', () => {
  it('provides embedded source for every published post', () => {
    const posts = getAllPosts()

    expect(posts.length).toBeGreaterThan(0)
    for (const post of posts) {
      const source = getPostSource(post.slug)

      expect(source).not.toBeNull()
      expect(matter(source ?? '').data.title).toBe(post.title)
    }
  })

  it('returns the newest published post', () => {
    expect(getLatestPost()).toStrictEqual(getAllPosts()[0])
  })
})
