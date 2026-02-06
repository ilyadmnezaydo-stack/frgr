/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    // Add experimental features for better Docker support
    experimental: {
        outputFileTracingIncludes: {
            '*': ['public/**/*', '.next/static/**/*'],
        },
    },
    // Suppress warnings
    onDemandEntries: {
        maxInactiveAge: 25 * 1000,
        pagesBufferLength: 2,
    },
};

export default nextConfig
