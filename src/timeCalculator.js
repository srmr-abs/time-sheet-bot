class TimeCalculator {
  /**
   * Calculate work time for a day based on entries
   */
  calculateDaySummary(entries) {
    if (entries.length === 0) return null;

    // Tag each entry with its original insertion order so multi-session days
    // can be split correctly even when clock times overlap.
    const annotated = [...entries];
    annotated.forEach((e, i) => (e._tmpIdx = i));

    // Sort entries by timestamp, using insertion order as a tie-breaker
    const sorted = [...annotated].sort((a, b) => {
      const tDiff = a.timestamp.getTime() - b.timestamp.getTime();
      return tDiff !== 0 ? tDiff : a._tmpIdx - b._tmpIdx;
    });

    // Handle multiple work sessions on the same day independently
    const sessions = this._extractSessions(sorted);
    if (sessions.length === 0) {
      return this._calculateBlock(sorted);
    }

    let totalWorkMinutes = 0;
    let totalBreakMinutes = 0;

    for (const session of sessions) {
      const result = this._calculateBlock(session);
      totalWorkMinutes += result.workMinutes;
      totalBreakMinutes += result.breakMinutes;
    }

    return {
      totalMinutes: totalWorkMinutes + totalBreakMinutes,
      breakMinutes: totalBreakMinutes,
      workMinutes: totalWorkMinutes,
      entries: sorted
    };
  }

  /**
   * Extract non-overlapping connected...disconnected sessions from sorted entries.
   * Uses original insertion order (_tmpIdx) so sessions are grouped by the
   * chronological span between each connected and its matching disconnected.
   */
  _extractSessions(sorted) {
    const stack = [];
    const rawSessions = [];

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].status === 'connected') {
        stack.push(i);
      } else if (sorted[i].status === 'disconnected') {
        if (stack.length > 0) {
          rawSessions.push({ start: stack.pop(), end: i });
        }
      }
    }

    // Process inner (earlier-closing) sessions first so their entries
    // don't leak into outer sessions.
    rawSessions.sort((a, b) => sorted[a.end]._tmpIdx - sorted[b.end]._tmpIdx);

    const assigned = new Set(); // tracks _tmpIdx, not sorted-array index
    const sessions = [];

    for (const { start, end } of rawSessions) {
      const startEntry = sorted[start];
      const endEntry = sorted[end];
      const sessionEntries = [];
      for (const entry of sorted) {
        if (
          !assigned.has(entry._tmpIdx) &&
          entry._tmpIdx >= startEntry._tmpIdx &&
          entry._tmpIdx <= endEntry._tmpIdx
        ) {
          sessionEntries.push(entry);
          assigned.add(entry._tmpIdx);
        }
      }
      if (sessionEntries.length > 0) {
        sessions.push(sessionEntries);
      }
    }

    return sessions;
  }

  /**
   * Calculate work/break minutes for a single contiguous session.
   */
  _calculateBlock(blockEntries) {
    let totalMinutes = 0;
    let breakMinutes = 0;
    let currentStart = null;
    let onBreak = false;
    let breakStart = null;

    for (const entry of blockEntries) {
      switch (entry.status) {
        case 'connected':
          if (!currentStart) {
            currentStart = entry.timestamp;
          }
          break;

        case 'break':
        case 'lunch':
          if (currentStart && !onBreak) {
            totalMinutes += this.getMinutesDiff(currentStart, entry.timestamp);
            breakStart = entry.timestamp;
            onBreak = true;
            currentStart = null;
          }
          break;

        case 'back':
          if (onBreak && breakStart) {
            breakMinutes += this.getMinutesDiff(breakStart, entry.timestamp);
            currentStart = entry.timestamp;
            onBreak = false;
            breakStart = null;
          }
          break;

        case 'disconnected':
          if (currentStart) {
            totalMinutes += this.getMinutesDiff(currentStart, entry.timestamp);
            currentStart = null;
          }
          if (onBreak && breakStart) {
            breakMinutes += this.getMinutesDiff(breakStart, entry.timestamp);
            onBreak = false;
            breakStart = null;
          }
          break;
      }
    }

    return {
      totalMinutes: totalMinutes + breakMinutes,
      breakMinutes,
      workMinutes: totalMinutes
    };
  }

  /**
   * Format minutes into human-readable string
   */
  formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  }

  /**
   * Format minutes as decimal hours for TSV
   */
  formatHoursDecimal(minutes) {
    return (minutes / 60).toFixed(2);
  }

  /**
   * Calculate minutes between two dates
   */
  getMinutesDiff(start, end) {
    return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  }

  /**
   * Get formatted summary text for immediate response
   */
  getSummaryText(summary, userName, date) {
    const header = `**${userName} - ${date}**\n`;
    const work = `Net Work Time: ${this.formatDuration(summary.workMinutes)}`;
    const breakTime = summary.breakMinutes > 0 
      ? ` (Break: ${this.formatDuration(summary.breakMinutes)})` 
      : '';
    
    return header + work + breakTime;
  }

  /**
   * Format date as YYYY-MM-DD using local date components.
   * toISOString() returns UTC date, which is wrong for early morning hours.
   */
  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Parse date string to Date object
   */
  parseDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Get week boundaries for a date
   */
  getWeekBoundaries(date) {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

    return { weekStart, weekEnd };
  }
}

module.exports = { TimeCalculator };
