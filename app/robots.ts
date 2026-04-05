import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/account/', '/messages/'],
      },
    ],
    sitemap: 'https://pedigreeplatform.com/sitemap.xml',
  }
}
