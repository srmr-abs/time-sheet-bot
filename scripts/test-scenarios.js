#!/usr/bin/env node
/**
 * Debug script: run multiple user-input scenarios through TimesheetHandler
 * and print parsed values, state transitions, stored entries, and calculations.
 *
 * Usage: node scripts/test-scenarios.js [scenario-name]
 *   e.g. node scripts/test-scenarios.js simple-day
 *   e.g. node scripts/test-scenarios.js all
 */

const { TimesheetHandler } = require('../src/timesheet-handler');

const CONV_ID = 'debug-conv-1';
const USER_ID = 'user-1';
const USER_NAME = 'Alice';

let msgCounter = 0;
function nextMsgId() {
	msgCounter++;
	return `msg-${msgCounter}`;
}

/**
 * Simulate a full conversation: send each message and log the result.
 */
async function runScenario(name, inputs) {
	console.log('\n' + '='.repeat(70));
	console.log(`SCENARIO: ${name}`);
	console.log('='.repeat(70));

	const handler = new TimesheetHandler();

	for (const input of inputs) {
		const text = typeof input === 'string' ? input : input.text;
		const expectedError = typeof input === 'object' ? input.expectError : false;
		const msgId = nextMsgId();

		console.log(`\n--- Message: "${text}" ---`);

		const result = await handler.processMessage({
			text,
			conversationId: CONV_ID,
			messageId: msgId,
			userId: USER_ID,
			userName: USER_NAME,
		});

		// Show parser output
		const parsed = handler.parser.parse(text);
		console.log(`  Parsed status     : ${parsed.status || '(none)'}`);
		if (parsed.timestamp && parsed.timestamp.ambiguous) {
			console.log(`  Parsed timestamp  : AMBIGUOUS (needs AM/PM)`);
		} else if (parsed.timestamp) {
			console.log(`  Parsed timestamp  : ${parsed.timestamp.toLocaleTimeString()}`);
		} else {
			console.log(`  Parsed timestamp  : (now)`);
		}
		console.log(`  Parsed notes      : "${parsed.notes || ''}"`);

		// Show state
		const today = handler.calculator.formatDate(new Date());
		const state = handler.getUserState(CONV_ID, USER_ID, today);
		console.log(`  User state after  : ${state}`);

		// Show stored entries
		const entries = handler.storage.getUserEntries(CONV_ID, USER_ID);
		console.log(`  Stored entries    : ${entries.length}`);
		for (const e of entries) {
			const time = e.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			console.log(`    [${e.status.padEnd(12)}] ${time}  msg=${e.messageId}`);
		}

		// Show response
		if (result) {
			const lines = result.split('\n');
			console.log(`  Bot response:`);
			for (const line of lines) {
				console.log(`    ${line}`);
			}
			if (expectedError) {
				console.log(`  [Expected error: yes]`);
			}
		} else {
			console.log(`  Bot response      : (silent - tracked)`);
		}
	}

	// Final summary
	const entries = handler.storage.getUserEntries(CONV_ID, USER_ID);
	if (entries.length > 0) {
		const today = handler.calculator.formatDate(new Date());
		const dayEntries = handler.storage.getUserEntriesByDateRange(CONV_ID, USER_ID, today, today);
		const summary = handler.calculator.calculateDaySummary(dayEntries);
		if (summary) {
			console.log('\n--- Final Calculation ---');
			console.log(`  Total time : ${handler.calculator.formatDuration(summary.totalMinutes)}`);
			console.log(`  Break time : ${handler.calculator.formatDuration(summary.breakMinutes)}`);
			console.log(`  Net work   : ${handler.calculator.formatDuration(summary.workMinutes)}`);
			console.log(`  (raw: total=${summary.totalMinutes}, break=${summary.breakMinutes}, work=${summary.workMinutes})`);
		}
	}
}

/**
 * Scenarios
 */
const SCENARIOS = {
	'simple-day': {
		description: 'A simple 9-to-5 workday with no breaks',
		inputs: [
			'connected @ 9:00 AM',
			'disconnected @ 5:00 PM',
		],
	},
	'with-breaks': {
		description: 'A workday with one lunch break',
		inputs: [
			'connected @ 8:30 AM',
			'break @ 12:00 PM',
			'back @ 1:00 PM',
			'disconnected @ 5:30 PM',
		],
	},
	'multiple-breaks': {
		description: 'A workday with two breaks',
		inputs: [
			'connected @ 9:00 AM',
			'break @ 11:00 AM',
			'back @ 11:15 AM',
			'lunch @ 12:30 PM',
			'back @ 1:30 PM',
			'disconnected @ 6:00 PM',
		],
	},
	'disconnected-while-on-break': {
		description: 'Disconnecting while on break counts remaining break time',
		inputs: [
			'connected @ 9:00 AM',
			'break @ 12:00 PM',
			'disconnected @ 2:00 PM',
		],
	},
	'multiple-sessions': {
		description: 'Two separate work sessions in one day',
		inputs: [
			'connected @ 9:00 AM',
			'break @ 11:00 AM',
			'back @ 11:15 AM',
			'disconnected @ 12:00 PM',
			'connected @ 2:00 PM',
			'disconnected @ 5:00 PM',
		],
	},
	'ambiguous-time': {
		description: 'Ambiguous time without AM/PM should prompt for clarification',
		inputs: [
			{ text: 'connected @ 9:30', expectError: true },
			'connected @ 9:30 AM',
			'disconnected @ 5:30 PM',
		],
	},
	'state-guards': {
		description: 'Invalid state transitions should return errors',
		inputs: [
			{ text: 'break @ 12:00 PM', expectError: true }, // idle -> break is invalid
			'connected @ 9:00 AM',
			{ text: 'connected @ 10:00 AM', expectError: true }, // already working
			'break @ 12:00 PM',
			{ text: 'break @ 2:00 PM', expectError: true }, // already on break
			'back @ 1:00 PM',
			{ text: 'back @ 3:00 PM', expectError: true }, // not on break
			'disconnected @ 5:00 PM',
			{ text: 'disconnected @ 5:00 PM', expectError: true }, // already idle
		],
	},
	'notes-preserved': {
		description: 'Notes should be extracted and preserved',
		inputs: [
			'connected @ 8:00 AM working on project Alpha',
			'break @ 12:00 PM lunch with team',
			'back @ 1:00 PM',
			'disconnected @ 5:00 PM wrapping up',
		],
	},
	'overnight-edge': {
		description: 'Very short session and single-minute breaks',
		inputs: [
			'connected @ 9:00 AM',
			'break @ 9:01 AM',
			'back @ 9:02 AM',
			'disconnected @ 9:03 AM',
		],
	},
};

async function main() {
	const args = process.argv.slice(2);
	const target = args[0] || 'all';

	if (target === 'all') {
		for (const [name, scenario] of Object.entries(SCENARIOS)) {
			await runScenario(`${name} — ${scenario.description}`, scenario.inputs);
		}
	} else if (SCENARIOS[target]) {
		await runScenario(`${target} — ${SCENARIOS[target].description}`, SCENARIOS[target].inputs);
	} else {
		console.log(`Unknown scenario: ${target}`);
		console.log(`Available scenarios:`);
		for (const [name, scenario] of Object.entries(SCENARIOS)) {
			console.log(`  ${name.padEnd(25)} - ${scenario.description}`);
		}
		console.log(`\nUsage: node scripts/test-scenarios.js [scenario-name]`);
		process.exit(1);
	}

	console.log('\n' + '='.repeat(70));
	console.log('Done.');
	console.log('='.repeat(70));
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
