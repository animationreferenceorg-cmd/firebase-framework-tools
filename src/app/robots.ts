
import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin/', '/profile/', '/login/'],
        },
        sitemap: 'https://animationreference.org/sitemap.xml',
    };
}
