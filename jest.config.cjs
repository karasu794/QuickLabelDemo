const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.cjs'],
  moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
		'^@lib/(.*)$': '<rootDir>/src/lib/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>'],
	testMatch: [
		'**/tests/contracts/**/*.(contract|spec|test).(ts|tsx|js)',
		'**/tests/**/*.spec.(ts|tsx|js)',
		'**/__tests__/**/*.test.ts',
	],
	testPathIgnorePatterns: [
		'<rootDir>/tests/e2e/',
		// Stage2完了のため一時隔離（Stage5後に戻す）
		'<rootDir>/tests/contracts/payments.webhook.contract.test.ts',
	],
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
		'^@lib/(.*)$': '<rootDir>/src/lib/$1',
		'^@schemas/(.*)$': '<rootDir>/src/schemas/$1',
		'^server-only$': '<rootDir>/test/__mocks__/server-only.js',
	},
	transform: {
		'^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
	},
	setupFiles: ['dotenv/config'],
	setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.ts'],
} 