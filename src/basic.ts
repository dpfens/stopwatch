interface StopWatchMetadata {
  readonly createdAt: Date;
  startedAt: Date | null;
  stoppedAt: Date | null;
  resetAt: Date | null;
  lastModified: Date | null;
  timezone: number | null;
}

interface CreationModificationDates {
  readonly createdAt: Date;
  lastModified: Date | null;
}


class BasicStopwatch {
  protected startValue: number | null;
  protected stopValue: number | null;
  private totalGap: number;
  public metadata: StopWatchMetadata;

  constructor() {
    this.startValue = null;
    this.stopValue = null;
    this.totalGap = 0.0;
    var now: Date = new Date;
    this.metadata = {
        createdAt: now,
        startedAt: null,
        stoppedAt: null,
        resetAt: null,
        lastModified: null,
        timezone: now.getTimezoneOffset()
    };
  }

  setStartValue(newStartValue: number | null) {
    var now: Date = new Date();
    if (!this.startValue && newStartValue) {
      this.metadata.startedAt = now;
    }
    this.startValue = newStartValue;
    this.metadata.lastModified = now;
  }


  setStopValue(newStopValue: number | null) {
    var now: Date = new Date();
    if (newStopValue) {
      if (!this.startValue) {
        throw Error('Cannot set a stopValue on a timer that has not started');
      }
      this.metadata.stoppedAt = now;
    }
    this.stopValue = newStopValue;
    this.metadata.lastModified = now;
  }

  start(timestamp: number): void {
    this.startValue = timestamp || Date.now();
    this.stopValue = null;
    var now = new Date();
    this.metadata.startedAt = now;
    this.metadata.lastModified = now;
  }

  stop(timestamp: number): void {
    if (!this.startValue) {
        throw Error('Stopwatch has not been started');
    }
    if (this.stopValue) {
        throw Error('Stopwatch has already been stopped');
    }
    this.stopValue = timestamp || Date.now();
    var now: Date = new Date();
    this.metadata.stoppedAt = now;
    this.metadata.lastModified = now;
  }

  resume(timestamp: number): void {
    if (!this.stopValue) {
        throw Error('Stopwatch is already running, cannot resume');
    }
    var startValue = timestamp || Date.now(),
    stopValue = this.stopValue,
    gap = BasicStopwatch.difference(startValue, stopValue);
    this.totalGap += gap;
    this.stopValue = null;
    this.metadata.stoppedAt = null;
    this.metadata.lastModified = new Date();
  }

  reset(): void {
    this.startValue = null;
    this.stopValue = null;
    this.totalGap = 0.0;
    this.metadata.startedAt = null;
    this.metadata.stoppedAt = null;
    var now = new Date();
    this.metadata.lastModified = now;
    this.metadata.resetAt = now;
  }

  totalDuration(timestamp: number): number {
      /*
      Finds the total duration of the stopwatch
      */
      if (!this.startValue) {
          return 0;
      }
      var stopValue: number = timestamp || this.stopValue || Date.now();
      return BasicStopwatch.difference(this.startValue + this.totalGap, stopValue);
  }

  isRunning(): boolean {
    // Indicates if the stopwatch is currently running (started but not stopped)
    return !!this.startValue && !this.stopValue;
  }

  isActive(): boolean {
    // Indicates if the stopwatch has been used.
    // If the stopwatch has been reset since being used, will return false
    return !!this.startValue;
  }

  static difference(startValue: number, endValue: number): number {
    return Math.abs(endValue - startValue);
  }

  static breakdown(rawMilliseconds: number): object {
    var totalSeconds: number = Math.floor(rawMilliseconds / 1000),
    totalMinutes: number = Math.floor(totalSeconds / 60),
    totalHours: number = Math.floor(totalMinutes / 60),
    totalDays: number = Math.floor(totalHours / 24),

    milliseconds: number = rawMilliseconds % 1000,
    seconds: number = totalSeconds % 60,
    minutes: number = totalMinutes % 60,
    hours: number = totalHours % 24,
    days: number = Math.floor(totalHours / 24),
    years: number = Math.floor(totalDays / 365);

    return {
        'milliseconds': milliseconds,
        'seconds': seconds,
        'minutes': minutes,
        'hours': hours,
        'days': days,
        'years': years
    };
  }

}

class Split {
  public value: number;
  public metadata: CreationModificationDates;

  constructor(value: number, metadata: CreationModificationDates) {
    this.value = value;
    this.metadata = metadata;
  }
}

interface SplitDifference {
  index: number;
  difference: number;
}


class SplitStopwatch extends BasicStopwatch {
  protected splitGap: number;
  protected splits: Array<Split>;
  protected lastSplit: number | null;

  constructor() {
    super();
    this.splits = [];
    this.lastSplit = null;
    this.splitGap = 0.0;
  }

