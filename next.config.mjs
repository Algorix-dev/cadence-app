/** @type {import('next').NextConfig} */
const nextConfig = {
  // TIP: app/page.tsx used to redirect "/" straight to /dashboard, which
  // meant the marketing page in public/landing.html was never actually
  // shown to anyone. This rewrite makes "/" serve that static file instead,
  // while /signup, /login and /dashboard stay normal Next.js pages.
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};
export default nextConfig;
