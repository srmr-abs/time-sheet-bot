# Teams Timesheet Bot - Quick Start Guide

## Overview

This bot automates timesheet tracking by parsing status messages in Microsoft Teams.

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Bot Credentials

Create a `.env` file:

```bash
cp .env.example .env
```

Get your credentials from [Azure Portal](https://portal.azure.com):

1. Create an Azure Bot resource
2. Copy the App ID and create a client secret
3. Add them to `.env`

### 3. Run the Bot

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 4. Test Locally

Use [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator):

- Connect to `http://localhost:3978/api/messages`
- Enter your App ID and Password
- Test the bot commands

### 5. Deploy to Teams

Option A - **Using ngrok** (for testing):

```bash
ngrok http 3978
```

Update bot messaging endpoint in Azure: `https://your-url.ngrok.io/api/messages`

Option B - **Azure deployment**:

```bash
az webapp up --name your-bot-name --resource-group your-rg
```

Update endpoint: `https://your-bot-name.azurewebsites.net/api/messages`

### 6. Add to Teams

1. Update `teams/manifest.json` with your App ID
2. In Teams: Apps → Upload custom app
3. Select the manifest.json file

## Usage Examples

```
connected @ 9:00 AM      → Tracked silently
lunch                    → Tracked silently
back at 1:00 PM          → Tracked silently
disconnected @ 5:30 PM   → Shows net hours
summary user123 2026-02-22  → Shows TSV report
tally 2026-02-20         → Shows all users TSV
help                     → Shows all commands
```

## Supported Status Messages

- **Start work:** connected, connect, start, in, online (tracked silently)
- **End work:** disconnected, disconnect, end, off, offline, done (shows net hours)
- **Break:** break, brb (tracked silently)
- **Lunch:** lunch (tracked silently)
- **Return:** back, return (tracked silently)

## Time Format Options

- With timestamp: `connected @ 9:30`, `back at 1:00 PM`
- Without timestamp: `connected` (uses current time)

## Summary Commands

- `summary <user-id> <from-date> [to-date]` - User timesheet in TSV
- `tally <from-date> [to-date]` - All users in TSV
- `help` - Show help

Example: `summary 29:1a2b3c4d 2026-02-20 2026-02-22`

## Troubleshooting

- Check App ID/Password in `.env`
- Verify messaging endpoint in Azure
- Check console logs
- Remember: bot only responds to disconnected, summary, tally, help, and errors

**Wrong time calculated:**

- Use explicit timestamps: `@ 9:30 AM`
- Check status order (connect → break → back → disconnect)

**Command format errors:**

- Check date format: YYYY-MM-DD
- Verify user ID format
- See help text for examples

## Architecture

```
User Message → Parser → Storage → Calculator → Response (only for disconnect/commands)
```

1. **Parser** - Extracts status and time from message
2. **Storage** - In-memory storage (no database)
3. **Calculator** - Computes work/break time
4. **Response** - Silent for most, responds for disconnect/commands

## Files

- `src/index.js` - Server initialization
- `src/bot.js` - Main bot logic
- `src/parser.js` - Message parsing
- `src/timeCalculator.js` - Time calculations
- `src/storage.js` - In-memory- Time calculations
- `src/database.ts` - Data storage
- `teams/manifest.json` - Teams app configuration

## Next Steps

- Customize status keywords in `parser.ts`
- Set up Azure Bot registration
- Test locally with Bot Framework Emulator
- Deploy to Azure
- Add to Teams

## Support

See full documentation in [README.md](README.md)
See full documentation in [README.md](README.md)