  setStartValue(newStartValue: number | null) {
    var now: Date = new Date(),
        hasSplits: boolean = this.splits.length > 0;
    if (!newStartValue && (hasSplits || this.stopValue)) {
      throw Error('An active stopwatch must have a startValue');
    }
    else if(newStartValue && this.startValue && hasSplits) {
        var oldStartValue: number = this.startValue,
            difference: number = newStartValue - oldStartValue;
        this.splits[0].value += difference;
        this.splits[0].metadata.lastModified = now;
      }
    super.setStartValue(newStartValue);
  }

  setStopValue(newStopValue: number) {
    var now: Date = new Date();
    if (this.stopValue && this.splits.length > 0) {
      var oldStopValue: number = this.stopValue,
          difference: number = newStopValue - oldStopValue,
          lastIndex: number = this.splits.length - 1;
      this.splits[lastIndex].value += difference;
      this.splits[lastIndex].metadata.lastModified = now;
    }
    super.setStopValue(newStopValue);
  }

  start(timestamp: number): void {
    super.start(timestamp);
    this.splits = [];
    this.lastSplit = this.startValue;
  }

  resume(timestamp: number): void {
    if (!this.stopValue) {
      throw Error('Stopwatch is not stopped');
    }
    var timestamp = timestamp || Date.now(),
        stopValue = this.stopValue,
        gap = BasicStopwatch.difference(stopValue, timestamp);
    super.resume(timestamp);
    this.splitGap += gap;
  }

  reset():void {
    super.reset();
    this.splits = [];
    this.splitGap = 0.0;
    this.lastSplit = null;
  }

  nextNearestSplit(value: number): SplitDifference {
    /*
    A helper method for finding the split containing the given value
    Also calculates the difference between the total duration up until that split
    and the given value
    */
    var nearestSplitIndex: number = -1,
        runningDuration: number = 0.0;
    for (var i: number = 0; i < this.splits.length; i++) {
      var splitValue: number = this.splits[i].value;
      runningDuration += splitValue;
      if (runningDuration > value) {
        nearestSplitIndex = i;
        break;
      }
    }
    var difference: number = runningDuration - value;
    return {
        index: nearestSplitIndex,
        difference: difference
    };
  }

  addRelativeSplit(value: number): Split {
      /*  Adds a split at the specified duration
      Value is given in milliseconds since the stopwatch started
      */
      if (!this.startValue || !this.lastSplit) {
        throw Error('Stopwatch is not currently running');
      }
      var nextNearestSplit: SplitDifference = this.nextNearestSplit(value),
          index,
          difference;
      if (nextNearestSplit.index < 0) { // adding a new last split
          index = this.splits.length;
          difference = Math.abs(nextNearestSplit.difference);
          this.lastSplit += difference;
          this.splitGap = 0.0;
      } else {
          index = nextNearestSplit.index;
          difference = this.splits[index].value - nextNearestSplit.difference;
          this.splits[index].value = nextNearestSplit.difference;
          this.splits[index].metadata.lastModified = new Date();
      }
      var metadata: CreationModificationDates = {
          createdAt: new Date(),
          lastModified: null
      },
      data: Split = {
          value: difference,
          metadata: metadata
      };
      this.splits.splice(index, 0, data);
      return data;
  }

  addSplit(timestamp: number): Split {
      /*
      A method for recording a most recent split based on a given timestamp
      defaults to the current date-time
      where timestamp is the unix timestamp in milliseconds
      */
      if (!this.startValue || !this.lastSplit) {
        throw Error('Stopwatch is not currently running');
      }
      var timestamp: number = timestamp || Date.now(),
      isTimestamp: boolean = timestamp > this.startValue;
      if (!isTimestamp) {
          return this.addRelativeSplit(timestamp);
      }
      var splitEnd: number = timestamp,
      splitStart: number = this.lastSplit + this.splitGap,
      value: number = BasicStopwatch.difference(splitStart, splitEnd),
      metadata: CreationModificationDates = {
          createdAt: new Date(),
          lastModified: null,
      },
      data: Split = new Split(value, metadata);
      this.splits.push(data);
      this.lastSplit = splitEnd;
      this.splitGap = 0.0;
      return data;
  }

  removeSplit(index: number): void {
      /*
      Removes the split at a given index.
      Recalculates the split after the removed split to ensure no information is lost
      If the last split, reverts the lastSplit property to ensure the
          splitDuration method still returns accurate values
      */
      if (!this.startValue || !this.lastSplit) {
        throw Error('Stopwatch is not currently running');
      }
      var originalSplitsLength: number = this.splits.length;
      if(index >= originalSplitsLength) {
          throw RangeError('index ' + index + ' does not exists in splits');
      }
      if (index < 0) {
          index = originalSplitsLength + index;
      }
      var isLastSplit = index === originalSplitsLength - 1,
      split: number = this.splits[index].value;
      this.splits.splice(index, 1);
      if(isLastSplit) {
          this.lastSplit -= split;
      } else {
          this.splits[index].value += split;
          this.splits[index].metadata.lastModified = new Date();
      }
  }

