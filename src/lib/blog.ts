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
  const posts: Post[] = []

  for (const { slug, source } of blogPostSources) {
    const { data } = matter(source)

    let date = new Date().toISOString()

    if (data.date instanceof Date) {
      date = data.date.toISOString()
    } else if (typeof data.date === 'string' || typeof data.date === 'number') {
      date = String(data.date)
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
