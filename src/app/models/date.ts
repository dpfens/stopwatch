export interface TimeZonedDate {
  timestamp: number;      // Milliseconds since Unix epoch (always UTC)
  timeZone: string;       // IANA timeZone identifier (e.g., "America/New_York")
  timeZoneOffset: number; // Offset in minutes at the time of creation
}


export class TZDate implements TimeZonedDate {
  public readonly timestamp: number;
  public readonly timeZone: string;
  public readonly timeZoneOffset: number;
  
  /**
   * Create a new timeZone-aware date
   * @param date Optional Date object (defaults to now)
   * @param timeZone Optional IANA timeZone (defaults to local)
   * @throws Error if timeZone is invalid
   */
  constructor(date?: Date, timeZone?: string) {
    const now = date || new Date();
    this.timestamp = now.getTime();
    
    // Validate and set timeZone
    this.timeZone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!this.isValidTimeZone(this.timeZone)) {
      throw new Error(`Invalid timeZone: ${timeZone}`);
    }
    
    // Store the timeZone offset at creation time
    this.timeZoneOffset = this.getOffsetForTimeZone(this.timeZone, now);
  }

  toString(): string {
    return this.toISOString();
  }
  
  /**
   * Validate that a timeZone string is a valid IANA identifier
   */
  private isValidTimeZone(timeZone: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timeZone });
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Get the offset in minutes for a specific timeZone at a specific time
   * Accounts for DST and historical timeZone changes
   */
  private getOffsetForTimeZone(timeZone: string, date: Date): number {
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timeZone }));
    return (tzDate.getTime() - utcDate.getTime()) / 60000;
  }
  
  /**
   * Get UTC representation
   */
  toUTCDate(): Date {
    return new Date(this.timestamp);
  }
  
  /**
   * Get date as it would appear in the original timeZone
   */
  toOriginalTimeZoneDate(): Date {
    // This properly handles DST and timeZone changes
    return new Date(new Date(this.timestamp).toLocaleString('en-US', { timeZone: this.timeZone }));
  }
  
  /**
   * Format the date in its original timeZone with optional formatting options
   */
  format(options?: Intl.DateTimeFormatOptions, locale?: string): string {
    return new Intl.DateTimeFormat(locale || 'default', {
      timeZone: this.timeZone,
      dateStyle: 'long',
      timeStyle: 'long',
      ...options
    }).format(this.toUTCDate());
  }
  
  /**
   * Format as ISO string with timeZone information
   */
  toISOString(): string {
    // Format as ISO with timeZone info
    const tzOffset = this.timeZoneOffset;
    const sign = tzOffset >= 0 ? '+' : '-';
    const absOffset = Math.abs(tzOffset);
    const hours = Math.floor(absOffset / 60).toString().padStart(2, '0');
    const minutes = (absOffset % 60).toString().padStart(2, '0');
    
    return `${new Date(this.timestamp).toISOString().slice(0, -1)}${sign}${hours}:${minutes}`;
  }
  
  /**
   * Calculate duration between this time and another TZDate
   * @returns Duration in milliseconds
   */
  durationFrom(startTime: TZDate): number {
    return this.timestamp - startTime.timestamp;
  }
  
  /**
   * Check if this time is before another time
   */
  isBefore(other: TZDate): boolean {
    return this.timestamp < other.timestamp;
  }
  
  /**
   * Check if this time is after another time
   */
  isAfter(other: TZDate): boolean {
    return this.timestamp > other.timestamp;
  }
  
  /**
   * For serialization when sending between users
   */
  toJSON(): TimeZonedDate {
    return {
      timestamp: this.timestamp,
      timeZone: this.timeZone,
      timeZoneOffset: this.timeZoneOffset
    };
  }

  /**
   * Get a Date object that can be used for Intl formatting with this timestamp's timezone
   */
  getDateForFormatting(): { date: Date; timeZone: string } {
    return {
      date: this.toUTCDate(),
      timeZone: this.timeZone
    };
  }
  
  /**
   * Create a new TZDate representing the current time
   */
  static now(timeZone?: string): TZDate {
    return new TZDate(new Date(), timeZone);
  }
  
  /**
   * Create a TZDate from serialized data
   */
  static fromJSON(json: TimeZonedDate): TZDate {
    const tzDate = Object.create(TZDate.prototype);
    tzDate.timestamp = json.timestamp;
    tzDate.timeZone = json.timeZone;
    tzDate.timeZoneOffset = json.timeZoneOffset;
    return tzDate;
  }
}