# Attendance Calculation Architecture Proposal

## Purpose

This document summarizes the proposed new business logic for the Timesheet Automation bot.

The goal is to improve the user experience in Microsoft Teams by removing the need to mention the bot for every attendance update.

---

## Current Problem

Today, the bot only receives and processes channel messages when users mention it.

So users must type messages like:

- `@TimeSheetAutomation connected`
- `@TimeSheetAutomation break`
- `@TimeSheetAutomation back`
- `@TimeSheetAutomation lunch`
- `@TimeSheetAutomation disconnected`

This is inconvenient and does not feel natural for users.

---

## Proposed New Approach

The attendance channel is used only for attendance logging.

Users will post normal attendance messages in the channel without mentioning the bot, for example:

- `connected @ 9:00 AM`
- `break`
- `back @ 1:00 PM`
- `disconnected @ 6:00 PM`

The bot will ignore these messages while they are being posted.

When the user wants to calculate work hours, they will send one command by mentioning the bot:

- `@TimeSheetAutomation calculate`

At that time, the bot will:

1. Read the user’s messages for the current day from the attendance channel.
2. Identify valid attendance keywords:
   - `connected`
   - `break`
   - `lunch`
   - `back`
   - `disconnected`
3. Build the user’s timeline in chronological order.
4. Use the manual time if a message contains one.
5. Use the Teams message timestamp if no manual time is given.
6. Validate the full sequence.
7. If validation fails, reply with a clear error.
8. If validation passes, calculate total working time after subtracting break/lunch time.

---

## Why This Is a Good Fit

This approach is a strong fit because the channel is dedicated only to attendance logging.

That means:

- users are already expected to post only attendance-related messages
- the bot does not need to worry much about unrelated chat
- parsing is simpler
- validation is cleaner
- the user experience is better

---

## Main Advantages

### 1. Better user experience
Users do not need to mention the bot for every update.

They can simply post:

- `connected`
- `break`
- `back`
- `disconnected`

and mention the bot only once when they want calculation.

### 2. Better fit for Teams channel behavior
Teams channels do not reliably send every normal message to the bot unless the bot is mentioned.

This new design works around that limitation by using one explicit command only for calculation.

### 3. Simpler live bot behavior
The bot does not need to track state in real time throughout the day.

Instead, it reads the day’s attendance messages only when needed and calculates from the full timeline.

### 4. Better validation
Because the bot checks the entire day at once, it can detect problems more clearly, such as:

- break before connected
- back without break
- disconnected missing
- duplicate connected entries
- invalid order of manual times

### 5. Easier corrections
If the user edits an attendance message before calculation, the bot can read the corrected version when it rebuilds the timeline.

---

## Main Disadvantages

### 1. The bot must read channel message history
This approach depends on the bot being able to read attendance messages from the Teams channel after they are posted.

This is different from simply receiving mention-based bot messages.

### 2. Extra Microsoft Graph / Teams permissions may be needed
The app may need special permission to read channel messages.

This may require admin approval.

### 3. Calculation may be slightly slower
When the user sends `calculate`, the bot must first fetch messages, then validate them, then calculate hours.

### 4. Historical reporting should not depend only on old chat messages
If future reports are needed, it is better to store the final validated result in a database or another persistent storage.

---

## Reliability Comparison

### Current model
The current model depends on users remembering to mention the bot every time.

If they forget even once, the attendance sequence becomes incomplete.

### Proposed model
The proposed model depends on users mentioning the bot only once:

- `@TimeSheetAutomation calculate`

Because of this, the proposed model is more reliable in day-to-day usage.

### Conclusion on reliability
For a dedicated attendance channel, this new approach is more reliable from a practical user perspective.

---

## Important Validation Rules

The bot should validate the full sequence before calculating hours.

Suggested rules:

1. `connected` must come first.
2. `break` or `lunch` can happen only after `connected`.
3. `back` can happen only after `break` or `lunch`.
4. `disconnected` must exist before calculation can succeed.
5. Duplicate invalid events should be rejected.
6. Manual times must not create an impossible timeline.
7. If the sequence is invalid, no hours should be calculated.

---

## Example Validation Errors

The bot should return simple and clear messages such as:

- `Connected is missing`
- `Break found before Connected`
- `Back found without Break`
- `Disconnected is missing`
- `Multiple Connected entries found`
- `Manual time makes the timeline invalid`

This will help users correct their entries easily.

---

## Important Edge Cases

Even in a dedicated attendance channel, these cases should be handled:

### 1. Missing connected
Example:
- `break`
- `back`
- `disconnected`

### 2. Missing disconnected
Example:
- `connected`
- `break`
- `back`

### 3. Back without break
Example:
- `connected`
- `back`
- `disconnected`

### 4. Duplicate connected
Example:
- `connected @ 9:00 AM`
- `connected @ 9:15 AM`

### 5. Multiple breaks
Example:
- `connected`
- `break`
- `back`
- `lunch`
- `back`
- `disconnected`

This can be allowed if business rules permit multiple pauses.

### 6. Manual times out of order
Example:
- `connected @ 9:00 AM`
- `break @ 8:30 AM`

This should fail validation.

### 7. Disconnected while on break
Example:
- `connected @ 9:00 AM`
- `break @ 1:00 PM`
- `disconnected @ 6:00 PM`

A clear business rule is needed.

Suggested rule:
- break continues until disconnected
- work time stops when break starts
- day ends at disconnected

### 8. Edited messages
Users may correct earlier attendance messages.

Suggested rule:
- before final calculation: use latest edited version
- after final storage: decide whether recalculation is allowed or locked

---

## Microsoft Teams / Graph Considerations

Before implementation, the following points should be verified:

### 1. Reading channel history
The bot must be able to read the user’s attendance messages from the channel.

### 2. Permissions
The application may need Microsoft Graph permissions to read Teams channel messages.

This may require tenant admin approval.

### 3. Pagination
If many messages exist, the API may return them in batches.

The bot should handle this properly.

### 4. Rate limits
If many users calculate at the same time, Microsoft may limit how many API calls can be made in a short period.

### 5. Message format
Teams messages may include formatting, mentions, or structured content.

The bot may need to convert message content into clean text before parsing.

### 6. Replies vs top-level posts
It should be decided whether attendance messages are allowed only as normal channel posts or also as replies in threads.

### 7. Timezone
The bot must use a clear timezone rule for deciding what counts as “today” and how manual times should be interpreted.

---

## Recommended Final Design

### User flow
1. User posts attendance updates normally in the attendance channel.
2. Bot does not process them immediately.
3. User sends `@TimeSheetAutomation calculate`.
4. Bot reads the user’s attendance messages for that day.
5. Bot extracts valid attendance events.
6. Bot builds the timeline.
7. Bot validates the sequence.
8. Bot either:
   - returns a clear error, or
   - returns the final logged work hours.

### Recommended storage strategy
After successful calculation, store the final validated attendance result in persistent storage.

For example, store:
- user id
- user name
- date
- reconstructed events
- total break time
- total work time
- calculation status

This will help with future reports, summaries, and audit needs.

---

## Final Recommendation

For a dedicated attendance channel, this new design is recommended.

### Final conclusion
This architecture is:

- better for users
- better suited to Teams channel behavior
- simpler to reason about
- more reliable than the current mention-every-message model

### Main condition before implementation
The most important thing to confirm is whether the bot can reliably read the attendance channel’s message history using Microsoft Teams / Microsoft Graph with the required permissions.

If that is confirmed, this is a strong and practical approach for the Timesheet Automation bot.
