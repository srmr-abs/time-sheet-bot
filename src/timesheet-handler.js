const { MessageParser } = require('./parser');
const { TimeCalculator } = require('./timeCalculator');
const { Storage } = require('./storage');

/**
 * Framework-agnostic timesheet handler.
 * Extracted from src/bot.js so it can be used with either
 * Bot Framework SDK or Teams Apps SDK.
 */
class TimesheetHandler {
	constructor() {
		this.parser = new MessageParser();
		this.calculator = new TimeCalculator();
		this.storage = new Storage();
		// conversationId -> userId -> { state, date }
		this.userStates = new Map();
	}

	getUserState(conversationId, userId, date) {
		if (!this.userStates.has(conversationId)) {
			this.userStates.set(conversationId, new Map());
		}
		const convo = this.userStates.get(conversationId);

		if (!convo.has(userId)) {
			convo.set(userId, { state: 'idle', date });
		}

		const record = convo.get(userId);
		if (record.date !== date) {
			record.state = 'idle';
			record.date = date;
		}

		return record.state;
	}

	setUserState(conversationId, userId, date, newState) {
		if (!this.userStates.has(conversationId)) {
			this.userStates.set(conversationId, new Map());
		}
		this.userStates.get(conversationId).set(userId, { state: newState, date });
	}

	validateStateTransition(currentState, newStatus) {
		if (newStatus === 'connected') {
			if (currentState === 'working') {
				return 'You are already connected. If you need to change your start time, edit your previous message.';
			}
			if (currentState === 'on_break') {
				return 'You are on a break. Send back first, or disconnected to end your day.';
			}
			return null;
		}

		if (newStatus === 'break' || newStatus === 'lunch') {
			if (currentState === 'idle') {
				return 'You need to be connected first. Send connected to start your day.';
			}
			if (currentState === 'on_break') {
				return 'You are already on a break. Send back when you return.';
			}
			return null;
		}

		if (newStatus === 'back') {
			if (currentState === 'idle') {
				return 'You need to be connected first. Send connected to start your day.';
			}
			if (currentState === 'working') {
				return 'You are not on a break. Send break or lunch first.';
			}
			return null;
		}

		if (newStatus === 'disconnected') {
			if (currentState === 'idle') {
				return 'No active session found. Send connected to start your day.';
			}
			return null;
		}

		return null;
	}

	getNextState(currentState, status) {
		if (status === 'connected') return 'working';
		if (status === 'break' || status === 'lunch') return 'on_break';
		if (status === 'back') return 'working';
		if (status === 'disconnected') return 'idle';
		return currentState;
	}

	async processMessage({ text, conversationId, messageId, userId, userName }) {
		const trimmedText = (text || '').trim();

		if (trimmedText.toLowerCase() === 'help') {
			return this.parser.getHelpText();
		}

		const lowerText = trimmedText.toLowerCase();
		if (lowerText === 'summary' || lowerText.startsWith('summary ')) {
			return this.handleSummaryCommand(conversationId, trimmedText);
		}

		if (lowerText === 'tally' || lowerText.startsWith('tally ')) {
			return this.handleTallyCommand(conversationId, trimmedText);
		}

		const parsed = this.parser.parse(trimmedText);

		if (!parsed.status) {
			return `**I could not understand that message.**\n\n` +
				`I was looking for status keywords like: **connected**, **disconnected**, **break**, **lunch**, or **back**\n\n` +
				`**Here are some examples:**\n` +
				this.parser.getSuggestions(trimmedText);
		}

		if (parsed.timestamp && parsed.timestamp.ambiguous) {
			return `**I need AM or PM to understand that time.**\n\n` +
				`You wrote: \`${trimmedText}\`\n\n` +
				`Please use one of these formats:\n` +
				`* \`connected @ 9:00 AM\`\n` +
				`* \`break 2 PM\`\n` +
				`* \`disconnected @ 5:30 PM\`\n\n` +
				`Or just send \`${parsed.status}\` without a time to use the current time.`;
		}

		const timestamp = parsed.timestamp || new Date();
		const date = this.calculator.formatDate(timestamp);

		const currentState = this.getUserState(conversationId, userId, date);
		const error = this.validateStateTransition(currentState, parsed.status);

		if (error) {
			return `**${error}**`;
		}

		const nextState = this.getNextState(currentState, parsed.status);
		this.setUserState(conversationId, userId, date, nextState);

		const entry = {
			messageId,
			userId,
			userName,
			date,
			timestamp,
			status: parsed.status,
			notes: parsed.notes
		};

		this.storage.storeMessage(conversationId, messageId, entry);

		if (parsed.status === 'disconnected') {
			const entries = this.storage.getUserEntriesByDateRange(
				conversationId,
				userId,
				date,
				date
			);

			const summary = this.calculator.calculateDaySummary(entries);
			if (summary) {
				return this.calculator.getSummaryText(summary, userName, date);
			}
		}

		return null;
	}

