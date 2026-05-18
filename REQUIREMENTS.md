# Teams Timesheet Bot - Requirements

## 1. Project Objective

Automate timesheet tracking from Microsoft Teams messages, allowing users to log work hours using natural language without manual data entry or database overhead.

## 2. Core Functional Requirements

### 2.1 Silent Tracking

The bot **MUST NOT** respond to regular status messages to avoid channel noise:

- ✅ Track: `connected @ 9:30`, `break`, `lunch`, `back @ 1:00`
- ❌ No confirmation messages
- ✅ Only respond to: `disconnected`, `summary`, `tally`, `help`, errors

### 2.2 Status Keywords

The bot must recognize and parse these message types:

| Keyword | Aliases | Action |
|---------|---------|--------|
| **connected** | "signed in", "logged in", "@" | Start work session |
| **break** | "on break", "brb" | Start break period |
| **lunch** | "lunch break" | Start lunch period |
| **back** | "returned", "back from" | End break/lunch |
| **disconnected** | "signed off", "logging off" | End work session (responds with net hours) |

### 2.3 Timestamp Parsing

Support natural language time formats:

- `connected @ 9:30 AM`
- `lunch at 12:00`
- `back 1:15pm`
- `disconnected` (uses message timestamp)
- Relative times: `connected 30 minutes ago`

### 2.4 Commands

#### Summary Command

**Format:** `summary <user-id> <from-date> [to-date]`

**Examples:**
- `summary user123 2024-01-15` (single day)
- `summary user123 2024-01-15 2024-01-21` (date range)

**Behavior:**
- ≤7 day range: Daily breakdown
- >7 day range: Weekly breakdown (Sunday-Saturday)

**Output:** TSV format (see section 3)

#### Tally Command

**Format:** `tally <from-date> [to-date]`

**Examples:**
- `tally 2024-01-15` (single day, all users)
- `tally 2024-01-01 2024-01-31` (monthly, all users)

**Behavior:**
- Shows all users in the conversation
- Same daily/weekly grouping as summary
- Sorted by user ID

**Output:** TSV format (see section 3)

#### Help Command

**Format:** `help`

**Output:** Usage instructions with examples

### 2.5 Message Edit Support

- Bot MUST handle message updates (user edits a timestamp)
- Recalculate timesheet when status messages are edited
- Use `onMessageUpdate` handler

## 3. Output Format Requirements

### 3.1 TSV (Tab-Separated Values)

All summary and tally outputs **MUST** be TSV format for easy Excel/spreadsheet paste:

**Daily format (≤7 days):**
```
Date	User	Net Hours	Break Time	Total Time
2024-01-15	user123	7.50	1.00	8.50
2024-01-16	user123	8.00	0.50	8.50
```

**Weekly format (>7 days):**
```
Week	User	Net Hours	Break Time	Total Time
Jan 14-20	user123	37.50	5.00	42.50
Jan 21-27	user123	40.00	5.00	45.00
```

### 3.2 Disconnect Response

When user sends `disconnected`, bot responds:

```
✅ Logged 7.5 net hours today (8.5 total with breaks)
```

## 4. Technical Requirements

### 4.1 Technology Stack

- **Language:** JavaScript (Node.js 18+)
- **Framework:** Bot Builder SDK v4.22.0
- **HTTP Server:** Restify v11.1.0
- **Time Parsing:** chrono-node v2.7.0
- **Environment:** dotenv v16.4.0

### 4.2 No Database Requirement

- **Storage:** In-memory only (JavaScript `Map`)
- **Persistence:** Not required (session-based tracking)
- **Structure:** `conversationId → messageId → entry`
- **Isolation:** Data scoped per conversation

### 4.3 No TypeScript

- Pure JavaScript implementation
- No build step required
- No tsconfig.json or TypeScript dependencies

### 4.4 Code Structure

Required modules:

1. **index.js** - Server initialization, CloudAdapter setup
2. **bot.js** - Main bot logic, command routing, TSV generation
3. **parser.js** - Status keyword detection, timestamp extraction
4. **timeCalculator.js** - Work hour calculations, duration formatting
5. **storage.js** - In-memory Map-based storage operations

## 5. Calculation Requirements

### 5.1 Time Calculations

**Net Hours:** Total work time excluding breaks

```
Net Hours = (Disconnect Time - Connect Time) - Break Duration
```

**Break Time:** Sum of all break and lunch periods

```
Break Time = Σ(back_time - break_start_time)
```

**Total Time:** Gross time including breaks

```
Total Time = Disconnect Time - Connect Time
```

### 5.2 State Machine Logic

Valid state transitions:

```
IDLE → connected → WORKING
WORKING → break/lunch → ON_BREAK
ON_BREAK → back → WORKING
WORKING → disconnected → IDLE
```

Invalid states (e.g., `break` before `connected`) should return helpful error messages.

### 5.3 Duration Formatting

- **Human-readable:** "7h 30m" (for disconnect messages)
- **Decimal hours:** "7.50" (for TSV output)
- Round to 2 decimal places

## 6. Error Handling Requirements

### 6.1 Helpful Error Messages

When user sends unrecognized message format:

```
❌ I didn't understand that message.

Try these examples:
• connected @ 9:30 AM
• lunch at 12:00
• back at 1:00 PM
• disconnected
• summary <user-id> <date>
• tally <date>
• help
```

### 6.2 Invalid Command Formats

- Missing user ID: Show usage example
- Invalid date format: Show expected format (YYYY-MM-DD)
- Date parsing failures: Suggest correct format

