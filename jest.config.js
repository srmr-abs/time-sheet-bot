module.exports = {
	moduleNameMapper: {
		'^@root(.*)$': '<rootDir>$1',
		'^@src(.*)$': '<rootDir>/src$1',
		'^@helpers(.*)$': '<rootDir>/src/helpers$1',
		'^@ajv(.*)$': '<rootDir>/test/helpers/ajv$1',
		'^@config(.*)$': '<rootDir>/src/config$1',
		'^@services/(.*)$': '<rootDir>/src/services/$1',
		'^@dist(.*)$': '<rootDir>/dist$1',
		'^@bufferConfig$':
		'<rootDir>/src/build/buildConfig/createBufferBase/configs.js',
		'^@bundledConfig$': '<rootDir>/dist/config.json',
		'^@buildLevel$': '<rootDir>/src/services/buildLevel',
		'^@buildLevel/(.*)$': '<rootDir>/src/services/buildLevel/$1',
		'^@buildHelpers$': '<rootDir>/src/services/buildLevel/helpers',
		'^@buildHelpers/(.*)$': '<rootDir>/src/services/buildLevel/helpers/$1',
		'^@globals$': '<rootDir>/src/services/buildLevel/globals',
		'^@globals/(.*)$': '<rootDir>/src/services/buildLevel/globals/$1',
	},
	collectCoverage: false,
	collectCoverageFrom: [
		'./src/**/*.js',
	],
	coverageDirectory: './.coverage',
	coverageThreshold: {
		global: {
			branches: 0,
			functions: 0,
			lines: 0,
			statements: 0,
		},
	},
	resetMocks: true,
	resetModules: true,
	setupFilesAfterEnv: [
		'./test/setup/jest.setup.js',
	],
	roots: ['<rootDir>/src', '<rootDir>/test'],
	testMatch: ['**/*.spec.js'],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/dist/',
		'/js-utils/',
	],
	transform: {
		'^.+\.js?$': 'babel-jest',
	},
	reporters: [
		'default',
		...process.env.PERF === 'true'
			? [[
				'@jest-performance-reporter/core',
				{
					errorAfterMs: 1000,
					warnAfterMs: 500,
					logLevel: 'warn',
					maxItems: 5,
					jsonReportPath: '.jestPerformanceReport.json',
					csvReportPath: '.jestPerformanceReport.csv',
				},
			]]
			: [],
	],

};
