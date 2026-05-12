const { ActivityHandler } = require('botbuilder');
const { MessageParser } = require('./parser');
const { TimeCalculator } = require('./timeCalculator');
const { Storage } = require('./storage');

class TimesheetBot extends ActivityHandler {
  constructor() {
    super();
    this.parser = new MessageParser();
    this.calculator = new TimeCalculator();
    this.storage = new Storage();

    // Track user state per conversation per day: conversationId -> userId -> { state, date }
    this.userStates = new Map();

    // Handle messages
    this.onMessage(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    // Handle message updates (edits)
    this.onMessageUpdate(async (context, next) => {
      await this.handleMessage(context);
      await next();
    });

    // Handle new members
    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded || [];
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(
            'Welcome to the Timesheet Bot! 👋\n\n' +
            'I help you track your work hours automatically.\n\n' +
            'Type `help` to see how to use me.'
          );
        }
      }
      await next();
    });
  }

  /**
   * Get the current state for a user in a conversation.
   * Resets to 'idle' if the date has changed.
   */
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
      // New day — reset state
      record.state = 'idle';
      record.date = date;
    }

    return record.state;
  }

  /**
   * Update the state for a user.
   */
  setUserState(conversationId, userId, date, newState) {
    if (!this.userStates.has(conversationId)) {
      this.userStates.set(conversationId, new Map());
    }
    this.userStates.get(conversationId).set(userId, { state: newState, date });
  }

  /**
   * Validate a state transition and return an error message if invalid.
   * Returns null if valid.
   */
  validateStateTransition(currentState, newStatus) {
    // Start messages: connected
    if (newStatus === 'connected') {
      if (currentState === 'working') {
        return '❌ You are already connected. If you need to change your start time, edit your previous message.';
      }
      if (currentState === 'on_break') {
        return '❌ You are on a break. Send `back` first, or `disconnected` to end your day.';
      }
      return null; // idle -> working is valid
    }

    // Stop messages that pause work: break, lunch
    if (newStatus === 'break' || newStatus === 'lunch') {
      if (currentState === 'idle') {
        return '❌ You need to be connected first. Send `connected` to start your day.';
      }
      if (currentState === 'on_break') {
        return '❌ You are already on a break. Send `back` when you return.';
      }
      return null; // working -> on_break is valid
    }

    // Resume message: back
    if (newStatus === 'back') {
      if (currentState === 'idle') {
        return '❌ You need to be connected first. Send `connected` to start your day.';
      }
      if (currentState === 'working') {
        return '❌ You are not on a break. Send `break` or `lunch` first.';
      }
      return null; // on_break -> working is valid
    }

    // End message: disconnected
    if (newStatus === 'disconnected') {
      if (currentState === 'idle') {
        return '❌ No active session found. Send `connected` to start your day.';
      }
      return null; // working or on_break -> idle is valid
    }

    return null;
  }

  async handleMessage(context) {
    const text = context.activity.text?.trim() || '';
    const conversationId = context.activity.conversation.id;
    const messageId = context.activity.id;

    // Get user information
    const userId = context.activity.from.id;
    const userName = context.activity.from.name || 'Unknown User';

    // Handle commands
    if (text.toLowerCase() === 'help') {
      await context.sendActivity(this.parser.getHelpText());
      return;
    }

    const lowerText = text.toLowerCase();
    if (lowerText === 'summary' || lowerText.startsWith('summary ')) {
      await this.handleSummaryCommand(context, conversationId, text);
      return;
    }

    if (lowerText === 'tally' || lowerText.startsWith('tally ')) {
      await this.handleTallyCommand(context, conversationId, text);
      return;
    }

    // Parse the message
    const parsed = this.parser.parse(text);

    if (!parsed.status) {
      await context.sendActivity(
        `❌ **I couldn't understand that message.**\n\n` +
        `I was looking for status keywords like: **connected**, **disconnected**, **break**, **lunch**, or **back**\n\n` +
        `**Here are some examples:**\n` +
        this.parser.getSuggestions(text)
      );
      return;
    }

    // Check for ambiguous time (missing AM/PM)
    if (parsed.timestamp && parsed.timestamp.ambiguous) {
      await context.sendActivity(
        `❌ **I need AM or PM to understand that time.**\n\n` +
        `You wrote: \`${text}\`\n\n` +
        `Please use one of these formats:\n` +
        `• \`connected @ 9:00 AM\`\n` +
        `• \`break 2 PM\`\n` +
        `• \`disconnected @ 5:30 PM\`\n\n` +
        `Or just send \`${parsed.status}\` without a time to use the current time.`
      );
      return;
    }

    const timestamp = parsed.timestamp || new Date();
    const date = this.calculator.formatDate(timestamp);

    // Check if this is a message edit (existing message ID)
    const isEdit = this.storage.messages.has(conversationId) &&
      this.storage.messages.get(conversationId).has(messageId);

    // State validation (skip for edits — user is fixing history)
    if (!isEdit) {
      const currentState = this.getUserState(conversationId, userId, date);
      const error = this.validateStateTransition(currentState, parsed.status);

      if (error) {
        // For warnings (starts with ⚠️), still store the entry
        // For errors (starts with ❌), reject it
        const isWarning = error.startsWith('⚠️');
        await context.sendActivity(error);

        if (!isWarning) {
          return; // Reject invalid transitions
        }
      }

      // Update state
      const nextState = this.getNextState(currentState, parsed.status);
      this.setUserState(conversationId, userId, date, nextState);
    }

    // Create and store the entry
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

    // Respond with net hours for disconnected
    if (parsed.status === 'disconnected') {
      const entries = this.storage.getUserEntriesByDateRange(
        conversationId,
        userId,
        date,
        date
      );

      const summary = this.calculator.calculateDaySummary(entries);
      if (summary) {
        const response = this.calculator.getSummaryText(summary, userName, date);
        await context.sendActivity(response);
      }
    }
  }

  /**
   * Compute the next state after a transition.
   */
  getNextState(currentState, status) {
    if (status === 'connected') return 'working';
    if (status === 'break' || status === 'lunch') return 'on_break';
    if (status === 'back') return 'working';
    if (status === 'disconnected') return 'idle';
    return currentState;
  }

  async handleSummaryCommand(context, conversationId, text) {
    // Parse: summary <user-id> <from-date> [to-date]
    const parts = text.trim().split(/\s+/);
    
    if (parts.length < 3) {
      await context.sendActivity(
        '❌ **Invalid summary command format**\n\n' +
        'Usage: `summary <user-id> <from-date> [to-date]`\n' +
        'Example: `summary user123 2026-02-20 2026-02-22`\n' +
        'Example: `summary user123 2026-02-20` (defaults to today)'
      );
      return;
    }

    const targetUserId = parts[1];
    const fromDate = parts[2];
    const toDate = parts[3] || this.calculator.formatDate(new Date());

    // Validate dates
    if (!this.calculator.parseDate(fromDate) || !this.calculator.parseDate(toDate)) {
      await context.sendActivity(
        '❌ **Invalid date format**\n\n' +
        'Please use YYYY-MM-DD format\n' +
        'Example: `summary user123 2026-02-20 2026-02-22`'
      );
      return;
    }

    const entries = this.storage.getUserEntriesByDateRange(
      conversationId,
      targetUserId,
      fromDate,
      toDate
    );

    if (entries.length === 0) {
      await context.sendActivity(
        `📊 No timesheet entries found for user ${targetUserId} between ${fromDate} and ${toDate}`
      );
      return;
    }

    const tsv = this.generateUserSummaryTSV(entries, fromDate, toDate);
    await context.sendActivity('```\n' + tsv + '\n```');
  }

  async handleTallyCommand(context, conversationId, text) {
    // Parse: tally <from-date> [to-date]
    const parts = text.trim().split(/\s+/);
    
    if (parts.length < 2) {
      await context.sendActivity(
        '❌ **Invalid tally command format**\n\n' +
        'Usage: `tally <from-date> [to-date]`\n' +
        'Example: `tally 2026-02-20 2026-02-22`\n' +
        'Example: `tally 2026-02-20` (defaults to today)'
      );
      return;
    }

    const fromDate = parts[1];
    const toDate = parts[2] || this.calculator.formatDate(new Date());

    // Validate dates
    if (!this.calculator.parseDate(fromDate) || !this.calculator.parseDate(toDate)) {
      await context.sendActivity(
        '❌ **Invalid date format**\n\n' +
        'Please use YYYY-MM-DD format\n' +
        'Example: `tally 2026-02-20 2026-02-22`'
      );
      return;
    }

    const entries = this.storage.getAllEntriesByDateRange(
      conversationId,
      fromDate,
      toDate
    );

    if (entries.length === 0) {
      await context.sendActivity(
        `📊 No timesheet entries found between ${fromDate} and ${toDate}`
      );
      return;
    }

    const tsv = this.generateTallyTSV(entries, fromDate, toDate);
    await context.sendActivity('```\n' + tsv + '\n```');
  }

  generateUserSummaryTSV(entries, fromDate, toDate) {
    const grouped = this.storage.groupByDate(entries);
    const dates = Array.from(grouped.keys()).sort();

    // Determine if we should show daily or weekly based on range
    const daysDiff = Math.ceil(
      (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 7) {
      // Daily breakdown
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
    } else {
      // Weekly breakdown
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
  }

  generateTallyTSV(entries, fromDate, toDate) {
    const grouped = this.storage.groupByUserAndDate(entries);
    
    // Determine if we should show daily or weekly based on range
    const daysDiff = Math.ceil(
      (new Date(toDate) - new Date(fromDate)) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= 7) {
      // Daily breakdown by user
      let tsv = 'User ID\tUser Name\tDate\tHours\tBreak Hours\tNet Hours\n';
      
      // Sort by user, then date
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
    } else {
      // Weekly breakdown by user
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
}

module.exports = { TimesheetBot };
