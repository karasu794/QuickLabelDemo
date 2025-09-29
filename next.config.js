/** @type {import('next').NextConfig} */
const nextConfig = {
	productionBrowserSourceMaps: false,
	output: 'standalone',
	experimental: {
		optimizePackageImports: [
			'@heroicons/react',
			'lucide-react',
			'clsx',
		],
	},
}

module.exports = nextConfig
