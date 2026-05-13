import { TimesheetHandler } from './timesheet-handler';

describe('TimesheetHandler', () => {
	let handler;

	beforeEach(() => {
		handler = new TimesheetHandler();
	});

	describe('validateStateTransition', () => {
		describe('connected transitions', () => {
			test('idle to connected is valid', () => {
				const result = handler.validateStateTransition('idle', 'connected');
				expect(result, JSON.stringify({ currentState: 'idle', newStatus: 'connected' })).toBeNull();
			});

			test('working to connected is invalid', () => {
				const result = handler.validateStateTransition('working', 'connected');
				expect(result, JSON.stringify({ currentState: 'working', newStatus: 'connected' })).not.toBeNull();
			});

			test('on_break to connected is invalid', () => {
				const result = handler.validateStateTransition('on_break', 'connected');
				expect(result, JSON.stringify({ currentState: 'on_break', newStatus: 'connected' })).not.toBeNull();
			});
		});

		describe('break transitions', () => {
			test('working to break is valid', () => {
				const result = handler.validateStateTransition('working', 'break');
				expect(result, JSON.stringify({ currentState: 'working', newStatus: 'break' })).toBeNull();
			});

			test('idle to break is invalid', () => {
				const result = handler.validateStateTransition('idle', 'break');
				expect(result, JSON.stringify({ currentState: 'idle', newStatus: 'break' })).not.toBeNull();
			});

			test('on_break to break is invalid', () => {
				const result = handler.validateStateTransition('on_break', 'break');
				expect(result, JSON.stringify({ currentState: 'on_break', newStatus: 'break' })).not.toBeNull();
			});
		});

		describe('back transitions', () => {
			test('on_break to back is valid', () => {
				const result = handler.validateStateTransition('on_break', 'back');
				expect(result, JSON.stringify({ currentState: 'on_break', newStatus: 'back' })).toBeNull();
			});

			test('idle to back is invalid', () => {
				const result = handler.validateStateTransition('idle', 'back');
				expect(result, JSON.stringify({ currentState: 'idle', newStatus: 'back' })).not.toBeNull();
			});
		});

		describe('disconnected transitions', () => {
			test('working to disconnected is valid', () => {
				const result = handler.validateStateTransition('working', 'disconnected');
				expect(result, JSON.stringify({ currentState: 'working', newStatus: 'disconnected' })).toBeNull();
			});

			test('idle to disconnected is invalid', () => {
				const result = handler.validateStateTransition('idle', 'disconnected');
				expect(result, JSON.stringify({ currentState: 'idle', newStatus: 'disconnected' })).not.toBeNull();
			});
		});
	});

	describe('getNextState', () => {
		test('connected moves to working', () => {
			expect(handler.getNextState('idle', 'connected'), JSON.stringify({ currentState: 'idle', status: 'connected' })).toBe('working');
		});

		test('break moves to on_break', () => {
			expect(handler.getNextState('working', 'break'), JSON.stringify({ currentState: 'working', status: 'break' })).toBe('on_break');
		});

		test('lunch moves to on_break', () => {
			expect(handler.getNextState('working', 'lunch'), JSON.stringify({ currentState: 'working', status: 'lunch' })).toBe('on_break');
		});

		test('back moves to working', () => {
			expect(handler.getNextState('on_break', 'back'), JSON.stringify({ currentState: 'on_break', status: 'back' })).toBe('working');
		});

		test('disconnected moves to idle', () => {
			expect(handler.getNextState('working', 'disconnected'), JSON.stringify({ currentState: 'working', status: 'disconnected' })).toBe('idle');
		});

		test('unknown status keeps current state', () => {
			expect(handler.getNextState('working', 'unknown'), JSON.stringify({ currentState: 'working', status: 'unknown' })).toBe('working');
		});
	});

	describe('getUserState', () => {
		test('new user starts in idle state', () => {
			const state = handler.getUserState('c1', 'u1', '2026-05-12');
			expect(state, JSON.stringify({ conv: 'c1', user: 'u1' })).toBe('idle');
		});

		test('same day retains existing state', () => {
			handler.setUserState('c1', 'u1', '2026-05-12', 'working');
			const state = handler.getUserState('c1', 'u1', '2026-05-12');
			expect(state, JSON.stringify({ conv: 'c1', user: 'u1' })).toBe('working');
		});

		test('new day resets state to idle', () => {
			handler.setUserState('c1', 'u1', '2026-05-12', 'working');
			const state = handler.getUserState('c1', 'u1', '2026-05-13');
			expect(state, JSON.stringify({ conv: 'c1', user: 'u1' })).toBe('idle');
		});
	});

	describe('setUserState', () => {
		test('persists state for user and conversation', () => {
			handler.setUserState('c1', 'u1', '2026-05-12', 'on_break');
			const state = handler.getUserState('c1', 'u1', '2026-05-12');
			expect(state, JSON.stringify({ conv: 'c1', user: 'u1' })).toBe('on_break');
		});
	});

	describe('processMessage', () => {
		const base = { conversationId: 'c1', messageId: 'm1', userId: 'u1', userName: 'Alice' };

		test('help command returns help text', async () => {
			const result = await handler.processMessage({ ...base, text: 'help' });
			expect(result, 'help response').toContain('Timesheet Bot Help');
		});

		test('unrecognized message returns error prompt', async () => {
			const result = await handler.processMessage({ ...base, text: 'hello world' });
			expect(result, 'unrecognized response').toContain('could not understand');
		});

		test('ambiguous time returns AM/PM prompt', async () => {
			const result = await handler.processMessage({ ...base, text: 'connected @ 9:30' });
			expect(result, 'ambiguous response').toContain('AM or PM');
		});

		test('valid connected stores entry silently', async () => {
			const result = await handler.processMessage({ ...base, text: 'connected @ 9:00 AM' });
			expect(result, 'connected response').toBeNull();
			const entries = handler.storage.getUserEntries('c1', 'u1');
			expect(entries.length, 'entries after connected').toBe(1);
			expect(entries[0].status, 'stored status').toBe('connected');
		});

		test('invalid break without connected returns error', async () => {
			const result = await handler.processMessage({ ...base, text: 'break @ 12:00 PM' });
			expect(result, 'invalid break response').toContain('connected first');
		});

		test('disconnected after connected returns summary', async () => {
			await handler.processMessage({ ...base, messageId: 'm2', text: 'connected @ 9:00 AM' });
			const result = await handler.processMessage({ ...base, messageId: 'm3', text: 'disconnected @ 5:00 PM' });
			expect(result, 'disconnected summary').toContain('Alice');
			expect(result, 'disconnected summary').toContain('8h');
		});

		test('summary command with entries returns TSV', async () => {
			await handler.processMessage({ ...base, messageId: 'm2', text: 'connected @ 9:00 AM' });
			await handler.processMessage({ ...base, messageId: 'm3', text: 'disconnected @ 5:00 PM' });
			const today = handler.calculator.formatDate(new Date());
			const result = await handler.processMessage({ ...base, messageId: 'm4', text: `summary u1 ${today}` });
			expect(result, 'summary response').toContain('Date');
			expect(result, 'summary response').toContain(today);
		});

		test('summary with invalid format returns error', async () => {
			const result = await handler.processMessage({ ...base, text: 'summary' });
			expect(result, 'invalid summary').toContain('Invalid summary command format');
		});

		test('tally command with entries returns TSV', async () => {
			await handler.processMessage({ ...base, messageId: 'm2', text: 'connected @ 9:00 AM' });
			await handler.processMessage({ ...base, messageId: 'm3', text: 'disconnected @ 5:00 PM' });
			const result = await handler.processMessage({ ...base, messageId: 'm4', text: 'tally 2026-05-12' });
			expect(result, 'tally response').toContain('User ID');
			expect(result, 'tally response').toContain('Alice');
		});

		test('tally with invalid format returns error', async () => {
			const result = await handler.processMessage({ ...base, text: 'tally' });
			expect(result, 'invalid tally').toContain('Invalid tally command format');
		});
	});

	describe('generateUserSummaryTSV', () => {
		test('daily breakdown for short range', () => {
			const entries = [
				{ status: 'connected', timestamp: new Date(2026, 4, 12, 9, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'disconnected', timestamp: new Date(2026, 4, 12, 17, 0), userId: 'u1', userName: 'Alice' },
			];
			const tsv = handler.generateUserSummaryTSV(entries, '2026-05-12', '2026-05-12');
			expect(tsv, 'daily tsv header').toContain('Date');
			expect(tsv, 'daily tsv date').toContain('2026-05-12');
		});

		test('weekly breakdown for long range', () => {
			const entries = [
				{ status: 'connected', timestamp: new Date(2026, 4, 12, 9, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'disconnected', timestamp: new Date(2026, 4, 12, 17, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'connected', timestamp: new Date(2026, 4, 19, 9, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'disconnected', timestamp: new Date(2026, 4, 19, 17, 0), userId: 'u1', userName: 'Alice' },
			];
			const tsv = handler.generateUserSummaryTSV(entries, '2026-05-12', '2026-05-20');
			expect(tsv, 'weekly tsv header').toContain('Week Starting');
		});
	});

	describe('generateTallyTSV', () => {
		test('daily breakdown for short range', () => {
			const entries = [
				{ status: 'connected', timestamp: new Date(2026, 4, 12, 9, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'disconnected', timestamp: new Date(2026, 4, 12, 17, 0), userId: 'u1', userName: 'Alice' },
			];
			const tsv = handler.generateTallyTSV(entries, '2026-05-12', '2026-05-12');
			expect(tsv, 'daily tally header').toContain('User ID');
			expect(tsv, 'daily tally user').toContain('Alice');
		});

		test('weekly breakdown for long range', () => {
			const entries = [
				{ status: 'connected', timestamp: new Date(2026, 4, 12, 9, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'disconnected', timestamp: new Date(2026, 4, 12, 17, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'connected', timestamp: new Date(2026, 4, 19, 9, 0), userId: 'u1', userName: 'Alice' },
				{ status: 'disconnected', timestamp: new Date(2026, 4, 19, 17, 0), userId: 'u1', userName: 'Alice' },
			];
			const tsv = handler.generateTallyTSV(entries, '2026-05-12', '2026-05-20');
			expect(tsv, 'weekly tally header').toContain('Week Starting');
		});
	});
});
