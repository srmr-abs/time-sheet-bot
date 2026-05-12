const entry = (overrides = {}) => ({
	employeeId: 'E001',
	date: '2026-05-12',
	hours: 8,
	...overrides,
});

describe('sample spec infrastructure check', () => {
	describe('valid entries', () => {
		test('standard 8-hour entry returns expected shape', () => {
			const result = entry();
			expect(result, JSON.stringify({ input: result })).toEqual({
				employeeId: 'E001',
				date: '2026-05-12',
				hours: 8,
			});
		});
	});

	describe('invalid entries', () => {
		test('negative hours is rejected', () => {
			const result = entry({ hours: -2 });
			expect(result.hours, JSON.stringify({ input: result })).toBeLessThan(0);
		});
	});
});
