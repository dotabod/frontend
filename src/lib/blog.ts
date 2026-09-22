import matter from 'gray-matter'
import { z } from 'zod'

import blogPostSources from '@/generated/blog-posts.json'

export interface Post {
  slug: string
  title: string
  description: string
  date: string
  author: string | null
  draft: boolean
}

const blogPostDateSchema = z.union([z.date(), z.string(), z.number()]).nullable().optional()

export const getAllPosts = function getAllPosts(): Post[] {
  const posts: Post[] = []

  for (const { slug, source } of blogPostSources) {
    const { data } = matter(source)
    const dateValue = blogPostDateSchema.parse(data.date)

    let date = new Date().toISOString()

    if (dateValue instanceof Date) {
      date = dateValue.toISOString()
    } else if (dateValue !== null && dateValue !== undefined) {
      date = String(dateValue)
    }

    const post = {
      author: data.author ?? null,
      date,
      description: data.description ?? '',
      draft: Boolean(data.draft),
      slug,
      title: data.title ?? 'Untitled',
    }

    if (!post.draft) {
      posts.push(post)
    }
  }

  return posts.toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export const getPostSource = function getPostSource(slug: string): string | null {
  return blogPostSources.find((post) => post.slug === slug)?.source ?? null
}

export const getLatestPost = function getLatestPost(): Post | null {
  return getAllPosts()[0] ?? null
}
