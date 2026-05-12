const chrono = require('chrono-node');

class MessageParser {
  constructor() {
    this.statusKeywords = {
      connected: ['connected', 'connect', 'start', 'in', 'online'],
      disconnected: ['disconnected', 'disconnect', 'end', 'off', 'offline', 'done'],
      break: ['break', 'brb'],
      lunch: ['lunch', 'lunchbreak', 'lunch break'],
      back: ['back', 'return', 'returned']
    };
  }

  parse(message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Detect status
    const status = this.detectStatus(lowerMessage);
    
    // Parse timestamp if present
    const timestamp = this.extractTimestamp(message);
    
    // Extract notes (anything that's not part of status or time)
    const notes = this.extractNotes(message, status);
    
    return {
      status,
      timestamp,
      notes
    };
  }

  detectStatus(message) {
    // Check each status keyword using whole-word matching
    for (const [status, keywords] of Object.entries(this.statusKeywords)) {
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(message)) {
          return status;
        }
      }
    }
    return null;
  }

  extractTimestamp(message) {
    // Try to parse natural language time expressions (only if they include AM/PM)
    const parsed = chrono.parse(message, new Date(), { forwardDate: false });
    if (parsed.length > 0) {
      const text = parsed[0].text.toLowerCase();
      // Only accept chrono results if they contain am/pm
      if (text.includes('am') || text.includes('pm')) {
        return parsed[0].start.date();
      }
    }

    // Check for ambiguous times (numbers that look like times but lack AM/PM)
    // Must come AFTER chrono and BEFORE explicit AM/PM patterns
    const ambiguousPatterns = [
      /@\s*\d{1,2}:\d{2}\s*(?!am|pm)/i,
      /at\s+\d{1,2}:\d{2}\s*(?!am|pm)/i,
      /(?:^|\s)\d{1,2}:\d{2}\s*(?!am|pm)/i,
      /@\s*\d{1,2}\s*(?!am|pm|:)/i,
      /at\s+\d{1,2}\s*(?!am|pm|:)/i
    ];

    for (const pattern of ambiguousPatterns) {
      if (pattern.test(message)) {
        // Return a special marker so the bot can ask for AM/PM
        return { ambiguous: true };
      }
    }

    // Try to match time patterns with AM/PM: "@ 9:30 AM", "at 9:30 am", "9:30 PM"
    const timePatterns = [
      /@\s*(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /at\s+(\d{1,2}):(\d{2})\s*(am|pm)/i,
      /(\d{1,2}):(\d{2})\s*(am|pm)/i
    ];

    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const meridiem = match[3].toLowerCase();

        if (meridiem === 'pm' && hours < 12) hours += 12;
        if (meridiem === 'am' && hours === 12) hours = 0;

        const now = new Date();
        const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
        return timestamp;
      }
    }

    // Try bare hour numbers with AM/PM: "break 2pm", "disconnected 5 PM"
    const bareHourMatch = message.match(/(?:^|\s)(\d{1,2})\s*(am|pm)(?:\s|$)/i);
    if (bareHourMatch) {
      let hours = parseInt(bareHourMatch[1]);
      const meridiem = bareHourMatch[2].toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;

      const now = new Date();
      const timestamp = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, 0);
      return timestamp;
    }

    return null;
  }

  extractNotes(message, status) {
    if (!status) return message;

    // Remove status keywords and time patterns
    let notes = message;
    
    // Remove status keyword (whole-word match)
    const statusKeyword = this.statusKeywords[status]
      ?.find(kw => new RegExp(`\\b${kw}\\b`, 'i').test(message.toLowerCase()));
    if (statusKeyword) {
      notes = notes.replace(new RegExp(`\\b${statusKeyword}\\b`, 'i'), '');
    }

    // Remove time patterns (AM/PM is now required)
    notes = notes.replace(/@\s*\d{1,2}:\d{2}\s*(am|pm)/gi, '');
    notes = notes.replace(/at\s+\d{1,2}:\d{2}\s*(am|pm)/gi, '');
    notes = notes.replace(/\d{1,2}:\d{2}\s*(am|pm)/gi, '');
    notes = notes.replace(/\d{1,2}\s*(am|pm)/gi, '');

    return notes.trim();
  }

  getHelpText() {
    return `**Timesheet Bot Help**

**Track your time by sending status messages:**
(The bot tracks silently - no confirmation messages)

• **Connected:** \`connected\`, \`connect\`, \`start\`, \`in\`, \`online\`
• **Disconnected:** \`disconnected\`, \`disconnect\`, \`end\`, \`off\`, \`done\` (shows net hours)
• **Break:** \`break\`, \`brb\`
• **Lunch:** \`lunch\`
• **Back:** \`back\`, \`return\`

**Optional timestamps (AM/PM required):**
• \`connected @ 9:30 AM\`
• \`lunch at 12:00 PM\`
• \`back 1:00 PM\`
• \`break 2pm\`

**Commands:**
• \`summary <user-id> <from-date> [to-date]\` - Get user summary (TSV format)
• \`tally <from-date> [to-date]\` - Get all users summary (TSV format)
• \`help\` - Show this help message

**Date format:** YYYY-MM-DD (to-date defaults to today)

**Examples:**
• \`connected @ 9:00 AM\`
• \`lunch\`
• \`back @ 2:07 PM\`
• \`disconnected @ 5:30 PM\` (shows net hours)
• \`summary user123 2026-02-20 2026-02-22\`
• \`tally 2026-02-16\``;
  }

  getSuggestions(message) {
    const suggestions = [
      'Try: `connected @ 9:00 AM` to log start time (tracked silently)',
      'Try: `lunch` to log lunch break (tracked silently)',
      'Try: `back @ 2:00 PM` to return from break (tracked silently)',
      'Try: `disconnected @ 5:30 PM` to log end time (shows net hours)',
      'Try: `help` to see all commands'
    ];
    return suggestions.join('\n');
  }
}

module.exports = { MessageParser };
