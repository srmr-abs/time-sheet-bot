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

			test('parses at 9:30 AM', () => {
				const result = parser.parse('connected at 9:30 AM');
				expect(result.timestamp, JSON.stringify({ input: 'connected at 9:30 AM' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(9);
				expect(result.timestamp.getMinutes(), 'minutes').toBe(30);
			});

			test('parses 12:00 AM as midnight', () => {
				const result = parser.parse('connected 12:00 AM');
				expect(result.timestamp, JSON.stringify({ input: 'connected 12:00 AM' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(0);
			});

			test('parses 12:00 PM as noon', () => {
				const result = parser.parse('connected 12:00 PM');
				expect(result.timestamp, JSON.stringify({ input: 'connected 12:00 PM' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(12);
			});

			test('parses 9am without colon or space', () => {
				const result = parser.parse('connected 9am');
				expect(result.timestamp, JSON.stringify({ input: 'connected 9am' })).not.toBeNull();
				expect(result.timestamp.getHours(), 'hours').toBe(9);
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

		test('connect maps to connected', () => {
			expect(parser.detectStatus('connect'), 'input: connect').toBe('connected');
		});

		test('in maps to connected', () => {
			expect(parser.detectStatus('in'), 'input: in').toBe('connected');
		});

		test('online maps to connected', () => {
			expect(parser.detectStatus('online'), 'input: online').toBe('connected');
		});

		test('disconnect maps to disconnected', () => {
			expect(parser.detectStatus('disconnect'), 'input: disconnect').toBe('disconnected');
		});

		test('end maps to disconnected', () => {
			expect(parser.detectStatus('end'), 'input: end').toBe('disconnected');
		});

		test('off maps to disconnected', () => {
			expect(parser.detectStatus('off'), 'input: off').toBe('disconnected');
		});

		test('done maps to disconnected', () => {
			expect(parser.detectStatus('done'), 'input: done').toBe('disconnected');
		});

		test('brb maps to break', () => {
			expect(parser.detectStatus('brb'), 'input: brb').toBe('break');
		});

		test('lunchbreak maps to lunch', () => {
			expect(parser.detectStatus('lunchbreak'), 'input: lunchbreak').toBe('lunch');
		});

		test('lunch break maps to lunch', () => {
			expect(parser.detectStatus('lunch break'), 'input: lunch break').toBe('lunch');
		});

		test('return maps to back', () => {
			expect(parser.detectStatus('return'), 'input: return').toBe('back');
		});

		test('returned maps to back', () => {
			expect(parser.detectStatus('returned'), 'input: returned').toBe('back');
		});

		test('breakfast does not match break', () => {
			expect(parser.detectStatus('breakfast'), 'input: breakfast').toBeNull();
		});
	});

	describe('extractNotes', () => {
		test('removes status keyword and time patterns', () => {
			const result = parser.extractNotes('connected @ 9:00 AM working on features', 'connected');
			expect(result.toLowerCase(), JSON.stringify({ input: 'connected @ 9:00 AM working on features' })).toContain('working');
			expect(result.toLowerCase(), 'should not contain connected').not.toContain('connected');
		});

		test('returns empty string when only status and time remain', () => {
			const result = parser.extractNotes('connected @ 9:00 AM', 'connected');
			expect(result, JSON.stringify({ input: 'connected @ 9:00 AM' })).toBe('');
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
