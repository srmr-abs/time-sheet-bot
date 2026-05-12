const { TimesheetHandler } = require('./src/timesheet-handler');

/**
 * Automated verification of the timesheet bot core logic.
 * Run with: node test-timesheet.js
 */

async function runTests() {
	console.log('=== Timesheet Bot Core Logic Tests ===\n');
	let passed = 0;
	let failed = 0;

	function assertEqual(actual, expected, label) {
		if (actual === expected) {
			console.log(`  PASS: ${label}`);
			passed++;
		} else {
			console.log(`  FAIL: ${label}`);
			console.log(`    Expected: ${expected}`);
			console.log(`    Actual:   ${actual}`);
			failed++;
		}
	}

	function assertIncludes(text, substring, label) {
		if (text && text.includes(substring)) {
			console.log(`  PASS: ${label}`);
			passed++;
		} else {
			console.log(`  FAIL: ${label}`);
			console.log(`    Expected to include: ${substring}`);
			console.log(`    Actual: ${text}`);
			failed++;
		}
	}

	const handler = new TimesheetHandler();
	const conv = 'test-conv';
	const user = 'test-user';
	const name = 'TestUser';

	// Test 1: Help command
	console.log('1. Help command');
	const help = await handler.processMessage({
		text: 'help',
		conversationId: conv, messageId: 'h1', userId: user, userName: name
	});
	assertIncludes(help, 'Timesheet Bot Help', 'returns help text');

	// Test 2: Invalid message
	console.log('\n2. Invalid message (unrecognized input)');
	const invalid = await handler.processMessage({
		text: 'hello world',
		conversationId: conv, messageId: 'i1', userId: user, userName: name
	});
	assertIncludes(invalid, "could not understand", 'rejects unknown message');

	// Test 3: Disconnected without starting
	console.log('\n3. Disconnected without starting');
	const discNoStart = await handler.processMessage({
		text: 'disconnected',
		conversationId: conv, messageId: 'd1', userId: user, userName: name
	});
	assertIncludes(discNoStart, 'No active session found', 'rejects disconnect before connect');

	// Test 4: Full work day simulation
	console.log('\n4. Full work day simulation');
	let r1 = await handler.processMessage({
		text: 'connected @ 9:00 AM',
		conversationId: conv, messageId: 'm1', userId: user, userName: name
	});
	assertEqual(r1, null, 'connected is silent');

	let r2 = await handler.processMessage({
		text: 'break @ 11:30 AM',
		conversationId: conv, messageId: 'm2', userId: user, userName: name
	});
	assertEqual(r2, null, 'break is silent');

	let r3 = await handler.processMessage({
		text: 'back @ 12:00 PM',
		conversationId: conv, messageId: 'm3', userId: user, userName: name
	});
	assertEqual(r3, null, 'back is silent');

	let r4 = await handler.processMessage({
		text: 'lunch @ 1:00 PM',
		conversationId: conv, messageId: 'm4', userId: user, userName: name
	});
	assertEqual(r4, null, 'lunch is silent');

	let r5 = await handler.processMessage({
		text: 'back @ 2:00 PM',
		conversationId: conv, messageId: 'm5', userId: user, userName: name
	});
	assertEqual(r5, null, 'back after lunch is silent');

	let r6 = await handler.processMessage({
		text: 'disconnected @ 5:30 PM',
		conversationId: conv, messageId: 'm6', userId: user, userName: name
	});
	assertIncludes(r6, 'Net Work Time: 7h', 'disconnected shows correct net hours');
	assertIncludes(r6, 'Break: 1h 30m', 'disconnected shows correct break duration');

	// Test 5: Summary command
	console.log('\n5. Summary command');
	const today = new Date().toISOString().split('T')[0];
	const summary = await handler.processMessage({
		text: `summary ${user} ${today}`,
		conversationId: conv, messageId: 's1', userId: user, userName: name
	});
	assertIncludes(summary, 'Net Hours', 'summary contains Net Hours header');
	assertIncludes(summary, '7.00', 'summary shows correct net hours');

	// Test 6: Invalid transition - break before connect
	console.log('\n6. State transition validation');
	const handler2 = new TimesheetHandler();
	const breakBeforeConnect = await handler2.processMessage({
		text: 'break',
		conversationId: 'conv2', messageId: 'b1', userId: 'u2', userName: 'User2'
	});
	assertIncludes(breakBeforeConnect, 'need to be connected first', 'rejects break before connect');

	// Test 7: Ambiguous time detection
	console.log('\n7. Ambiguous time (missing AM/PM)');
	const ambiguous = await handler2.processMessage({
		text: 'connected @ 9:30',
		conversationId: 'conv2', messageId: 'a1', userId: 'u2', userName: 'User2'
	});
	assertIncludes(ambiguous, 'need AM or PM', 'asks for AM/PM when ambiguous');

	// Results
	console.log('\n=== Results ===');
	console.log(`Passed: ${passed}`);
	console.log(`Failed: ${failed}`);
	process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
	console.error(err);
	process.exit(1);
});
