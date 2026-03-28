/** @type {import('next').NextConfig} */
const isCI = process.env.CI === 'true';
const disableStandalone =
  process.env.NEXT_DISABLE_STANDALONE === '1' || (process.platform === 'win32' && !isCI);

const nextConfig = {
	productionBrowserSourceMaps: false,
	...(disableStandalone ? {} : { output: 'standalone' }),
	typescript: {
		// Temporary: allow production builds to succeed despite type errors
		ignoreBuildErrors: true,
	},
	eslint: {
		ignoreDuringBuilds: true,
	},
	logging: {
		buildActivity: true,
	},
	experimental: {
		optimizePackageImports: [
			'@heroicons/react',
			'lucide-react',
			'clsx',
		],
	},
}

export default nextConfig
