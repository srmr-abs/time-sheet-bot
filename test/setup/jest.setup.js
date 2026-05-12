import 'jest-expect-message';

// Mock external services for every test run
jest.mock('restify', () => ({
	createServer: jest.fn(() => ({
		use: jest.fn(),
		listen: jest.fn(),
		post: jest.fn(),
		get: jest.fn(),
		name: 'test-server',
		url: 'http://localhost:3978',
	})),
	plugins: {
		bodyParser: jest.fn(),
	},
}));

jest.mock('botbuilder', () => ({
	ActivityHandler: jest.fn().mockImplementation(() => ({
		onMessage: jest.fn(),
		onMessageUpdate: jest.fn(),
		onMembersAdded: jest.fn(),
	})),
	CloudAdapter: jest.fn().mockImplementation(() => ({
		process: jest.fn(),
		onTurnError: null,
	})),
	ConfigurationServiceClientCredentialFactory: jest.fn(),
	createBotFrameworkAuthenticationFromConfiguration: jest.fn(),
}));
