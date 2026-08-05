// src/types/intl-duration-format.d.ts

declare namespace Intl {
  type DurationUnit = 
    | 'years' | 'months' | 'weeks' | 'days' 
    | 'hours' | 'minutes' | 'seconds' 
    | 'milliseconds' | 'microseconds' | 'nanoseconds';

  type DurationDisplay = 'always' | 'auto';
  
  type DurationStyle = 'long' | 'short' | 'narrow' | 'digital';
  
  type DurationNumberStyle = 'long' | 'short' | 'narrow' | 'numeric' | '2-digit';

  interface DurationFormatOptions {
    localeMatcher?: 'best fit' | 'lookup';
    numberingSystem?: string;
    style?: DurationStyle;
    years?: DurationNumberStyle;
    yearsDisplay?: DurationDisplay;
    months?: DurationNumberStyle;
    monthsDisplay?: DurationDisplay;
    weeks?: DurationNumberStyle;
    weeksDisplay?: DurationDisplay;
    days?: DurationNumberStyle;
    daysDisplay?: DurationDisplay;
    hours?: DurationNumberStyle;
    hoursDisplay?: DurationDisplay;
    minutes?: DurationNumberStyle;
    minutesDisplay?: DurationDisplay;
    seconds?: DurationNumberStyle;
    secondsDisplay?: DurationDisplay;
    milliseconds?: DurationNumberStyle;
    millisecondsDisplay?: DurationDisplay;
    microseconds?: DurationNumberStyle;
    microsecondsDisplay?: DurationDisplay;
    nanoseconds?: DurationNumberStyle;
    nanosecondsDisplay?: DurationDisplay;
    fractionalDigits?: number;
  }

  interface Duration {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
    microseconds?: number;
    nanoseconds?: number;
  }

  interface DurationFormatPart {
    type: 'literal' | DurationUnit;
    value: string;
    unit?: DurationUnit;
  }

  class DurationFormat {
    constructor(locales?: string | string[], options?: DurationFormatOptions | DurationStyle);
    
    format(duration: Duration): string;
    
    formatToParts(duration: Duration): DurationFormatPart[];
    
    resolvedOptions(): Required<DurationFormatOptions>;
    
    static supportedLocalesOf(
      locales: string | string[], 
      options?: { localeMatcher?: 'best fit' | 'lookup' }
    ): string[];
  }
}