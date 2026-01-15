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
      }
    ],
  },
  async redirects() {
    return [
      // Example: Redirect old site path to new category path
      // {
      //   source: '/old-running-animation-page',
      //   destination: '/category/running-animation',
      //   permanent: true,
      // },
      // {
      //   source: '/browse/some-old-id',
      //   destination: '/category/some-new-slug',
      //   permanent: true,
      // },
    ];
  },
};

module.exports = nextConfig;
