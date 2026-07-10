# Timesheet Automation Bot - Business Logic Scenarios

## 1. Valid Flow

- [ ] Connected should be the first attendance message in a session.
- [ ] Break is allowed only after Connected or Back.
- [ ] Lunch is allowed only after Connected or Back.
- [ ] Back is allowed only after Break or Lunch.
- [ ] Disconnected should close the session.
- [ ] After Disconnected, the next Connected should start a new session.

## 2. Invalid Message Order

- [ ] Any message before Connected should be treated as invalid.
- [ ] Back before Break or Lunch or Connected should be treated as invalid.
- [ ] Disconnected after Break or Lunch without Back should be treated as invalid.
- [ ] Any message after Disconnected in the same session should be invalid.

## 3. Duplicate Messages

- [ ] Connected cannot be posted twice in the same active session.
- [ ] Break cannot be posted twice in a row within the same active session.
- [ ] Lunch cannot be posted twice in a row within the same active session.
- [ ] Back cannot be posted twice in a row within the same active session.
- [ ] Multiple Break and Back pairs are allowed if they follow the correct order.
- [ ] Disconnected cannot be posted twice for the same closed session.
- [ ] Duplicate attendance messages should not create extra time entries.

## 4. Missing Messages

- [ ] If Connected is missing, the session should not start.
- [ ] If Disconnected is missing, the session should stay open.
- [ ] If Back is missing after Break or Lunch, break time should keep running.
- [ ] If a session has only Connected and no Disconnected, it should be treated as incomplete.
- [ ] If no attendance message exists, summary should return no usable work time.

## 5. Session Closed Scenarios

- [ ] Disconnected should mark the session as closed.
- [ ] After Disconnected, the bot should not accept more attendance messages in the same thread for that session.
- [ ] If the user sends another attendance message after Disconnected, the bot should say the session is already closed.
- [ ] A closed session should not be changed by later break or back messages.
- [ ] A new session should only begin with a new Connected message.

## 6. Thread Validation

- [ ] Attendance messages should belong to the correct conversation thread.
- [ ] Messages from another thread should not be mixed into the current session.
- [ ] Summary and tally should use data only from the same conversation.
- [ ] A thread with no matching session should not show work time from another thread.
- [ ] Closing one thread should not close sessions in another thread.

## 7. Time Validation

- [ ] Connected time should be taken from the time in the message when the user gives one.
- [ ] Break, Lunch, Back, and Disconnected should use valid timestamps.
- [ ] If a time is missing, the bot should use the message timestamp when allowed.
- [ ] If the user writes `connected @ 9am`, the bot should use 9:00 AM, not the message timestamp.
- [ ] Invalid time text should be rejected.
- [ ] Future times should not create wrong calculations.
- [ ] Back time should be later than Break or Lunch time.
- [ ] Disconnected time should be later than Connected time.
- [ ] Break time should never be negative.

## 8. Multi-User Scenarios

- [ ] Each user should have their own separate session.
- [ ] One user’s messages should not affect another user’s timesheet.
- [ ] Tally should include all users in the conversation.
- [ ] Summary should show only the requested user.
- [ ] User IDs should be used to keep records separate even in the same thread.
- [ ] Two users can have active sessions at the same time in the same conversation, but each session must stay separate.

## 9. Calculation Scenarios

- [ ] Net hours should be total work time minus break time.
- [ ] Total time should include both work time and break time.
- [ ] Break time should be added from every Break to Back pair.
- [ ] Lunch should be counted as break time too.
- [ ] Multiple breaks in one day should all be added together.
- [ ] If the user disconnects while still on break, the open break time should be counted.
- [ ] Hours should be rounded to 2 decimal places for TSV output.
- [ ] Human-friendly time like `7h 30m` should be shown in disconnect replies.
- [ ] Decimal hours like `7.50` should be shown in summary and tally output.

## 10. Summary and Tally Rules

- [ ] Summary should return data for one user only.
- [ ] Tally should return data for all users in the conversation.
- [ ] A single-day summary should show daily totals.
- [ ] A date range longer than 7 days should show weekly totals.
- [ ] Results should be sorted correctly for easy reading.
- [ ] Empty summary or tally results should still return a valid response.

## 11. Command Scenarios

- [ ] Help should show how to use the bot.
- [ ] Summary should validate user ID and date format.
- [ ] Tally should validate date format.
- [ ] Invalid command text should return a helpful error message.
- [ ] Unknown messages should not be treated as attendance commands.
- [ ] The bot should stay silent for normal attendance messages when processing is successful.

## 12. Real-World Edge Cases

- [ ] Messages must be processed in the correct order.
- [ ] Out-of-order messages should be treated as invalid and should not be stored or calculated.
- [ ] Users may edit a message, and the bot should recalculate the session only if the new order is still valid.
- [ ] Same-day multiple sessions should not merge unless the data shows one continuous session.
- [ ] Overnight or cross-day sessions should be handled in a clear and defined way.
- [ ] If the bot cannot understand a message, it should guide the user with examples.
