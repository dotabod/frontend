import matter from 'gray-matter'

import blogPostSources from '@/generated/blog-posts.json'

export interface Post {
  slug: string
  title: string
  description: string
  date: string
  author: string | null
  draft: boolean
}

export const getAllPosts = function getAllPosts(): Post[] {
  return blogPostSources
    .map(({ slug, source }) => {
      const { data } = matter(source)

      const date = data.date
        ? data.date instanceof Date
          ? data.date.toISOString()
          : String(data.date)
        : new Date().toISOString()

      return {
        author: data.author ?? null,
        date,
        description: data.description ?? '',
        draft: Boolean(data.draft),
        slug,
        title: data.title ?? 'Untitled',
      }
    })
    .filter((post) => !post.draft)
    .toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const getPostSource = function getPostSource(slug: string): string | null {
  return blogPostSources.find((post) => post.slug === slug)?.source ?? null
}

export const getLatestPost = function getLatestPost(): Post | null {
  return getAllPosts()[0] ?? null
}
