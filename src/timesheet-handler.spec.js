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
});