  splitDuration(timestamp: number): number {
      /*
      Finds the duration of the stopwatch since the end of the last split
      */
      if (!this.startValue || !this.lastSplit) {
          return 0;
      }
      var now: number = timestamp || this.stopValue || Date.now(),
      splitStart: number = this.lastSplit + this.splitGap;
      return BasicStopwatch.difference(splitStart, now);
  }
}


class Lap extends Split {
  public readonly distance: number;
  public readonly distanceUnit: string;

  constructor(value: number, distance: number, distanceUnit: string, metadata: CreationModificationDates) {
    super(value, metadata);
    this.distance = distance;
    this.distanceUnit = distanceUnit;
  }

  pace(): number {
    return this.value / this.distance;
  }

  speed(): number {
    return this.distance / this.value;
  }
}

class LapStopwatch extends SplitStopwatch {
    public laps: Array<Lap>;
    private lastLap: number | null;
    public readonly lapDistance: number;
    public readonly lapUnit: string;
    private lapGap: number;

  constructor(lapDistance: number, lapUnit: string) {
    super();
    this.laps = [];
    this.lastLap = null;
    this.lapDistance = lapDistance;
    this.lapUnit = lapUnit;
    this.lapGap = 0.0;
  }

  setStartValue(newStartValue: number) {
    var now: Date = new Date();
    if (!this.startValue) {
      this.metadata.startedAt = now;
    }
    var hasSplits: boolean = this.splits.length > 0,
        hasLaps: boolean = this.laps.length > 0;
    if(this.startValue && (hasSplits || hasLaps) ) {
      var oldStartValue: number = this.startValue,
          difference: number = newStartValue - oldStartValue;
      if (hasSplits) {
        this.splits[0].value += difference;
        this.splits[0].metadata.lastModified = now;
      }
      if (hasLaps) {
        this.laps[0].value += difference;
        this.laps[0].metadata.lastModified = now;
      }
    }
    this.startValue = newStartValue;
    this.metadata.lastModified = now;
  }

  setStopValue(newStopValue: number) {
    var now: Date = new Date();
    var hasLaps: boolean = this.laps.length > 0;
    if (this.stopValue && hasLaps) {
      var oldStopValue: number = this.stopValue,
          difference: number = newStopValue - oldStopValue,
          lastIndex: number = this.laps.length - 1;
      this.laps[lastIndex].value += difference;
      this.laps[lastIndex].metadata.lastModified = now;
    }
    super.setStopValue(newStopValue);
  }

  start(timestamp: number): void {
    var timestamp: number = timestamp || Date.now();
    super.start(timestamp);
    this.lastLap = timestamp;
  }

  resume(timestamp: number): void {
    var startValue: number = timestamp || Date.now();
    if (!this.stopValue) {
        throw Error('Stopwatch is already running, cannot resume');
    }
    var startValue: number = timestamp || Date.now(),
    stopValue: number = this.stopValue,
    gap: number = BasicStopwatch.difference(startValue, stopValue);
    this.lapGap += gap;
    super.resume(timestamp);
  }

  _addLap(timestamp: number): Lap {
    if (!this.lastLap) {
        throw Error('Stopwatch must already be running');
    }
    var timestamp: number = timestamp || Date.now(),
        lapStart: number = this.lastLap + this.lapGap,
        value = BasicStopwatch.difference(lapStart, timestamp),
        metadata: CreationModificationDates = {
            createdAt: new Date(),
            lastModified: null,
        },
        lap: Lap = new Lap(value, this.lapDistance, this.lapUnit, metadata);
    this.laps.push(lap);
    this.lastLap = timestamp;
    this.lapGap = 0.0;
    return lap;
  }

  addLap(timestamp: number, takeSplit: boolean=false): Lap {
    var timestamp: number = timestamp || Date.now(),
        lap: Lap = this._addLap(timestamp);
    if(takeSplit) {
        this.addSplit(timestamp);
    }
    return lap;
  }

  lapDuration(timestamp: number): number {
    /*
    Finds the duration of the stopwatch since the end of the last lap
    */
    if (!this.startValue || !this.lastLap) {
        return 0;
    }
    var now: number = timestamp || this.stopValue || Date.now(),
    lapStart: number = this.lastLap + this.lapGap;
    return BasicStopwatch.difference(lapStart, now);
  }

  reset(): void {
      super.reset();
      this.laps = [];
      this.lapGap = 0.0;
  }
}

declare var module: any;
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      'BasicStopwatch': BasicStopwatch,
      'SplitStopwatch': SplitStopwatch,
      'LapStopwatch': LapStopwatch
    };
}
