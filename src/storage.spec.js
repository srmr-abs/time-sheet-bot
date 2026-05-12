import { Storage } from './storage';

describe('Storage', () => {
	let storage;

	beforeEach(() => {
		storage = new Storage();
	});

	describe('storeMessage', () => {
		test('stores entry under conversation and message id', () => {
			storage.storeMessage('conv1', 'msg1', { userId: 'u1', status: 'connected' });
			const entries = storage.getUserEntries('conv1', 'u1');
			expect(entries.length, 'entries length').toBe(1);
			expect(entries[0].status, 'entry status').toBe('connected');
		});
	});

	describe('getUserEntriesByDateRange', () => {
		test('returns entries within date range', () => {
			storage.storeMessage('conv1', 'msg1', {
				userId: 'u1',
				status: 'connected',
				timestamp: new Date(2026, 4, 10, 9, 0),
			});
			storage.storeMessage('conv1', 'msg2', {
				userId: 'u1',
				status: 'disconnected',
				timestamp: new Date(2026, 4, 10, 17, 0),
			});
			const result = storage.getUserEntriesByDateRange('conv1', 'u1', '2026-05-10', '2026-05-10');
			expect(result.length, JSON.stringify({ range: '2026-05-10 to 2026-05-10' })).toBe(2);
		});

		test('excludes entries outside date range', () => {
			storage.storeMessage('conv1', 'msg1', {
				userId: 'u1',
				status: 'connected',
				timestamp: new Date(2026, 4, 10, 9, 0),
			});
			const result = storage.getUserEntriesByDateRange('conv1', 'u1', '2026-05-12', '2026-05-12');
			expect(result.length, JSON.stringify({ range: '2026-05-12 to 2026-05-12' })).toBe(0);
		});
	});

	describe('groupByDate', () => {
		test('groups entries by local date', () => {
			storage.storeMessage('conv1', 'msg1', {
				userId: 'u1',
				status: 'connected',
				timestamp: new Date(2026, 4, 10, 9, 0),
			});
			storage.storeMessage('conv1', 'msg2', {
				userId: 'u1',
				status: 'disconnected',
				timestamp: new Date(2026, 4, 10, 17, 0),
			});
			const entries = storage.getAllEntries('conv1');
			const grouped = storage.groupByDate(entries);
			expect(grouped.has('2026-05-10'), JSON.stringify({ entries })).toBe(true);
			expect(grouped.get('2026-05-10').length, 'grouped count').toBe(2);
		});
	});

	describe('groupByUserAndDate', () => {
		test('groups entries by user id and date', () => {
			storage.storeMessage('conv1', 'msg1', {
				userId: 'u1',
				userName: 'Alice',
				status: 'connected',
				timestamp: new Date(2026, 4, 10, 9, 0),
			});
			storage.storeMessage('conv1', 'msg2', {
				userId: 'u1',
				userName: 'Alice',
				status: 'disconnected',
				timestamp: new Date(2026, 4, 10, 17, 0),
			});
			const entries = storage.getAllEntries('conv1');
			const grouped = storage.groupByUserAndDate(entries);
			expect(grouped.length, JSON.stringify({ entries })).toBe(1);
			expect(grouped[0].userId, 'userId').toBe('u1');
			expect(grouped[0].entries.length, 'entries count').toBe(2);
		});
	});

	describe('getUniqueUsers', () => {
		test('returns map of unique users in a conversation', () => {
			storage.storeMessage('conv1', 'msg1', { userId: 'u1', userName: 'Alice' });
			storage.storeMessage('conv1', 'msg2', { userId: 'u2', userName: 'Bob' });
			const result = storage.getUniqueUsers('conv1');
			expect(result.has('u1'), 'has u1').toBe(true);
			expect(result.get('u1'), 'u1 name').toBe('Alice');
			expect(result.has('u2'), 'has u2').toBe(true);
		});
	});
});
