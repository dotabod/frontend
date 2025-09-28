import type { GetServerSideProps } from 'next'

// This page should never render, it only returns XML
const StaticSitemap = () => null

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  try {
    // Static pages
    const staticPages = [
      {
        url: 'https://dotabod.com',
        lastmod: new Date().toISOString(),
        changefreq: 'daily',
        priority: '1.0',
      },
      {
        url: 'https://dotabod.com/contact',
        lastmod: new Date().toISOString(),
        changefreq: 'monthly',
        priority: '0.7',
      },
      {
        url: 'https://dotabod.com/privacy-policy',
        lastmod: new Date().toISOString(),
        changefreq: 'yearly',
        priority: '0.5',
      },
      {
        url: 'https://dotabod.com/terms-of-service',
        lastmod: new Date().toISOString(),
        changefreq: 'yearly',
        priority: '0.5',
      },
    ]

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=86400') // Cache for 24 hours
    res.write(sitemap)
    res.end()

    return {
      props: {},
    }
  } catch (error) {
    console.error('Error generating static sitemap:', error)

    // Return a basic sitemap if there's an error
    const basicSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://dotabod.com</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    res.setHeader('Content-Type', 'application/xml')
    res.write(basicSitemap)
    res.end()

    return {
      props: {},
    }
  }
}

export default StaticSitemap
