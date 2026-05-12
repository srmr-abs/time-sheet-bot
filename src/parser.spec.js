import { MessageParser } from './parser';

describe('MessageParser', () => {
	let parser;

	beforeEach(() => {
		parser = new MessageParser();
	});

	describe('parse', () => {
		describe('status detection', () => {
			test('connected keyword returns status connected', () => {
				const result = parser.parse('connected');
				expect(result.status, JSON.stringify({ input: 'connected' })).toBe('connected');
			});

			test('disconnected keyword returns status disconnected', () => {
				const result = parser.parse('disconnected');
				expect(result.status, JSON.stringify({ input: 'disconnected' })).toBe('disconnected');
			});

			test('break keyword returns status break', () => {
				const result = parser.parse('break');
				expect(result.status, JSON.stringify({ input: 'break' })).toBe('break');
			});

			test('lunch keyword returns status lunch', () => {
				const result = parser.parse('lunch');
				expect(result.status, JSON.stringify({ input: 'lunch' })).toBe('lunch');
			});

			test('back keyword returns status back', () => {
				const result = parser.parse('back');
				expect(result.status, JSON.stringify({ input: 'back' })).toBe('back');
			});
		});

		describe('timestamp extraction', () => {
			test('parses @ 9:30 AM', () => {
				const result = parser.parse('connected @ 9:30 AM');
				expect(result.timestamp, JSON.stringify({ input: 'connected @ 9:30 AM' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(9);
				expect(result.timestamp.getMinutes(), 'minutes').toBe(30);
			});

			test('parses 5:30 PM', () => {
				const result = parser.parse('disconnected 5:30 PM');
				expect(result.timestamp, JSON.stringify({ input: 'disconnected 5:30 PM' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(17);
				expect(result.timestamp.getMinutes(), 'minutes').toBe(30);
			});

			test('parses bare hour with PM', () => {
				const result = parser.parse('break 2pm');
				expect(result.timestamp, JSON.stringify({ input: 'break 2pm' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(14);
			});

			test('marks ambiguous time without AM/PM', () => {
				const result = parser.parse('connected @ 9:30');
				expect(result.timestamp, JSON.stringify({ input: 'connected @ 9:30' })).toEqual(
					expect.objectContaining({ ambiguous: true })
				);
			});
		});

		describe('unrecognized input', () => {
			test('returns null status for gibberish', () => {
				const result = parser.parse('hello world');
				expect(result.status, JSON.stringify({ input: 'hello world' })).toBeNull();
			});
		});
	});

	describe('detectStatus', () => {
		test('matches whole words only', () => {
			expect(parser.detectStatus('connection'), 'input: connection').toBeNull();
		});

		test('matches start status', () => {
			expect(parser.detectStatus('start'), 'input: start').toBe('connected');
		});

		test('is case-insensitive', () => {
			expect(parser.detectStatus('CONNECTED'), 'input: CONNECTED').toBe('connected');
		});
	});

	describe('extractNotes', () => {
		test('removes status keyword and time patterns', () => {
			const result = parser.extractNotes('connected @ 9:00 AM working on features', 'connected');
			expect(result.toLowerCase(), JSON.stringify({ input: 'connected @ 9:00 AM working on features' })).toContain('working');
			expect(result.toLowerCase(), 'should not contain connected').not.toContain('connected');
		});
	});

	describe('getHelpText', () => {
		test('returns non-empty markdown help', () => {
			const result = parser.getHelpText();
			expect(result, 'help text').toContain('Timesheet Bot Help');
		});
	});

	describe('getSuggestions', () => {
		test('returns newline-separated suggestions', () => {
			const result = parser.getSuggestions();
			expect(result, 'suggestions').toContain('connected');
			expect(result, 'suggestions').toContain('help');
		});
	});
});
