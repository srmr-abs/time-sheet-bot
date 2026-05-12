class TimeCalculator {
  /**
   * Calculate work time for a day based on entries
   */
  calculateDaySummary(entries) {
    if (entries.length === 0) return null;

    // Sort entries by timestamp
    const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let totalMinutes = 0;
    let breakMinutes = 0;
    let currentStart = null;
    let onBreak = false;
    let breakStart = null;

    for (const entry of sorted) {
      switch (entry.status) {
        case 'connected':
          if (!currentStart) {
            currentStart = entry.timestamp;
          }
          break;

        case 'break':
        case 'lunch':
          if (currentStart && !onBreak) {
            // Add time from start to break
            totalMinutes += this.getMinutesDiff(currentStart, entry.timestamp);
            breakStart = entry.timestamp;
            onBreak = true;
            currentStart = null; // Work paused, now on break
          }
          break;

        case 'back':
          if (onBreak && breakStart) {
            // Calculate break duration
            breakMinutes += this.getMinutesDiff(breakStart, entry.timestamp);
            currentStart = entry.timestamp;
            onBreak = false;
            breakStart = null;
          }
          break;

        case 'disconnected':
          if (currentStart) {
            // Add final work period
            totalMinutes += this.getMinutesDiff(currentStart, entry.timestamp);
            currentStart = null;
          }
          if (onBreak && breakStart) {
            // If disconnected while on break, count break time
            breakMinutes += this.getMinutesDiff(breakStart, entry.timestamp);
            onBreak = false;
            breakStart = null;
          }
          break;
      }
    }

    const grossMinutes = totalMinutes + breakMinutes;

    return {
      totalMinutes: grossMinutes,
      breakMinutes,
      workMinutes: totalMinutes,
      entries: sorted
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
