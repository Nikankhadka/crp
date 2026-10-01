import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['openai', 'docx'],
  // Paths come from process.cwd() at runtime, so tracing cannot see what the server reads.
  // Ship only prompts/base, templates and the typst binary fetched at build time (bin/), and
  // keep personal data out of the deploy artifact.
  outputFileTracingIncludes: {
    '*': ['prompts/base/**', 'templates/**', 'bin/typst-linux-x64'],
  },
  outputFileTracingExcludes: {
    '*': [
      'seed/**',
      'masterresume/**',
      'data/**',
      'storage/**',
      'traces/**',
      'out/**',
      'output/**',
      'test/**',
      '.agents/**',
      '.opencode/**',
      '*.md',
    ],
  },
};

export default nextConfig;
