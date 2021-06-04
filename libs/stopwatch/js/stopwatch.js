function StopWatch() {
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;
    this.localGap = null;
    this.totalGap = null;
    var now = new Date;
    this.metadata = {
        createdAt: now,
        startedAt: null,
        stoppedAt: null,
        resetAt: null,
        lastModified: null,
        timezone: now.getTimezoneOffset()
    };
}

StopWatch.prototype.nextNearestSplit = function(value) {
    /*
    A helper method for finding the split containing the given value
    Also calculates the difference between the total duration up until that split
    and the given value
    */
  var nearestSplitIndex = -1,
      runningDuration = 0.0;
  for (var i = 0; i < this.splits.length; i++) {
    var splitValue = this.splits[i].value;
    runningDuration += splitValue;
    if (runningDuration > value) {
      nearestSplitIndex = i;
      break;
    }
  }
  return {
      index: nearestSplitIndex,
      difference: runningDuration - value
  };
}


StopWatch.prototype.breakdown = function(rawMilliseconds) {
    /*
    Breaks milliseconds down into more specific units (years, days, etc)
    */
    var totalSeconds = parseInt(Math.floor(rawMilliseconds / 1000)),
    totalMinutes = parseInt(Math.floor(totalSeconds / 60)),
    totalHours = parseInt(Math.floor(totalMinutes / 60)),
    totalDays = parseInt(Math.floor(totalHours / 24)),

    milliseconds = parseInt(rawMilliseconds % 1000),
    seconds = parseInt(totalSeconds % 60),
    minutes = parseInt(totalMinutes % 60),
    hours = parseInt(totalHours % 24),
    days = parseInt(Math.floor(totalHours / 24)),
    years = parseInt(Math.floor(totalDays / 365));

    return {
        'milliseconds': milliseconds,
        'seconds': seconds,
        'minutes': minutes,
        'hours': hours,
        'days': days,
        'years': years
    };
}

;
StopWatch.prototype.difference = function(startValue, stopValue) {
    /*
    Finds the difference between two values
    */
    return Math.abs(stopValue - startValue);
}

StopWatch.prototype.start = function(timestamp) {
    /*
    Starts the stopwatch
    */
    this.startValue = timestamp || Date.now();
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = this.startValue;
    this.localGap = 0.0;
    this.totalGap = 0.0;
    var now = new Date;
    this.metadata.startedAt = now;
    this.metadata.lastModified = now;
}


StopWatch.prototype.totalDuration = function(timestamp) {
    /*
    Finds the total duration of the stopwatch
    */
    if (!this.startValue) {
        return 0;
    }
    var stopValue = timestamp || this.stopValue || Date.now();
    return this.difference(this.startValue + this.totalGap, stopValue);
}


StopWatch.prototype.splitDuration = function(timestamp) {
    /*
    Finds the duration of the stopwatch since the end of the last split
    */
    if (!this.startValue) {
        return 0;
    }
    var now = timestamp || this.stopValue || Date.now(),
    splitStart = this.lastSplit + this.localGap;
    return this.difference(splitStart, now);
}


StopWatch.prototype.removeSplit = function(index) {
    /*
    Removes the split at a given index.
    Recalculates the split after the removed split to ensure no information is lost
    If the last split, reverts the lastSplit property to ensure the
        splitDuration method still returns accurate values
    */
    var originalSplitsLength = this.splits.length;
    if(index >= originalSplitsLength) {
        throw RangeError('index ' + index + ' does not exists in splits');
    }
    if (index < 0) {
        index = originalSplitsLength + index;
    }
    var isLastSplit = index === originalSplitsLength - 1,
    split = this.splits[index].value;
    this.splits.splice(index, 1);
    if(isLastSplit) {
        this.lastSplit -= split;
    } else {
        this.splits[index].value += split;
        this.splits[index].metadata.lastModified = new Date();
    }
}


