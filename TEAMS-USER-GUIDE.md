# TimeSheet Bot — What to Type in Microsoft Teams

A simple guide for anyone using the TimeSheet Bot. No technical knowledge needed.

The bot watches the chat for **short status messages**. When you send one, it
quietly records the time. At the end of your day it tells you how long you
worked. You can also ask it for reports.

> **Good to know:** The bot **stays quiet on purpose.** When you send
> `connected`, `break`, `lunch`, or `back`, you will *not* get a reply — that's
> normal, it's just recording silently so the chat doesn't get noisy. The bot
> only talks back when you `disconnected` (to show your hours) or when you ask
> for `help`, `summary`, or `tally`.

---

## 1. The Status Messages

Your day is made of five simple actions. Each one has a few words you can use —
pick whichever feels natural.

### Start your day → `connected`
| You can type | Means |
|---|---|
| `connected` | I'm starting work |
| `connect` | (same) |
| `start` | (same) |
| `in` | (same) |
| `online` | (same) |

### Go on a short break → `break`
| You can type | Means |
|---|---|
| `break` | I'm taking a quick break |
| `brb` | (same — "be right back") |

### Go to lunch → `lunch`
| You can type | Means |
|---|---|
| `lunch` | I'm going to lunch |
| `lunchbreak` | (same) |
| `lunch break` | (same) |

### Come back from a break or lunch → `back`
| You can type | Means |
|---|---|
| `back` | I'm back at work |
| `return` | (same) |
| `returned` | (same) |

### End your day → `disconnected`
| You can type | Means |
|---|---|
| `disconnected` | I'm done for the day (bot replies with your net hours) |
| `disconnect` | (same) |
| `end` | (same) |
| `off` | (same) |
| `offline` | (same) |
| `done` | (same) |

> 💡 You only need to remember **one** word from each group. The extras are just
> there so you can type what feels natural.

---

## 2. Adding a Time

If you don't add a time, the bot uses the **current time**. That's perfect when
you're sending the message right as something happens.

If you're logging something that happened earlier (or you want a precise time),
add a time. **You must always include AM or PM.**

### Allowed time formats

| Example | What it means |
|---|---|
| `connected @ 9:00 AM` | Start at 9:00 AM |
| `lunch at 12:00 PM` | Lunch at 12:00 PM |
| `back @ 1:00 PM` | Back at 1:00 PM |
| `disconnected @ 5:30 PM` | End at 5:30 PM |
| `break 2pm` | Break at 2:00 PM (bare hour is fine, as long as AM/PM is there) |
| `connected` | No time → uses right now |

You can use any of these little connectors, or none:
- `@ 9:00 AM`
- `at 9:00 AM`
- `9:00 AM` (just the time on its own)

### The golden rule for times: **Always say AM or PM**

The bot will **not guess** a time that's missing AM or PM. If you leave it off,
it will ask you to re-send the message with AM or PM. This stops it from
recording the wrong half of the day.

### Adding notes (optional)

Anything you type that isn't the status word or the time is kept as a **note**.

```
connected @ 9:00 AM working from home
```

Here the note is "working from home". Notes are saved with your entry but don't
change anything else.

---

## 3. A Full Day, Example

Here's how a normal day looks in the chat:

```
connected @ 9:00 AM
lunch @ 12:00 PM
back @ 12:30 PM
break 3:00 PM
back 3:15 PM
disconnected @ 5:30 PM
```

After the last message the bot replies with something like:

```
**Jane Doe - 2026-07-08**
Net Work Time: 7h 45m (Break: 45m)
```

Notice the bot said nothing for the first five messages — that's on purpose.

---

## 4. The Commands

Three extra commands give you help and reports.

### `help`
Just type:
```
help
```
The bot replies with a reminder of everything you can do.

### `summary` — one person's hours
Shows one person's hours for a date range, as a table you can copy into a
spreadsheet.

**Format:**
```
summary <user-id> <from-date> [to-date]
```

- `<user-id>` = the person's user id in Teams
- `<from-date>` = start date, written as **YYYY-MM-DD** (year-month-day)
- `[to-date]` = optional end date. If you leave it out, the bot uses **today**.

**Examples:**
```
summary user123 2026-07-01 2026-07-08
summary user123 2026-07-08
```

- If the range is **7 days or less**, you get a **daily** breakdown.
- If the range is **more than 7 days**, you get a **weekly** breakdown.

### `tally` — everyone's hours
Shows hours for **everyone** in the chat for a date range.

**Format:**
```
tally <from-date> [to-date]
```

**Examples:**
```
tally 2026-07-01 2026-07-08
tally 2026-07-08
```

Same 7-day rule: daily for short ranges, weekly for long ones.

> 📝 **Date format reminder:** Always write dates as **year-month-day**, for
> example `2026-07-08`. Other formats like `08/07/2026` or `8 July 2026` will be
> rejected.

---

## 5. The Rules (in Plain English)

The bot follows a few simple rules to keep everyone's timesheet sensible. Think
of it like a workday: you have to clock in before you can take a break, and you
can't take two breaks at once.

1. **Start before anything else.** You must send `connected` before `break`,
   `lunch`, `back`, or `disconnected`.
