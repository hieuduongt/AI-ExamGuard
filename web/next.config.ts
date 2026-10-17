import os from 'node:os';
import type { NextConfig } from 'next';
const hubProxyTarget = (process.env.EXAMGUARD_HUB_URL || process.env.NEXT_PUBLIC_HUB_URL || 'http://127.0.0.1:8765')
    .trim()
    .replace(/\/+$/, '');
function allowAllLanDevOrigins() {
    const origins = new Set<string>([
        'localhost',
        '127.0.0.1',
        '*.*.*.*',
    ]);
    for (const list of Object.values(os.networkInterfaces())) {
        for (const net of list ?? []) {
            const family = String(net.family);
            if (family === 'IPv4' || family === '4')
                origins.add(net.address);
        }
    }
    for (const value of (process.env.ALLOWED_DEV_ORIGINS || '').split(',')) {
        const host = value.trim();
        if (host)
            origins.add(host);
    }
    return [...origins];
}
const nextConfig: NextConfig = {
    output: 'export',
    allowedDevOrigins: allowAllLanDevOrigins(),
    images: {
        unoptimized: true,
    },
    async rewrites() {
        return [
            { source: '/api/:path*', destination: `${hubProxyTarget}/api/:path*` },
        ];
    },
};
export default nextConfig;
