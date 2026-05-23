import type { GetServerSideProps } from 'next'
import prisma from '@/lib/db'

// This page should never render, it only returns XML
const Users4Sitemap = () => null

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    const USERS_PER_SITEMAP = 5000
    const offset = 15_000 // Page 4 (15000-19999)

    // Fetch users for this page
    const users = await prisma.user.findMany({
      orderBy: [{ followers: 'desc' }, { updatedAt: 'desc' }],
      select: {
        name: true,
        updatedAt: true,
      },
      skip: offset,
      take: USERS_PER_SITEMAP,
      where: {
        name: {
          not: '',
        },
        // Only include users who have some activity
        OR: [
          { followers: { gte: 1 } },
          { settings: { some: {} } },
          { createdAt: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) } }, // Created within last year
        ],
      },
    })

    // If no users found, return empty sitemap
    if (users.length === 0) {
      const emptySitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`

      res.setHeader('Content-Type', 'application/xml')
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
      res.write(emptySitemap)
      res.end()

      return { props: {} }
    }

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${users
  .map(
    (user) => `  <url>
    <loc>https://dotabod.com/${user.name}</loc>
    <lastmod>${user.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400') // Cache for 1 hour
    res.write(sitemap)
    res.end()

    return {
      props: {},
    }
  } catch (error) {
    console.error('Error generating user sitemap:', error)
    return { notFound: true }
  }
}

export default Users4Sitemap
