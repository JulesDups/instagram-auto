import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack workspace root to this directory so git worktrees don't
  // get confused by the parent repo's package-lock.json.
  turbopack: {
    root: import.meta.dirname,
  },
  // pg and @prisma/adapter-pg use native Node.js modules (net, tls, crypto)
  // that cannot be bundled by Turbopack/webpack. Declare them external so
  // Next.js loads them from node_modules at runtime instead.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
