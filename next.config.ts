import type { NextConfig } from "next";

// Applied to every response. Framing is refused so dashboard buttons cannot be clickjacked.
// A full CSP (script-src) would need per-request nonces, so only frame-ancestors is set here.
// When that CSP is added, put frame-ancestors in it and drop this one: browsers enforce every
// CSP header they receive, so two of them are hard to reason about.
// Referrer-Policy is the browsers' default; it is spelled out so it does not depend on that.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
