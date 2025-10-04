#!/usr/bin/env node
/* eslint-disable no-console */

const required = [
	// FedEx
	'FEDEX_EXPORT_API_KEY',
	'FEDEX_EXPORT_SECRET_KEY',
	'FEDEX_EXPORT_ACCOUNT_NUMBER',
	'FEDEX_IMPORT_API_KEY',
	'FEDEX_IMPORT_SECRET_KEY',
	'FEDEX_IMPORT_ACCOUNT_NUMBER',
	// Square
	'SQUARE_ACCESS_TOKEN',
	// Blob
	'BLOB_READ_WRITE_TOKEN',
	// App
	'NEXT_PUBLIC_SUPABASE_URL',
	'NEXT_PUBLIC_SUPABASE_ANON_KEY',
	'SUPABASE_SERVICE_ROLE_KEY',
]

const optional = [
    'ALERT_WEBHOOK_URL',
    'ALLOWED_ORIGINS',
    'REQUIRE_RATE_MATCH',
]

let missing = []
for (const key of required) {
	if (!process.env[key] || String(process.env[key]).trim() === '') {
		missing.push(key)
	}
}

if (missing.length) {
	console.error('❌ Missing required environment variables:')
	for (const k of missing) console.error(' -', k)
	process.exit(1)
}

for (const key of optional) {
	if (!process.env[key]) {
		console.warn('⚠️ Optional env not set:', key)
	}
}

console.log('✅ Environment variables OK')
