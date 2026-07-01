/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@vibeproof/core",
    "@vibeproof/orchestrator",
    "@vibeproof/scanners",
    "@vibeproof/rules",
    "@vibeproof/verifier",
    "@vibeproof/report",
    "@vibeproof/ai-providers"
  ]
};

export default nextConfig;

