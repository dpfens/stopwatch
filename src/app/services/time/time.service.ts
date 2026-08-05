import { computed, Injectable } from '@angular/core';

// Define our own Intl.DurationFormatOptions since it's not in the standard TS types
export interface DurationFormatOptions {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}


@Injectable({
  providedIn: 'root'
})
export class TimeService {
  msDurationFormatter = () => 
    new Intl.DurationFormat(Intl.DateTimeFormat().resolvedOptions().locale, { style: 'digital', hoursDisplay: 'auto', minutesDisplay: 'auto', fractionalDigits: 3 });
  durationFormatter = () =>
    new Intl.DurationFormat(Intl.DateTimeFormat().resolvedOptions().locale, { style: 'digital', hoursDisplay: 'auto', minutesDisplay: 'auto', fractionalDigits: 0 });
  dateTimeFormatter = new Intl.DateTimeFormat(Intl.DateTimeFormat().resolvedOptions().locale, { dateStyle: 'short', timeStyle: 'short' });

  relativeTimeFormatter = computed(() => {
    if ('RelativeTimeFormat' in Intl) {
      return new Intl.RelativeTimeFormat(Intl.DateTimeFormat().resolvedOptions().locale, { style: 'short' });
    }
    return {
      format: (options: Intl.RelativeTimeFormatOptions) => {
        return 'RelativeTimeFormat not supported';
      }
    }
  });

  /**
   * Converts a duration (in milliseconds) to DurationFormat
   * 
   * @param durationMs Duration in milliseconds
   * @param includeMs Whether to include milliseconds in the result (defaults to false)
   */
  toDurationObject(durationMs: number): DurationFormatOptions {
    const milliseconds = Math.floor(durationMs % 1000);
    const seconds = Math.floor(durationMs / 1000) % 60;
    const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
    const hours = Math.floor(durationMs / (1000 * 60 * 60)) % 24;
    const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    
    // Filter out zero values
    const duration: DurationFormatOptions = {};
    if (days > 0) duration.days = days;
    if (hours > 0) duration.hours = hours;
    if (minutes > 0) duration.minutes = minutes;
    if (seconds > 0) duration.seconds = seconds;
    if (milliseconds > 0) duration.milliseconds = milliseconds;

    // Ensure at least one unit is present
    if (Object.keys(duration).length === 0) {
      duration.seconds = 0;
    }
    return duration;
  }

  /**
   * Converts a DurationFormatOptions object back to total milliseconds
   * This is the inverse operation of toDurationObject()
   * 
   * @param duration - The duration object with time components
   * @returns Total duration in milliseconds
   */
  fromDurationObject(duration: DurationFormatOptions): number {
    if (!duration) {
      return 0;
    }

    let totalMs = 0;

    // Convert each time unit to milliseconds and add to total
    if (duration.milliseconds) {
      totalMs += Number(duration.milliseconds);
    }

    if (duration.seconds) {
      totalMs += Number(duration.seconds) * 1000;
    }

    if (duration.minutes) {
      totalMs += Number(duration.minutes) * 60 * 1000;
    }

    if (duration.hours) {
      totalMs += Number(duration.hours) * 60 * 60 * 1000;
    }

    if (duration.days) {
      totalMs += Number(duration.days) * 24 * 60 * 60 * 1000;
    }

    return Math.floor(totalMs);
  }

  /**
   * Get values needed for RelativeTimeFormat
   */
  getRelativeTimeInfo(diffMs: number): { value: number; unit: Intl.RelativeTimeFormatUnit } {
    // Calculate the appropriate unit and value
    const seconds = diffMs / 1000;
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;
    const months = days / 30; // Approximate
    const years = days / 365; // Approximate
    
    if (Math.abs(seconds) < 60) return { value: Math.round(seconds), unit: 'second' };
    if (Math.abs(minutes) < 60) return { value: Math.round(minutes), unit: 'minute' };
    if (Math.abs(hours) < 24) return { value: Math.round(hours), unit: 'hour' };
    if (Math.abs(days) < 30) return { value: Math.round(days), unit: 'day' };
    if (Math.abs(months) < 12) return { value: Math.round(months), unit: 'month' };
    return { value: Math.round(years), unit: 'year' };
  }
}