### 6.3 State Errors

- `break` before `connected`: "You need to be connected first"
- `disconnected` without `connected`: "No active session found"
- Multiple `connected` without `disconnected`: Warn about overlap

## 7. Deployment Requirements

### 7.1 Azure Functions (Recommended)

- **Plan:** Consumption (serverless)
- **Cost Target:** $0-5/month for <100 users
- **Runtime:** Node.js 18
- **Cold Start:** 2-5 seconds acceptable

### 7.2 Alternative: Azure App Service

- **Tier:** B1 Basic (~$13/month minimum)
- **Use Case:** >100 users or always-on requirement
- **Runtime:** Node.js 18 LTS

### 7.3 Bot Registration

- Azure Bot Service registration required
- OAuth 2.0 credentials (App ID + Password)
- Messaging endpoint: `/api/messages`

## 8. Performance Requirements

### 8.1 Yearly Tally Performance

**Target:** Sub-second response for typical team sizes

| Team Size | Yearly Entries | Max Time | Max Memory |
|-----------|----------------|----------|------------|
| 50 users | 50,000 | 100ms | 10 MB |
| 100 users | 100,000 | 200ms | 20 MB |
| 500 users | 500,000 | 1s | 50 MB |
| 1,000 users | 1,000,000 | 2s | 100 MB |

### 8.2 Azure Functions Limits

- Timeout: 5 minutes (sufficient)
- Memory: 1.5 GB default (sufficient)
- Execution time: <100ms for most operations

## 9. Security Requirements

### 9.1 Credentials Management

- Store App ID and Password in environment variables
- Use Azure Key Vault for production (recommended)
- Never commit credentials to source control

### 9.2 HTTPS Only

- All endpoints must use HTTPS
- Bot endpoint must be publicly accessible
- CORS restrictions: Teams domains only

### 9.3 Authentication

- Bot Framework OAuth 2.0 authentication
- Validate all incoming messages
- Use CloudAdapter error handling

## 10. Data Privacy Requirements

### 10.1 No Persistence

- Data exists only in memory during bot runtime
- No database storage
- Data lost on restart (acceptable)

### 10.2 Conversation Isolation

- User data scoped to conversation ID
- No cross-conversation data access
- Each Teams channel has isolated storage

### 10.3 User Identification

- Use Teams user ID from message context
- No PII collection beyond Teams metadata
- User data NOT shared across conversations

## 11. User Experience Requirements

### 11.1 Silent Operation

- Users log time naturally in conversation
- No bot spam in channels
- Only responds when necessary

### 11.2 Natural Language

- Accept casual time formats ("@ 9:30", "at noon")
- Flexible keyword matching
- Relative time support ("30 minutes ago")

### 11.3 Excel Integration

- TSV output copy-pastes directly into Excel
- Proper date/number formatting
- Headers included for clarity

## 12. Non-Functional Requirements

### 12.1 Maintainability

- Simple JavaScript (no complex build tooling)
- Clear module separation
- Comprehensive documentation (README, EXAMPLES, DEPLOYMENT)

### 12.2 Testability

- Bot Framework Emulator support
- Local testing with Restify server
- Azure Functions Core Tools compatibility

### 12.3 Reliability

- Handle message edits gracefully
- Validate all user inputs
- Graceful degradation on parse failures

### 12.4 Scalability

- Auto-scale with Azure Functions
- Memory-efficient storage structure
- Fast array/Map operations

## 13. Documentation Requirements

### 13.1 Required Files

- **README.md** - Overview, features, quick start
- **QUICKSTART.md** - Step-by-step setup guide
- **EXAMPLES.md** - Usage scenarios with screenshots
- **DEPLOYMENT.md** - Azure deployment guide with costs
- **REQUIREMENTS.md** - This file

### 13.2 Code Comments

- Document complex time calculations
- Explain state machine logic
- Note edge cases in parsing

### 13.3 Examples

- Show all command formats
- Demonstrate silent tracking
- Include TSV output samples
- Cover error scenarios

## 14. Success Criteria

### 14.1 Functional

✅ Users can log time with natural messages  
✅ Bot tracks silently without noise  
✅ Summary/tally commands return TSV  
✅ Yearly tallies complete <2 seconds  
✅ Message edits update calculations

### 14.2 Technical

✅ JavaScript only (no TypeScript)  
✅ No database required  
✅ Deploys to Azure Functions  
✅ Costs <$5/month for small teams  
✅ Handles 100+ users without issues

### 14.3 User Experience

✅ Natural conversation flow  
✅ Clear error messages with examples  
✅ TSV pastes directly into Excel  
✅ Sub-second command responses  
✅ Reliable message edit support

## 15. Out of Scope

### 15.1 Not Required

❌ Physical database (SQLite, SQL Server, etc.)  
❌ TypeScript or build step  
❌ User authentication beyond Teams SSO  
❌ Multi-tenant architecture  
❌ Historical data persistence  
❌ Data export/import features  
❌ Web dashboard or UI  
❌ Mobile app  
❌ Reporting beyond summary/tally  
❌ Approval workflows  
❌ Manager permissions/roles

### 15.2 Future Enhancements (Optional)

- Azure Table Storage for persistence (if needed)
- Premium Functions for faster cold starts (>100 users)
- Application Insights alerting
- Custom time zones support
- Holiday/PTO tracking
- Slack/Discord adapters

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-22 | 1.0 | Initial requirements document |
