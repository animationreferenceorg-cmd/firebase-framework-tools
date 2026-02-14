/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {},
  /* config options here */
  webpack(config) {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.youtube.com',
        port: '',
        pathname: '/**',
      },

      {
        protocol: 'https',
        hostname: 'vimeo.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'public-files.gumroad.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.gumroad.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'vz-79893c7f-720.b-cdn.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
  async redirects() {
    return [
      // Main Hub Redirect
      {
        source: '/browse',
        destination: '/categories',
        permanent: true,
      },
      {
        source: '/categories/',
        destination: '/categories',
        permanent: true,
      },
      // SEO Category Redirects
      {
        source: '/run-cycle',
        destination: '/category/running-animation-reference',
        permanent: true,
      },
      {
        source: '/run-cycle/',
        destination: '/category/running-animation-reference',
        permanent: true,
      },
      {
        source: '/live-action',
        destination: '/category/live-action-reference',
        permanent: true,
      },
      {
        source: '/live-action/',
        destination: '/category/live-action-reference',
        permanent: true,
      },
      {
        source: '/eye-animations',
        destination: '/category/eye-animation-references',
        permanent: true,
      },
      {
        source: '/eye-animations/',
        destination: '/category/eye-animation-references',
        permanent: true,
      },
      {
        source: '/dreamworks',
        destination: '/category/dreamworks-animation-references',
        permanent: true,
      },
      {
        source: '/dreamworks/',
        destination: '/category/dreamworks-animation-references',
        permanent: true,
      },
      {
        source: '/jumping',
        destination: '/category/jumping-animation-reference',
        permanent: true,
      },
      {
        source: '/jumping/',
        destination: '/category/jumping-animation-reference',
        permanent: true,
      },
      {
        source: '/disney',
        destination: '/category/disney-animation-references',
        permanent: true,
      },
      {
        source: '/disney/',
        destination: '/category/disney-animation-references',
        permanent: true,
      },
    ];
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;