import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const postsDirectory = path.join(repositoryRoot, 'src/pages/blog')
const outputPath = path.join(repositoryRoot, 'src/generated/blog-posts.json')

const filenames = (await readdir(postsDirectory))
  .filter((filename) => filename.endsWith('.md'))
  .toSorted()

const posts = await Promise.all(
  filenames.map(async (filename) => ({
    slug: filename.replace(/\.md$/u, ''),
    source: await readFile(path.join(postsDirectory, filename), 'utf-8'),
  })),
)

await mkdir(path.dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(posts, null, 2)}\n`)