StopWatch.prototype.addRelativeSplit = function(value) {
    /*  Adds a split at the specified duration
    Value is given in milliseconds since the stopwatch started
    */
    var splitCount = this.splits.length,
        nextNearestSplit = this.nextNearestSplit(value),
        index,
        difference;
    if (nextNearestSplit.index < 0) { // adding a new last split
        index = this.splits.length;
        difference = Math.abs(nextNearestSplit.difference);
        this.lastSplit += difference;
        this.localGap = 0.0;
    } else {
        index = nextNearestSplit.index;
        difference = this.splits[index].value - nextNearestSplit.difference;
        this.splits[index].value = nextNearestSplit.difference;
        this.splits[index].metadata.lastModified = new Date();
    }
    var data = {
        value: difference,
        metadata: {
            createdAt: new Date(),
            lastModified: null,
        }
    };
    this.splits.splice(index, 0, data);
    return data;
}


StopWatch.prototype.addSplit = function(timestamp) {
    /*
    A method for recording a most recent split based on a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    var timestamp = timestamp || Date.now(),
    isTimestamp = timestamp > this.startValue;
    if (!isTimestamp) {
        return this.addRelativeSplit(timestamp);
    }
    var splitEnd = timestamp,
    splitStart = this.lastSplit + this.localGap,
    value = this.difference(splitStart, splitEnd),
    data = {
        value: value,
        metadata: {
            createdAt: new Date(),
            lastModified: null,
        }
    };
    this.splits.push(data);
    this.lastSplit = splitEnd;
    this.localGap = 0.0;
    return data;
}


StopWatch.prototype.update = function(index, value) {
    var splitCount = this.splits.length,
        now = new Date();
    if (index < 0) {
        index = splitCount + index;
    }
    var oldValue = this.splits[index].value,
        difference = oldValue - value;
    this.splits[index].value = value;
    this.splits[index].metadata.lastModified = now;
    if (index === splitCount - 1) {
        this.lastSplit -= difference;
    } else {
        this.splits[index + 1].value += difference;
        this.splits[index + 1].metadata.lastModified = now;
    }
}


StopWatch.prototype.stop = function(timestamp) {
    /*
    Stop the stopwatch at a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    if (this.stopValue) {
        throw Error('Stopwatch has already been stopped');
    }
    this.stopValue = timestamp || Date.now();
    var now = new Date();
    this.metadata.stoppedAt = now;
    this.metadata.lastModified = now;
    return this.difference(this.startValue + this.totalGap, this.stopValue);
}


StopWatch.prototype.resume = function(timestamp) {
    /*
    Resume the stopwatch at a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    if (!this.stopValue) {
        throw Error('Stopwatch is already running, cannot resume');
    }
    var startValue = timestamp || Date.now(),
    stopValue = this.stopValue,
    gap = this.difference(startValue, stopValue);
    this.localGap += gap;
    this.totalGap += gap;
    this.stopValue = null;
    this.metadata.stoppedAt = null;
    this.metadata.lastModified = new Date();
}


StopWatch.prototype.reset = function() {
    /*
    Reset the state of the stopwatch
    */
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;
    this.localGap = null;
    this.totalGap = null;

    this.metadata.startedAt = null;
    this.metadata.stoppedAt = null;
    this.metadata.resetAt = new Date;
}


StopWatch.prototype.isRunning = function() {
    /*
    indicates if the stopwatch is currently running (started but not stopped)
    */
    return !!this.startValue && !this.stopValue;
}


StopWatch.prototype.isActive = function() {
    /*
    indicates if the stopwatch has been used.
    If the stopwatch has been reset since being used, will return false
    */
    return !!this.startValue;
}


StopWatch.from = function(data) {
  var now = new Date;
    var instance = new StopWatch();
    for (var key in data) {
        instance[key] = data[key];
    }
    instance.metadata.createdAt = now;
    instance.metadata.lastModified = null;
    instance.metadata.resetAt = null;
    instance.metadata.timezone = now.getTimezoneOffset();
    return instance;
}

try {
    module.exports = StopWatch;
} catch (error) {}
