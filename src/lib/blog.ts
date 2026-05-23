import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

export interface Post {
  slug: string
  title: string
  description: string
  date: string
  author: string | null
  draft: boolean
}

const postsDirectory = path.join(process.cwd(), 'src/pages/blog')

export function getAllPosts(): Post[] {
  const filenames = fs.readdirSync(postsDirectory)

  return filenames
    .filter((filename) => filename.endsWith('.md'))
    .map((filename) => {
      const fileContents = fs.readFileSync(path.join(postsDirectory, filename), 'utf8')
      const { data } = matter(fileContents)

      const date = data.date
        ? data.date instanceof Date
          ? data.date.toISOString()
          : String(data.date)
        : new Date().toISOString()

      return {
        author: data.author || null,
        date,
        description: data.description || '',
        draft: Boolean(data.draft),
        slug: filename.replace(/\.md$/, ''),
        title: data.title || 'Untitled',
      }
    })
    .filter((post) => !post.draft)
    .toSorted((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getLatestPost(): Post | null {
  return getAllPosts()[0] ?? null
}
