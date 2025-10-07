import type { GetServerSideProps } from 'next'
import prisma from '@/lib/db'

// This page should never render, it only returns XML
const SitemapIndex = () => null

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    // Get total user count to calculate number of sitemap files needed
    const totalUsers = await prisma.user.count({
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

    const USERS_PER_SITEMAP = 5000 // 5k users per sitemap file
    const numSitemaps = Math.ceil(totalUsers / USERS_PER_SITEMAP)

    // Generate sitemap index XML with optimized structure for 30k+ users
    // For now, we'll use a manageable number of static sitemaps
    const maxSitemaps = Math.min(numSitemaps, 6) // Limit to 6 sitemaps (30k users max)

    const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://dotabod.com/sitemaps/static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
${Array.from({ length: maxSitemaps }, (_, i) => i + 1)
  .map(
    (page) => `  <sitemap>
    <loc>https://dotabod.com/sitemaps/users-${page}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`,
  )
  .join('\n')}
</sitemapindex>`

    res.setHeader('Content-Type', 'text/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400') // Cache for 1 hour
    res.write(sitemapIndex)
    res.end()

    return {
      props: {},
    }
  } catch (error) {
    console.error('Error generating sitemap index:', error)

    // Return a basic sitemap index if there's an error
    const basicSitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://dotabod.com/sitemaps/static.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>
</sitemapindex>`

    res.setHeader('Content-Type', 'text/xml')
    res.write(basicSitemapIndex)
    res.end()

    return {
      props: {},
    }
  }
}

export default SitemapIndex
