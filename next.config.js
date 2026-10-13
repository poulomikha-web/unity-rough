// PAGES=1 (npm run build:pages) → static export for GitHub Pages, served from
// https://poulomikha-web.github.io/unity-rough/. Otherwise a normal Next app.
const pages = process.env.PAGES === '1';
const basePath = pages ? '/unity-rough' : '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(pages
    ? { output: 'export', trailingSlash: true, images: { unoptimized: true } }
    : {
        async rewrites() {
          // The agent console is a static page in public/agent/.
          return [{ source: '/agent', destination: '/agent/index.html' }];
        },
      }),
};

module.exports = nextConfig;
