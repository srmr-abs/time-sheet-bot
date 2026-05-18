# Beginner's Guide: Local Teams Bot Testing with ngrok

A complete, step-by-step guide for first-time developers to run and test the Timesheet Bot locally in Microsoft Teams without deploying to Azure.

## Table of Contents

- [Before You Begin](#before-you-begin)
- [Step 1: Open Your Project](#step-1-open-your-project)
- [Step 2: Install Dependencies](#step-2-install-dependencies)
- [Step 3: Configure Your Bot Credentials](#step-3-configure-your-bot-credentials)
- [Step 4: Update the Teams Manifest](#step-4-update-the-teams-manifest)
- [Step 5: Start the Bot Server](#step-5-start-the-bot-server)
- [Step 6: Start ngrok](#step-6-start-ngrok)
- [Step 7: Connect ngrok to Your Bot Registration](#step-7-connect-ngrok-to-your-bot-registration)
- [Step 8: Test with Bot Framework Emulator](#step-8-test-with-bot-framework-emulator)
- [Step 9: Test in Microsoft Teams](#step-9-test-in-microsoft-teams)
- [Common Errors and Fixes](#common-errors-and-fixes)
- [Quick Reference](#quick-reference)

---

## Before You Begin

### What You Need (Checklist)

Before starting, make sure you have these ready:

| # | Item | How to Verify | Status |
|---|---|---|---|
| 1 | Node.js installed (v18 or higher) | Run `node --version` in any terminal | \\square |
| 2 | npm installed | Run `npm --version` in any terminal | \\square |
| 3 | VS Code installed | Open VS Code application | \\square |
| 4 | Bot project cloned | You can see this project folder on your computer | \\square |
| 5 | Microsoft 365/Teams account | You can login to https://teams.microsoft.com | \\square |
| 6 | Azure Bot App ID | 36-character ID from Azure Bot Service or your admin | \\square |
| 7 | Azure Bot App Password | Client secret from Azure Bot Service or your admin | \\square |
| 8 | ngrok access | Installed on your machine or shared by office | \\square |

**Do NOT proceed past Step 3 if you do not have items 6 and 7.**
These are your bot's "username and password" that let Teams talk to your bot.

> **Where do App ID and Password come from?**
> - Ask your team lead or admin for the existing bot's credentials, OR
> - Register a new bot yourself at https://dev.botframework.com/bots/new (requires Microsoft work account)

### What This Guide Assumes

- You are testing **locally** (your laptop, not a cloud server)
- You will use **ngrok** to create a temporary public URL that Teams can reach
- You have **already cloned this project** (`time-sheet-automation`)
- You want to test inside the **real Microsoft Teams app** (not just a simulator)

---

## Step 1: Open Your Project

### 1.1 Open VS Code

Double-click the VS Code icon on your desktop or search for "Visual Studio Code" in your Start Menu / Spotlight.

### 1.2 Open the Project Folder

In VS Code:

1. Click **File** in the top menu bar
2. Click **Open Folder...**
3. Navigate to where you cloned the project (e.g., `C:\Users\YourName\projects\time-sheet-automation` on Windows, or `~/projects/time-sheet-automation` on Mac/Linux)
4. Click the **Select Folder** or **Open** button

**Verify:** You should now see the project files in the left sidebar (Explorer panel), including:
- `src/` folder
- `teams/` folder
- `package.json`
- `.env.example`

### 1.3 Open the Integrated Terminal

**Windows/Linux:** Press `` Ctrl + ` `` (backtick key, next to the 1 key)
**Mac:** Press `` Cmd + ` ``

Or click **View** → **Terminal** from the top menu.

**Verify:** A terminal panel appears at the bottom of VS Code. It should show a prompt like:

```
PS C:\Users\YourName\projects\time-sheet-automation>
```
or on Mac/Linux:
```
yourname@computer:~/projects/time-sheet-automation$
```

> **Important:** The folder path in the prompt MUST end with `time-sheet-automation`. All commands in this guide must be run from this folder. If you are in a different folder, the commands will fail.

---

## Step 2: Install Dependencies

### What This Does

Your bot needs other code libraries (like `botbuilder` for Teams communication, `restify` for the web server, etc.). This command downloads and installs them into a local `node_modules` folder.

### Command to Run

Make sure your terminal prompt ends with `time-sheet-automation>` or `time-sheet-automation$`, then run:

```bash
npm install
```

### Expected Output

You will see many lines scroll by as npm downloads packages. Look for the final lines to look something like:

```
added 221 packages, and audited 222 packages in 15s

32 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

> **Note:** "found 0 vulnerabilities" is ideal. If you see vulnerability warnings, you can usually ignore them for local testing but tell your team lead.

### What to Verify Before Continuing

- [ ] The command completed without showing a big red **ERROR** block
- [ ] You see a new `node_modules/` folder in the VS Code Explorer (left sidebar)
- [ ] No "npm ERR!" messages at the end

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `npm: command not found` | Node.js/npm not installed or not in PATH | Reinstall Node.js from https://nodejs.org |
| `EACCES: permission denied` | Terminal doesn't have write permission | On Mac/Linux: `sudo npm install` (enter password). On Windows: run VS Code as Administrator |
| `package.json not found` | You are in the wrong folder | Type `cd /path/to/time-sheet-automation` then retry |

---

## Step 3: Configure Your Bot Credentials

### What This Does

Your bot needs two secret values to prove its identity to Microsoft Teams:
1. **MicrosoftAppId** - Like a username (36 characters with dashes)
2. **MicrosoftAppPassword** - Like a password (a long random string)

These are stored in a `.env` file that the bot reads when it starts.

### 3.1 Copy the Example Environment File

Run this in the terminal (still inside `time-sheet-automation` folder):

**Windows (PowerShell):**
```powershell
copy .env.example .env
```

**Windows (Git Bash) / Mac / Linux:**
```bash
cp .env.example .env
```

### 3.2 Edit the `.env` File

In VS Code Explorer (left sidebar), click on `.env` to open it.

You will see:
```env
# Microsoft App ID and Password
# Get these from Azure Bot Service: https://portal.azure.com
MicrosoftAppId=
MicrosoftAppPassword=

# Bot server port
PORT=3978
```

**Update it with your real credentials.** Replace everything after the `=` signs:

```env
# Microsoft App ID and Password
MicrosoftAppId=12345678-1234-1234-1234-123456789012
MicrosoftAppPassword=abc1DEF~gHiJ2kLmN3oPqR4sTuV5wXyZ6

# Bot server port
PORT=3978
```

> **Important values explained:**
> - `MicrosoftAppId` - This is a **GUID** (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). It is NOT your email address.
> - `MicrosoftAppPassword` - This is also called "Client Secret" or "App Password". It is a long random string.
> - `PORT=3978` - Leave this as-is. This is the port number your bot listens on locally.

**Save the file:** Press `Ctrl + S` (Windows/Linux) or `Cmd + S` (Mac).

### What to Verify Before Continuing

- [ ] The `.env` file exists in the Explorer
- [ ] `MicrosoftAppId` is filled with a real 36-character GUID (not empty)
- [ ] `MicrosoftAppPassword` is filled with a real secret (not empty)
- [ ] There are **no spaces** around the `=` signs (e.g., write `MicrosoftAppId=value` not `MicrosoftAppId = value`)
- [ ] The file is saved (no dot next to filename in the tab)

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `Cannot find module 'dotenv'` | npm install didn't complete | Run `npm install` again |
| Bot starts but Teams shows "Unauthorized" | App ID or Password is wrong | Double-check both values with your admin |
| `MicrosoftAppId is undefined` | `.env` file is missing or empty | Recreate `.env` from `.env.example` |

---

## Step 4: Update the Teams Manifest

### What This Does

The `teams/manifest.json` file tells Microsoft Teams what your bot is called, what it can do, and what its ID is. Teams uses this to show your bot correctly in the app.

### 4.1 Open the Manifest File

In VS Code Explorer, navigate to `teams/` → `manifest.json` and click to open it.

### 4.2 Update the Bot ID

Find these two lines (they appear once each in the file):

```json
  "id": "YOUR-APP-ID-HERE",
```

and:

```json
      "botId": "YOUR-APP-ID-HERE",
```

**Replace** `YOUR-APP-ID-HERE` with the **same** `MicrosoftAppId` you put in `.env`.

Example after replacing:
```json
  "id": "12345678-1234-1234-1234-123456789012",
```

```json
      "botId": "12345678-1234-1234-1234-123456789012",
```

> **Critical:** The `id` and `botId` must be the **exact same value** as your `MicrosoftAppId`.

### 4.3 Update Company Info (Optional for Testing)

You can leave these as-is for local testing, or update them:

```json
  "developer": {
    "name": "Your Company",
    "websiteUrl": "https://yourcompany.com",
    "privacyUrl": "https://yourcompany.com/privacy",
    "termsOfUseUrl": "https://yourcompany.com/terms"
  },
```

> **Note:** For Teams to accept the app, `websiteUrl`, `privacyUrl`, and `termsOfUseUrl` must be valid URLs. If you don't have real ones, use `https://localhost` or `https://example.com` for local testing.

### 4.4 Save the File

Press `Ctrl + S` / `Cmd + S`.

### What to Verify Before Continuing

- [ ] Both `id` and `botId` in `manifest.json` match your `MicrosoftAppId` in `.env`
- [ ] All JSON syntax is correct (VS Code will show red squiggly lines if broken)
- [ ] File is saved

---

## Step 5: Start the Bot Server

### What This Does

This starts the bot on your local machine. It opens a web server on port 3978 that listens for messages.

### Command to Run

In your VS Code terminal (inside `time-sheet-automation` folder), run:

```bash
npm run dev
```

> **Why `npm run dev` and not `npm start`?**
> - `dev` uses `nodemon`, which auto-restarts the bot when you change code.
> - `start` runs once and you have to restart manually after changes.
> - Use `dev` for testing. Use `start` only for production.

### Expected Output

```
> teams-timesheet-bot@1.0.0 dev
> nodemon src/index.js

[nodemon] 3.0.3
[nodemon] to restart at any time, enter `rs`
[nodemon] watching path(s): *.*
[nodemon] watching extensions: js,mjs,cjs,json
[nodemon] starting `node src/index.js`

restify listening on http://[::]:3978

Get Bot Framework Emulator: https://aka.ms/botframework-emulator

To test your bot in Teams, sideload the app manifest.json from the ./teams folder
```

**What the output means:**
- `restify listening on http://[::]:3978` - Your bot is alive and listening on port 3978.
- `[nodemon] watching` - Any code changes will auto-restart the bot.

### What to Verify Before Continuing

- [ ] You see `listening on http://[::]:3978` (or similar)
- [ ] No red error messages
- [ ] The terminal prompt does NOT return (the process keeps running)

> **Important:** The terminal will stay "busy" because the server is running. **Do not close this terminal tab.** To run more commands, open a new terminal tab or a separate terminal window.

### How to Open a New Terminal Tab

In VS Code:
- Click the **+** icon in the terminal panel's top-right corner, OR
- Press `Ctrl + Shift + `` (backtick)

This opens a second terminal tab while the first one keeps running your bot.

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `Port 3978 is already in use` | Another program (or old bot) is using the port | Kill the old process: `npx kill-port 3978` then retry |
| `MicrosoftAppId is undefined` | `.env` file missing or empty | Go back to Step 3 |
| `Cannot find module 'restify'` | `npm install` didn't work | Run `npm install` again |
| `EACCES: permission denied` | Port 3978 requires admin rights (Linux/Mac) | Use `PORT=3000 npm run dev` or run with `sudo` |

---

## Step 6: Start ngrok

### What This Does

Your bot runs on `localhost:3978`, but Microsoft Teams is on the internet. It cannot reach your laptop directly. **ngrok creates a temporary public URL** (like `https://abcd1234.ngrok.io`) that forwards messages to your local computer.

### 6.1 Open a New Terminal

You must keep the bot server running from Step 5. Open a **new** terminal window or tab.

> **To open a new terminal in VS Code:**
> 1. Click the **+** icon in the terminal panel
> 2. Or press `Ctrl + Shift + `` (backtick)

### 6.2 Navigate to Your Project Folder (if needed)

If your new terminal is not already in the `time-sheet-automation` folder, navigate there:

```bash
cd /path/to/time-sheet-automation
```

### 6.3 Start ngrok

Run this command (replace `3978` if you changed the port in `.env`):

```bash
ngrok http 3978
```

> **If your office uses a shared ngrok account with a static domain:**
> Your admin may have given you a command like:
> ```bash
> ngrok http --domain=yourcompany-bot.ngrok-free.app 3978
> ```
> Use the command your admin gave you.

### Expected Output

```
ngrok                                                           (Ctrl+C to quit)

Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.x.x
Region                        United States (us)
Latency                       25ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abcd1234.ngrok-free.app -> http://localhost:3978
```

**The critical line is:**
```
Forwarding  https://abcd1234.ngrok-free.app -> http://localhost:3978
```

### What to Verify Before Continuing

- [ ] `Session Status` says `online`
- [ ] You see a `Forwarding` line with an **HTTPS** URL (`https://...`)
- [ ] The forwarding URL ends with `.ngrok-free.app` or `.ngrok.io`
- [ ] The right side points to `localhost:3978`

> **Important:** The `https://...` URL is your bot's public address. **Copy it now** and paste it into a text file or notepad. Example: `https://abcd1234.ngrok-free.app`

> **Note:** Every time you restart ngrok, this URL changes (unless you have a paid/static domain). You will need to update the Azure Bot endpoint every time. If your office provided a static domain, the URL stays the same.

### How to Keep ngrok Running

- **Do not close** the ngrok terminal window while testing.
- ngrok will keep running until you press `Ctrl + C`.
- If ngrok stops, your bot will stop receiving messages from Teams.

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `ngrok: command not found` | ngrok not installed or not on PATH | Install from https://ngrok.com/download, or ask your admin for the shared office ngrok path |
| `Session Status: forbidden` | Your ngrok auth token is missing or expired | Run `ngrok config add-authtoken YOUR_TOKEN` (get token from your admin or https://dashboard.ngrok.com) |
| `Failed to bind tunnel` | The static domain is already in use by someone else | Only one person can use a static domain at a time. Wait or ask your admin |
| `connection refused` | Your bot server (Step 5) is not running | Start `npm run dev` first, then start ngrok |

---

## Step 7: Connect ngrok to Your Bot Registration

### What This Does

You need to tell Microsoft's Bot Service: "When Teams sends a message to my bot, forward it to the ngrok URL." This is called the **Messaging Endpoint**.

### 7.1 Open Azure Bot Service or Bot Framework Portal

You have two options. Use whichever your team uses:

| Portal | URL | When to Use |
|---|---|---|
| **Azure Portal** | https://portal.azure.com | If your company manages bots in Azure |
| **Bot Framework** | https://dev.botframework.com/bots | If you registered the bot without Azure |

### 7.2 Navigate to Your Bot

**In Azure Portal:**
1. Sign in with your work account
2. Search for "Azure Bot" in the top search bar
3. Click on your bot's name (e.g., `timesheet-bot`)

**In Bot Framework:**
1. Sign in with your work account
2. Click **My bots**
3. Click your bot's name

### 7.3 Update the Messaging Endpoint

**In Azure Portal:**
1. Click **Configuration** in the left menu
2. Find the field called **Messaging endpoint**
3. Paste your ngrok URL and add `/api/messages` at the end

Example:
```
https://abcd1234.ngrok-free.app/api/messages
```

4. Click **Apply** or **Save** at the top

**In Bot Framework:**
1. Click **Settings** next to your bot
2. Find **Messaging endpoint**
3. Paste the same URL (`https://abcd1234.ngrok-free.app/api/messages`)
4. Click **Save Changes**

> **Very Important:** The URL must end with `/api/messages`. If you forget this, Teams will not be able to talk to your bot.

### What to Verify Before Continuing

- [ ] You can see the saved messaging endpoint in the portal
- [ ] The URL is `https://` (not `http://`)
- [ ] The URL ends with `/api/messages`
- [ ] You clicked Save / Apply

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| "Unauthorized" in Teams | Wrong App ID or Password | Double-check `.env` matches the bot registration |
| "Endpoint not found" or `404` | Missing `/api/messages` in URL | Update the endpoint to end with `/api/messages` |
| "Bad Request" or `400` | Bot is not running or ngrok is disconnected | Start `npm run dev` and restart ngrok |
| "Forbidden" or `403` | Microsoft App Password is wrong or expired | Generate a new client secret in Azure/Entra ID |

---

## Step 8: Test with Bot Framework Emulator

### What This Does

Before testing in the full Teams app, you can quickly test your bot locally using a free tool from Microsoft. This confirms your bot code and credentials are working.

### 8.1 Download and Install Bot Framework Emulator

Go to: https://github.com/Microsoft/BotFramework-Emulator/releases

Download the latest `.exe` (Windows) or `.dmg` (Mac) file and install it.

### 8.2 Open the Emulator

Launch the Bot Framework Emulator app.

### 8.3 Connect to Your Local Bot

1. Click **Open Bot** in the top left
2. In the dialog that appears, fill in:
   - **Bot URL:** `http://localhost:3978/api/messages`
     > Use `http://` (not `https`) because you are connecting directly to your local machine.
   - **Microsoft App ID:** Your App ID from `.env`
   - **Microsoft App password:** Your App Password from `.env`
3. Click **Connect**

### 8.4 Send Test Messages

In the chat panel, type and press Enter:

```
help
```

**Expected Response:**
The bot should reply with a help message listing all commands.

Try:
```
connected @ 9:00 AM
```

**Expected Response:**
For "connected", the bot tracks silently (no response). This is correct.

Try:
```
disconnected @ 5:30 PM
```

**Expected Response:**
```
**User Name - 2026-05-11**
Net Work Time: 8h 30m (Break: 0h)
```

### What to Verify Before Continuing

- [ ] Emulator connects successfully (no error dialog)
- [ ] Typing `help` returns the help message
- [ ] Typing `disconnected @ 5:30 PM` returns net hours
- [ ] If these work, your bot code and credentials are correct

### Common Errors

| Error | Cause | Fix |
|---|---|---|
| `401 Unauthorized` in emulator | Wrong App ID or Password | Check `.env` values and re-enter in emulator |
| `ECONNREFUSED` | Bot server not running | Start `npm run dev` in VS Code terminal |
| No response at all | Port blocked or wrong URL | Make sure URL is `http://localhost:3978/api/messages` |
| `404 Not Found` | Wrong path | URL must end with `/api/messages` |

---

## Step 9: Test in Microsoft Teams

### What This Does

This is the real test. You will load your bot into Microsoft Teams as a custom app and chat with it.

### 9.1 Create the Teams App Package

Teams apps are installed as `.zip` files that contain `manifest.json` and icon images.

**Using VS Code Terminal:**

Make sure you are in the `time-sheet-automation` folder, then run:

**Mac / Linux:**
```bash
cd teams && zip -r ../teams-app-package.zip manifest.json icons/ && cd ..
```

**Windows (PowerShell):**
```powershell
Compress-Archive -Path teams\manifest.json, teams\icons\* -DestinationPath teams-app-package.zip -Force
```

> **Note:** If there is no `icons/` folder, just zip `manifest.json`:
> ```bash
> cd teams && zip -r ../teams-app-package.zip manifest.json && cd ..
> ```

### What to Verify

- [ ] A new file `teams-app-package.zip` appears in your VS Code Explorer (in the root folder)
- [ ] The zip file contains `manifest.json`

### 9.2 Enable Side-Loading in Teams (One-Time Setup)

"Side-loading" means uploading a custom app. This must be enabled by your IT admin.

Check if it's enabled:
1. Open Microsoft Teams (desktop or web: https://teams.microsoft.com)
2. Look at the bottom-left for **Apps**
3. Click **Apps** → **Manage your apps**
4. Look for a link that says **Upload an app** or a **+** button

If you see an option to upload, you're good to go.

If you don't see it, ask your IT admin to enable it:
- They need to go to **Teams Admin Center** → **Teams apps** → **Setup policies** → Allow **Upload custom apps**
- OR add you to a policy that allows side-loading.

### 9.3 Upload the App to Teams

**Option A: Using Teams Web (Recommended for Testing)**

1. Go to https://teams.microsoft.com in your browser
2. Sign in with your work account
3. In the left sidebar, click **Apps**
4. At the bottom, click **Manage your apps**
5. Click **Upload an app** → **Upload a custom app**
6. Click **Select file** and choose your `teams-app-package.zip`
7. Click **Add**

**Option B: Using Teams Desktop App**

1. Open Teams desktop app
2. In the left sidebar, click the **...** (More added apps)
3. Search for "Manage your apps" or find it under Apps
4. Click **Upload a custom app**
5. Select your `teams-app-package.zip`

### 9.4 Find and Open Your Bot

After uploading:
1. Teams will show a dialog. Click **Add** to add the bot to your personal apps.
2. The bot will appear in your chat list on the left.
3. Click on the bot's name ("Timesheet Bot") to open a chat.

### 9.5 Test Commands in Teams

Try these commands one by one in the chat:

```
help
```
**Expected:** Bot shows a help message with all commands.

```
connected @ 9:00 AM
```
**Expected:** No response (silent tracking). This is correct.

```
lunch at 12:00 PM
```
**Expected:** No response.

```
back at 1:00 PM
```
**Expected:** No response.

```
disconnected @ 5:30 PM
```
**Expected:** Bot replies with net hours:
```
**Your Name - 2026-05-11**
Net Work Time: 8h 30m (Break: 1h)
```

```
summary YOUR-USER-ID 2026-05-11
```
**Expected:** A TSV table with your hours.

> **How do I find my User ID?**
> In Teams, right-click your own name in a chat and select "Get link" or look at Bot Framework Emulator logs. For testing, you can also use the ID shown in the `disconnected` response or check the bot's console logs.

### What to Verify Before Continuing

- [ ] The bot appears in your Teams chat list
- [ ] Typing `help` returns the help message
- [ ] Typing `connected` silently tracks (no response)
- [ ] Typing `disconnected` shows net hours
- [ ] The bot does NOT show "Unauthorized" or "Not reachable" errors

---

## Common Errors and Fixes

### Bot Not Responding in Teams

| Symptom | Likely Cause | Fix |
|---|---|---|
| "The bot is not reachable" | ngrok is not running or bot server is down | Start `npm run dev`, then start `ngrok http 3978` |
| "The bot is forbidden" | Wrong App Password | Update `.env` with correct password. Generate new secret in Azure if needed |
| "401 Unauthorized" in console | App ID or Password mismatch | Make sure `.env` matches the bot registration exactly |
| No response at all | Messaging endpoint is wrong | Check Azure/Bot Framework portal. URL must end with `/api/messages` and use the current ngrok URL |
| "Sorry, the bot can't talk right now" | Bot crashed | Check VS Code terminal for error messages and restart `npm run dev` |

### ngrok Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| ngrok URL changes every time | Free ngrok plan | Use the new URL to update Azure endpoint each time. Ask admin for a static domain |
| "Failed to bind tunnel" | Someone else in office is using same static domain | Coordinate with your team. Only one person can use a static domain at a time |
| ngrok shows `503 Service Unavailable` | Bot server crashed or wrong port | Check `npm run dev` is running on port 3978. Check `.env` has `PORT=3978` |
| "Session Expired" | Free plan timeout | Restart ngrok with `ngrok http 3978` |

### Teams App Upload Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| "manifest.json is invalid" | JSON syntax error or missing required fields | Open `manifest.json` in VS Code. Check for red squiggly lines. Ensure `id` and `botId` are valid GUIDs |
| "The app couldn't be found" | Wrong file uploaded | Make sure you zip `manifest.json`, not the whole project |
| "You don't have permission" | Side-loading not enabled | Ask IT admin to enable "Upload custom apps" in Teams Admin Center |
| "The app ID is already in use" | Another bot has the same App ID | Make sure `id` in manifest matches your bot registration exactly |

### Credential Issues

| Symptom | Likely Cause | Fix |
|---|---|---|
| `MicrosoftAppId is undefined` in logs | `.env` file not read | Make sure `.env` is in the project root (same folder as `package.json`). No typos in filename |
| `invalid_client` in logs | App Password is wrong | Go to Azure Portal → App Registrations → Your app → Certificates & secrets → create a new secret |
| `You do not have permission` in Azure | You don't have admin rights | Ask your admin to add you as a contributor to the bot resource, or use Bot Framework portal instead |

---

## Quick Reference

### Terminal Commands Summary

Run these from the `time-sheet-automation` folder in VS Code:

```bash
# Step 2: Install dependencies (run once, or after pulling new code)
npm install

# Step 5: Start the bot server (keep this running)
npm run dev

# Step 6: Start ngrok (in a NEW terminal tab, keep running)
ngrok http 3978

# Step 9: Create Teams app package (zip the manifest)
cd teams && zip -r ../teams-app-package.zip manifest.json && cd ..
```

### File Locations Summary

| File | Purpose | What to Edit |
|---|---|---|
| `.env` | Bot credentials | Add your `MicrosoftAppId` and `MicrosoftAppPassword` |
| `teams/manifest.json` | Teams app description | Update `id` and `botId` to match your App ID |
| `src/index.js` | Server setup | Usually no changes needed |
| `src/bot.js` | Bot logic | Only if you're changing bot behavior |

### URLs You Will Use

| URL | When to Use |
|---|---|
| `http://localhost:3978/api/messages` | Bot Framework Emulator (local, no ngrok) |
| `http://localhost:3978/health` | Browser check to see if bot is running |
| `https://YOUR-URL.ngrok.io/api/messages` | Azure Bot Messaging Endpoint (Teams chat) |
| `http://127.0.0.1:4040` | ngrok Web Interface (see traffic logs) |

### How to Stop Everything

| Task | How to Stop |
|---|---|
| Bot server (`npm run dev`) | Press `Ctrl + C` in its terminal, then confirm with `y` if asked |
| ngrok | Press `Ctrl + C` in its terminal |
| VS Code | Close window or press `Ctrl + Q` / `Cmd + Q` |

### How to Restart After a Code Change

If you edit bot code while `npm run dev` is running, `nodemon` will auto-restart the bot. You should see:
```
[nodemon] restarting due to changes...
[nodemon] starting `node src/index.js`
```

If you change `.env` or `manifest.json`, you must:
1. Stop `npm run dev` (`Ctrl + C`)
2. Re-run `npm run dev`
3. If ngrok URL changed, update the Azure messaging endpoint

---

## Related Documents

- [README.md](README.md) - Project overview and features
- [QUICKSTART.md](QUICKSTART.md) - Shorter setup summary (for experienced devs)
- [DEPLOYMENT.md](DEPLOYMENT.md) - How to deploy to Azure (for production)

## External References

- [Bot Framework Emulator](https://github.com/Microsoft/BotFramework-Emulator/releases) - Download link
- [ngrok Download](https://ngrok.com/download) - If you need to install ngrok
- [Azure Portal](https://portal.azure.com) - Manage Azure Bot Service
- [Bot Framework Portal](https://dev.botframework.com/bots) - Alternative bot registration
- [Teams Developer Portal](https://dev.teams.microsoft.com/) - Manage Teams apps

## See Also

- `.env.example` - Template for bot credentials
- `teams/manifest.json` - Teams app manifest template
