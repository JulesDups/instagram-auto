import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Pin Turbopack workspace root to this directory so git worktrees don't
  // get confused by the parent repo's package-lock.json.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