2. **Don't start twice.** If you're already `connected`, sending `connected`
   again is not allowed. (To fix a wrong start time, **edit** your earlier
   message instead.)
3. **Be on a break before you come back.** `back` only works if you're currently
   on a `break` or `lunch`.
4. **Don't stack breaks.** If you're already on a break, you can't go on
   another one — send `back` first.
5. **End your day to finish.** `disconnected` only works if you have an active
   day (you're `working` or `on_break`). It won't work if you never started.
6. **Each new day resets.** Yesterday's session doesn't carry over. A new
   calendar day starts you back at "not working", so remember to `connected`
   again in the morning.
7. **Always use AM or PM** when you add a time. No 24-hour clock, no bare
   numbers without AM/PM.
8. **Editing a past message updates your timesheet.** If you typed the wrong
   time, just edit that message in Teams — the bot replaces the old entry. You
   don't need to start your day over.

---

## 6. Invalid Inputs — Examples and Why They're Wrong

### A. Breaking the workday order

| You type | Why it's invalid | What the bot says |
|---|---|---|
| `lunch` (before starting) | You can't go to lunch if you haven't started work yet. | "You need to be connected first. Send connected to start your day." |
| `back` (before starting) | You can't come back if you never started. | "You need to be connected first. Send connected to start your day." |
| `disconnected` (before starting) | There's no active day to end. | "No active session found. Send connected to start your day." |
| `connected` (while already working) | You're already on the clock; you can't start twice. | "You are already connected. If you need to change your start time, edit your previous message." |
| `connected` (while on a break) | Finish your break first, or end your day. | "You are on a break. Send back first, or disconnected to end your day." |
| `break` (while already on a break) | You're already on a break; you can't take two. | "You are already on a break. Send back when you return." |
| `lunch` (while already on a break) | Same as above — already on a break. | "You are already on a break. Send back when you return." |
| `back` (while working, not on a break) | You can't come back if you aren't on a break. | "You are not on a break. Send break or lunch first." |

### B. Times missing AM or PM

| You type | Why it's invalid | What the bot says |
|---|---|---|
| `connected @ 9:30` | No AM/PM, so the bot can't tell morning from evening. | "I need AM or PM to understand that time…" and it asks you to resend with AM or PM. |
| `break at 2:00` | Same — no AM/PM. | (same as above) |
| `disconnected 5:30` | Same — no AM/PM. | (same as above) |
| `lunch 14:00` | 24-hour clock isn't supported. The bot sees a number without AM/PM. | (same as above) |

**Fix:** re-send with AM or PM, for example `connected @ 9:30 AM`, or just send
`connected` with no time to use the current time.

### C. Reports with wrong format

| You type | Why it's invalid | What the bot says |
|---|---|---|
| `summary` | Missing the user id and date. | "Invalid summary command format" + correct usage. |
| `summary user123` | Missing the from-date. | (same) |
| `summary user123 08-07-2026` | Wrong date format — must be YYYY-MM-DD. | "Invalid date format. Please use YYYY-MM-DD format." |
| `summary user123 8 July 2026` | Wrong date format. | (same) |
| `tally` | Missing the from-date. | "Invalid tally command format" + correct usage. |
| `tally 08/07/2026` | Wrong date format. | "Invalid date format. Please use YYYY-MM-DD format." |

**Fix:** Use the format shown in §4, e.g. `summary user123 2026-07-01 2026-07-08`.

### D. Messages the bot doesn't recognise

| You type | Why it's invalid | What the bot says |
|---|---|---|
| `hello` | Not a status word and not a command. | "I could not understand that message." + suggestions like `Try: connected @ 9:00 AM`. |
| `good morning` | No status keyword found. | (same) |
| `starting work now` | "starting" isn't a recognised word; use `start` or `connected`. | (same) |
| `going to lunch now` | "lunch" *is* recognised, so this actually works! The extra words become a note. | (recorded silently — no reply) |

> ⚠️ Note the last two rows: the bot looks for the **exact keyword words** from
> §1. Words that are *similar* but not on the list (like "starting" instead of
> "start") won't be recognised. Stick to the listed words.

---

## 7. Quick Reference Card

```
START      connected              (or connect / start / in / online)
BREAK      break                  (or brb)
LUNCH      lunch                  (or lunchbreak / lunch break)
RESUME     back                   (or return / returned)
END        disconnected           (or disconnect / end / off / offline / done)

ADD A TIME  @ 9:00 AM   |   at 9:00 AM   |   9:00 AM   |   2pm
            ↑ always include AM or PM ↑

COMMANDS   help
           summary <user-id> <from-date> [to-date]
           tally <from-date> [to-date]
           (dates = YYYY-MM-DD, to-date defaults to today)

FIX A MISTAKE  Edit your earlier message in Teams — the bot updates the entry.
```

---

## 8. A Sample Day You Can Copy

```
connected @ 9:00 AM
lunch @ 12:30 PM
back @ 1:15 PM
break 3:45 PM
back 4:00 PM
disconnected @ 6:00 PM
```

After the last line, the bot replies with your net work time and total break
time for the day. That's it — your timesheet is done. 🎉
