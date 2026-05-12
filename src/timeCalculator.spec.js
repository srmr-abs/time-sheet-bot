import { TimeCalculator } from './timeCalculator';

const makeDate = (hours, minutes = 0, dayOffset = 0) => {
	const d = new Date(2026, 4, 12 + dayOffset, hours, minutes);
	return d;
};

const timeEntry = (overrides = {}) => ({
	status: 'connected',
	timestamp: makeDate(9, 0),
	...overrides,
});

describe('TimeCalculator', () => {
	let calc;

	beforeEach(() => {
		calc = new TimeCalculator();
	});

	describe('calculateDaySummary', () => {
		describe('valid entries', () => {
			test('simple connected and disconnected calculates 8 hours', () => {
				const entries = [
					timeEntry({ status: 'connected', timestamp: makeDate(9, 0) }),
					timeEntry({ status: 'disconnected', timestamp: makeDate(17, 0) }),
				];
				const result = calc.calculateDaySummary(entries);
				expect(result, JSON.stringify({ input: entries })).toEqual(
					expect.objectContaining({
						workMinutes: 480,
						breakMinutes: 0,
						totalMinutes: 480,
					})
				);
			});

			test('break time is subtracted from work time', () => {
				const entries = [
					timeEntry({ status: 'connected', timestamp: makeDate(9, 0) }),
					timeEntry({ status: 'break', timestamp: makeDate(12, 0) }),
					timeEntry({ status: 'back', timestamp: makeDate(13, 0) }),
					timeEntry({ status: 'disconnected', timestamp: makeDate(17, 0) }),
				];
				const result = calc.calculateDaySummary(entries);
				expect(result, JSON.stringify({ input: entries })).toEqual(
					expect.objectContaining({
						workMinutes: 420,
						breakMinutes: 60,
						totalMinutes: 480,
					})
				);
			});

			test('disconnected while on break adds remaining break time', () => {
				const entries = [
					timeEntry({ status: 'connected', timestamp: makeDate(9, 0) }),
					timeEntry({ status: 'break', timestamp: makeDate(12, 0) }),
					timeEntry({ status: 'disconnected', timestamp: makeDate(14, 0) }),
				];
				const result = calc.calculateDaySummary(entries);
				expect(result, JSON.stringify({ input: entries })).toEqual(
					expect.objectContaining({
						workMinutes: 180,
						breakMinutes: 120,
						totalMinutes: 300,
					})
				);
			});

			test('multiple breaks are both subtracted', () => {
				const entries = [
					timeEntry({ status: 'connected', timestamp: makeDate(9, 0) }),
					timeEntry({ status: 'break', timestamp: makeDate(11, 0) }),
					timeEntry({ status: 'back', timestamp: makeDate(11, 15) }),
					timeEntry({ status: 'break', timestamp: makeDate(12, 0) }),
					timeEntry({ status: 'back', timestamp: makeDate(13, 0) }),
					timeEntry({ status: 'disconnected', timestamp: makeDate(17, 0) }),
				];
				const result = calc.calculateDaySummary(entries);
				expect(result, JSON.stringify({ input: entries })).toEqual(
					expect.objectContaining({
						workMinutes: 405,
						breakMinutes: 75,
						totalMinutes: 480,
					})
				);
			});

			test('sorts out-of-order entries before calculating', () => {
				const entries = [
					timeEntry({ status: 'disconnected', timestamp: makeDate(17, 0) }),
					timeEntry({ status: 'connected', timestamp: makeDate(9, 0) }),
				];
				const result = calc.calculateDaySummary(entries);
				expect(result, JSON.stringify({ input: entries })).toEqual(
					expect.objectContaining({
						workMinutes: 480,
						breakMinutes: 0,
						totalMinutes: 480,
					})
				);
			});
		});

		describe('edge cases', () => {
			test('empty entries returns null', () => {
				const result = calc.calculateDaySummary([]);
				expect(result, JSON.stringify({ input: [] })).toBeNull();
			});
		});
	});

	describe('formatDuration', () => {
		describe('positive minutes', () => {
			test('exact hours returns hours only', () => {
				expect(calc.formatDuration(120), 'input: 120').toBe('2h');
			});

			test('less than one hour returns minutes only', () => {
				expect(calc.formatDuration(45), 'input: 45').toBe('45m');
			});

			test('hours and minutes returns combined string', () => {
				expect(calc.formatDuration(125), 'input: 125').toBe('2h 5m');
			});

			test('zero minutes returns 0m', () => {
				expect(calc.formatDuration(0), 'input: 0').toBe('0m');
			});

			test('exactly one hour returns 1h', () => {
				expect(calc.formatDuration(60), 'input: 60').toBe('1h');
			});
		});
	});

	describe('formatHoursDecimal', () => {
		test('converts minutes to fixed two-decimal hours', () => {
			expect(calc.formatHoursDecimal(90), 'input: 90').toBe('1.50');
		});

			test('zero minutes returns 0.00', () => {
			expect(calc.formatHoursDecimal(0), 'input: 0').toBe('0.00');
		});
	});

	describe('getMinutesDiff', () => {
		test('calculates minutes between two dates', () => {
			const start = makeDate(9, 0);
			const end = makeDate(17, 30);
			expect(calc.getMinutesDiff(start, end), JSON.stringify({ start, end })).toBe(510);
		});
	});

	describe('formatDate', () => {
		test('returns local date as YYYY-MM-DD', () => {
			const d = new Date(2026, 0, 5);
			expect(calc.formatDate(d), JSON.stringify({ input: d })).toBe('2026-01-05');
		});
	});

	describe('parseDate', () => {
		describe('valid strings', () => {
			test('parses ISO-like date string', () => {
				const result = calc.parseDate('2026-05-12');
				expect(result, 'input: 2026-05-12').not.toBeNull();
				expect(result.getFullYear(), 'year').toBe(2026);
				expect(result.getMonth(), 'month').toBe(4);
				expect(result.getDate(), 'day').toBe(12);
			});
		});

		describe('invalid strings', () => {
			test('returns null for invalid date', () => {
				expect(calc.parseDate('not-a-date'), 'input: not-a-date').toBeNull();
			});
		});
	});

	describe('getWeekBoundaries', () => {
		test('returns Sunday and Saturday for a mid-week date', () => {
			const d = new Date(2026, 4, 14); // Wednesday
			const { weekStart, weekEnd } = calc.getWeekBoundaries(d);
			expect(weekStart.getDay(), 'start day of week').toBe(0); // Sunday
			expect(weekEnd.getDay(), 'end day of week').toBe(6); // Saturday
			expect(weekEnd.getTime() - weekStart.getTime(), JSON.stringify({ weekStart, weekEnd })).toBe(6 * 24 * 60 * 60 * 1000);
		});
	});

	describe('getSummaryText', () => {
		test('formats markdown summary with user and date', () => {
			const summary = { workMinutes: 480, breakMinutes: 0 };
			const result = calc.getSummaryText(summary, 'Alice', '2026-05-12');
			expect(result, JSON.stringify({ input: summary })).toContain('Alice');
			expect(result, JSON.stringify({ input: summary })).toContain('2026-05-12');
			expect(result, JSON.stringify({ input: summary })).toContain('8h');
		});

		test('includes break time when present', () => {
			const summary = { workMinutes: 420, breakMinutes: 60 };
			const result = calc.getSummaryText(summary, 'Bob', '2026-05-12');
			expect(result, JSON.stringify({ input: summary })).toContain('Break: 1h');
		});

		test('omits break text when break is zero', () => {
			const summary = { workMinutes: 480, breakMinutes: 0 };
			const result = calc.getSummaryText(summary, 'Carol', '2026-05-12');
			expect(result, JSON.stringify({ input: summary })).not.toContain('Break:');
		});
	});
});
