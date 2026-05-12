/**
 * In-memory storage for timesheet messages
 * Stores messages by conversation ID and message ID for edit support
 */
class Storage {
  constructor() {
    // Map structure: conversationId -> messageId -> entry
    this.messages = new Map();
  }

  /**
   * Store or update a message entry
   */
  storeMessage(conversationId, messageId, entry) {
    if (!this.messages.has(conversationId)) {
      this.messages.set(conversationId, new Map());
    }
    
    this.messages.get(conversationId).set(messageId, entry);
  }

  /**
   * Get all entries for a user in a conversation
   */
  getUserEntries(conversationId, userId) {
    const conversationMessages = this.messages.get(conversationId);
    if (!conversationMessages) return [];

    const entries = [];
    for (const entry of conversationMessages.values()) {
      if (entry.userId === userId) {
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Get all entries in a conversation
   */
  getAllEntries(conversationId) {
    const conversationMessages = this.messages.get(conversationId);
    if (!conversationMessages) return [];

    return Array.from(conversationMessages.values());
  }

  /**
   * Get entries for a user between dates
   */
  getUserEntriesByDateRange(conversationId, userId, startDate, endDate) {
    const entries = this.getUserEntries(conversationId, userId);
    const startTime = new Date(startDate + 'T00:00:00').getTime();
    const endTime = new Date(endDate + 'T23:59:59').getTime();

    return entries.filter(entry => {
      const entryTime = entry.timestamp.getTime();
      return entryTime >= startTime && entryTime <= endTime;
    });
  }

  /**
   * Get all entries for all users between dates
   */
  getAllEntriesByDateRange(conversationId, startDate, endDate) {
    const entries = this.getAllEntries(conversationId);
    const startTime = new Date(startDate + 'T00:00:00').getTime();
    const endTime = new Date(endDate + 'T23:59:59').getTime();

    return entries.filter(entry => {
      const entryTime = entry.timestamp.getTime();
      return entryTime >= startTime && entryTime <= endTime;
    });
  }

  /**
   * Get unique users in a conversation
   */
  getUniqueUsers(conversationId) {
    const entries = this.getAllEntries(conversationId);
    const users = new Map();

    for (const entry of entries) {
      if (!users.has(entry.userId)) {
        users.set(entry.userId, entry.userName);
      }
    }

    return users;
  }

  /**
   * Format date as YYYY-MM-DD using local date components.
   */
  _formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Group entries by date
   */
  groupByDate(entries) {
    const grouped = new Map();

    for (const entry of entries) {
      const date = this._formatDate(entry.timestamp);
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date).push(entry);
    }

    return grouped;
  }

  /**
   * Group entries by user and date
   */
  groupByUserAndDate(entries) {
    const grouped = new Map();

    for (const entry of entries) {
      const date = this._formatDate(entry.timestamp);
      const key = `${entry.userId}|${date}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          userId: entry.userId,
          userName: entry.userName,
          date: date,
          entries: []
        });
      }
      grouped.get(key).entries.push(entry);
    }

    return Array.from(grouped.values());
  }
}

module.exports = { Storage };