	handleSummaryCommand(conversationId, text) {
		const parts = text.trim().split(/\s+/);

		if (parts.length < 3) {
			return `**Invalid summary command format**\n\n` +
				`Usage: \`summary <user-id> <from-date> [to-date]\`\n` +
				`Example: \`summary user123 2026-02-20 2026-02-22\`\n` +
				`Example: \`summary user123 2026-02-20\` (defaults to today)`;
		}

		const targetUserId = parts[1];
		const fromDate = parts[2];
		const toDate = parts[3] || this.calculator.formatDate(new Date());

		if (!this.calculator.parseDate(fromDate) || !this.calculator.parseDate(toDate)) {
			return `**Invalid date format**\n\n` +
				`Please use YYYY-MM-DD format\n` +
				`Example: \`summary user123 2026-02-20 2026-02-22\``;
		}

		const entries = this.storage.getUserEntriesByDateRange(
			conversationId,
			targetUserId,
			fromDate,
			toDate
		);

		if (entries.length === 0) {
			return `No timesheet entries found for user ${targetUserId} between ${fromDate} and ${toDate}`;
		}

		const tsv = this.generateUserSummaryTSV(entries, fromDate, toDate);
		return '```\n' + tsv + '```';
	}

	handleTallyCommand(conversationId, text) {
		const parts = text.trim().split(/\s+/);

		if (parts.length < 2) {
			return `**Invalid tally command format**\n\n` +
				`Usage: \`tally <from-date> [to-date]\`\n` +
				`Example: \`tally 2026-02-20 2026-02-22\`\n` +
				`Example: \`tally 2026-02-20\` (defaults to today)`;
		}

		const fromDate = parts[1];
		const toDate = parts[2] || this.calculator.formatDate(new Date());

		if (!this.calculator.parseDate(fromDate) || !this.calculator.parseDate(toDate)) {
			return `**Invalid date format**\n\n` +
				`Please use YYYY-MM-DD format\n` +
				`Example: \`tally 2026-02-20 2026-02-22\``;
		}

		const entries = this.storage.getAllEntriesByDateRange(
			conversationId,
			fromDate,
			toDate
		);

		if (entries.length === 0) {
			return `No timesheet entries found between ${fromDate} and ${toDate}`;
		}

		const tsv = this.generateTallyTSV(entries, fromDate, toDate);
		return '```\n' + tsv + '```';
	}

	generateUserSummaryTSV(entries, fromDate, toDate) {
		const grouped = this.storage.groupByDate(entries);
		const dates = Array.from(grouped.keys()).sort();

		const daysDiff = Math.ceil(
			(new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
		);

		if (daysDiff <= 7) {
			let tsv = 'Date\tHours\tBreak Hours\tNet Hours\n';

			for (const date of dates) {
				const dayEntries = grouped.get(date);
				const summary = this.calculator.calculateDaySummary(dayEntries);

				if (summary) {
					const totalHours = this.calculator.formatHoursDecimal(summary.totalMinutes);
					const breakHours = this.calculator.formatHoursDecimal(summary.breakMinutes);
					const netHours = this.calculator.formatHoursDecimal(summary.workMinutes);

					tsv += `${date}\t${totalHours}\t${breakHours}\t${netHours}\n`;
				}
			}

			return tsv;
		}

		const weeklyData = new Map();

		for (const date of dates) {
			const dateObj = new Date(date);
			const { weekStart } = this.calculator.getWeekBoundaries(dateObj);
			const weekKey = this.calculator.formatDate(weekStart);

			if (!weeklyData.has(weekKey)) {
				weeklyData.set(weekKey, []);
			}

			weeklyData.get(weekKey).push(...grouped.get(date));
		}

		let tsv = 'Week Starting\tHours\tBreak Hours\tNet Hours\n';

		const weeks = Array.from(weeklyData.keys()).sort();
		for (const week of weeks) {
			const weekEntries = weeklyData.get(week);
			const summary = this.calculator.calculateDaySummary(weekEntries);

			if (summary) {
				const totalHours = this.calculator.formatHoursDecimal(summary.totalMinutes);
				const breakHours = this.calculator.formatHoursDecimal(summary.breakMinutes);
				const netHours = this.calculator.formatHoursDecimal(summary.workMinutes);

				tsv += `${week}\t${totalHours}\t${breakHours}\t${netHours}\n`;
			}
		}

		return tsv;
	}

	generateTallyTSV(entries, fromDate, toDate) {
		const grouped = this.storage.groupByUserAndDate(entries);

		const daysDiff = Math.ceil(
			(new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
		);

		if (daysDiff <= 7) {
			let tsv = 'User ID\tUser Name\tDate\tHours\tBreak Hours\tNet Hours\n';

			grouped.sort((a, b) => {
				if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
				return a.date.localeCompare(b.date);
			});

			for (const group of grouped) {
				const summary = this.calculator.calculateDaySummary(group.entries);

				if (summary) {
					const totalHours = this.calculator.formatHoursDecimal(summary.totalMinutes);
					const breakHours = this.calculator.formatHoursDecimal(summary.breakMinutes);
					const netHours = this.calculator.formatHoursDecimal(summary.workMinutes);

					tsv += `${group.userId}\t${group.userName}\t${group.date}\t${totalHours}\t${breakHours}\t${netHours}\n`;
				}
			}

			return tsv;
		}

		const weeklyData = new Map();

		for (const group of grouped) {
			const dateObj = new Date(group.date);
			const { weekStart } = this.calculator.getWeekBoundaries(dateObj);
			const weekKey = `${group.userId}|${this.calculator.formatDate(weekStart)}`;

			if (!weeklyData.has(weekKey)) {
				weeklyData.set(weekKey, {
					userId: group.userId,
					userName: group.userName,
					week: this.calculator.formatDate(weekStart),
					entries: []
				});
			}

			weeklyData.get(weekKey).entries.push(...group.entries);
		}

		let tsv = 'User ID\tUser Name\tWeek Starting\tHours\tBreak Hours\tNet Hours\n';

		const weeks = Array.from(weeklyData.values()).sort((a, b) => {
			if (a.userId !== b.userId) return a.userId.localeCompare(b.userId);
			return a.week.localeCompare(b.week);
		});

		for (const week of weeks) {
			const summary = this.calculator.calculateDaySummary(week.entries);

			if (summary) {
				const totalHours = this.calculator.formatHoursDecimal(summary.totalMinutes);
				const breakHours = this.calculator.formatHoursDecimal(summary.breakMinutes);
				const netHours = this.calculator.formatHoursDecimal(summary.workMinutes);

				tsv += `${week.userId}\t${week.userName}\t${week.week}\t${totalHours}\t${breakHours}\t${netHours}\n`;
			}
		}

		return tsv;
	}
}

module.exports = { TimesheetHandler };
