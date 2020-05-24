function BasicStopWatch() {
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;s
}


BasicStopWatch.prototype.breakdown = function(rawMilliseconds) {
    /*
    Breaks milliseconds down into more specific units
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
BasicStopWatch.prototype.difference = function(startValue, stopValue) {
    /*
    Finds the difference between two values
    */
    return Math.abs(stopValue - startValue);
}

BasicStopWatch.prototype.start = function(timestamp) {
    /*
    Starts the BasicStopWatch
    */
    this.startValue = timestamp || Date.now();
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = this.startValue;
}


BasicStopWatch.prototype.totalDuration = function(timestamp) {
    /*
    Finds the total duration of the BasicStopWatch
    */
    if (!this.startValue) {
        return 0;
    }
    var stopValue = this.stopValue || timestamp || Date.now();
    return this.difference(this.startValue, stopValue);
}


BasicStopWatch.prototype.splitDuration = function(timestamp) {
    /*
    Finds the duration of the BasicStopWatch since the end of the last split
    */
    if (!this.startValue) {
        return 0;
    }
    var now = timestamp || Date.now(),
    return this.difference(this.lastSplit, now);
}


BasicStopWatch.prototype.addSplit = function(timestamp) {
    /*
    A method for recording a most recent split based on a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    var timestamp = timestamp || Date.now(),
    var splitEnd = timestamp,
    splitStart = this.lastSplit,
    value = this.difference(splitStart, splitEnd);
    this.splits.push(value);
    this.lastSplit = splitEnd;
    return value;
}


BasicStopWatch.prototype.stop = function(timestamp) {
    /*
    Stop the BasicStopWatch at a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    if (this.stopValue) {
        throw Error('BasicStopWatch has already been stopped');
    }
    this.stopValue = timestamp || Date.now();
    return this.difference(this.startValue, this.stopValue);
}


BasicStopWatch.prototype.reset = function() {
    /*
    Reset the state of the BasicStopWatch
    */
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;
}


BasicStopWatch.prototype.isRunning = function() {
    /*
    indicates if the BasicStopWatch is currently running (started but not stopped)
    */
    return this.startValue && !this.stopValue;
}


BasicStopWatch.prototype.isActive = function() {
    /*
    indicates if the BasicStopWatch has been used.
    If the BasicStopWatch has been reset since being used, will return false
    */
    return this.startValue;
}



function FullStopWatch() {
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;
    this.localGap = null;
    this.totalGap = null;
}


FullStopWatch.prototype.nextNearestSplit = function(value) {
    /*
    A helper method for finding the split containing the given value
    Also calculates the difference between the total duration up until that split
    and the given value
    */
  var nearestSplitIndex = -1,
      runningDuration = 0.0;
  for (var i = 0; i < this.splits.length; i++) {
    var splitValue = this.splits[i]
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


FullStopWatch.prototype.breakdown = function(rawMilliseconds) {
    /*
    Breaks milliseconds down into more specific units
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
FullStopWatch.prototype.difference = function(startValue, stopValue) {
    /*
    Finds the difference between two values
    */
    return Math.abs(stopValue - startValue);
}

FullStopWatch.prototype.start = function(timestamp) {
    /*
    Starts the stopwatch
    */
    BasicStopWatch.prototype.start.call(this, timestamp);
    this.localGap = 0.0;
    this.totalGap = 0.0;
}


FullStopWatch.prototype.totalDuration = function(timestamp) {
    /*
    Finds the total duration of the stopwatch
    */
    if (!this.startValue) {
        return 0;
    }
    var stopValue = this.stopValue || timestamp || Date.now();
    return this.difference(this.startValue + this.totalGap, stopValue);
}


FullStopWatch.prototype.splitDuration = function(timestamp) {
    /*
    Finds the duration of the stopwatch since the end of the last split
    */
    if (!this.startValue) {
        return 0;
    }
    var now = timestamp || Date.now(),
    splitStart = this.lastSplit + this.localGap;
    return this.difference(splitStart, now);
}


FullStopWatch.prototype.removeSplit = function(index) {
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
    split = this.splits[index];
    this.splits.splice(index, 1);
    if(isLastSplit) {
        this.lastSplit -= split;
    } else {
        this.splits[index] += split;
    }
}


FullStopWatch.prototype.addRelativeSplit = function(value) {
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
        difference = this.splits[index] - nextNearestSplit.difference;
        this.splits[index] = nextNearestSplit.difference;
    }
    this.splits.splice(index, 0, difference);
    return value;
}


FullStopWatch.prototype.addSplit = function(timestamp) {
    /*
    A method for recording a most recent split based on a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    var timestamp = timestamp || Date.now(),
        splitEnd = timestamp,
        splitStart = this.lastSplit + this.localGap,
        value = this.difference(splitStart, splitEnd);
    this.splits.push(value);
    this.lastSplit = splitEnd;
    this.localGap = 0.0;
    return value;
}


FullStopWatch.prototype.update = function(index, value) {
    var splitCount = this.splits.length;
    if (index < 0) {
        index = splitCount + index;
    }
    var oldValue = this.splits[index],
        difference = oldValue - value;
    this.splits[index] = value;
    if (index === splitCount - 1) {
        this.lastSplit -= difference;
    } else {
        this.splits[index + 1] += difference;
    }
}


FullStopWatch.prototype.stop = function(timestamp) {
    /*
    Stop the stopwatch at a given timestamp
    defaults to the current date-time
    where timestamp is the unix timestamp in milliseconds
    */
    if (this.stopValue) {
        throw Error('Stopwatch has already been stopped');
    }
    this.stopValue = timestamp || Date.now();
    return this.difference(this.startValue + this.totalGap, this.stopValue);
}


FullStopWatch.prototype.resume = function(timestamp) {
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
}


FullStopWatch.prototype.reset = function() {
    /*
    Reset the state of the stopwatch
    */
    BasicStopWatch.prototype.reset.call(this);
    this.localGap = null;
    this.totalGap = null;
}



function MetaDataStopWatch() {
    FullStopWatch.call(this);
    this.metadata = {};
}


MetaDataStopWatch.prototype.start = function(timestamp) {
    BasicStopWatch.prototype.start.call(this, timestamp);
    var startTime = new Date(timestamp);
    this.metadata.start = {
        at: startTime
    };
    this.metadata.splits = [];
    this.metadata.stops = [];
    this.metadata.resumes = [];
}


MetaDataStopWatch.prototype.stop = function(timestamp) {
    BasicStopWatch.prototype.stop.call(this, timestamp);
    stopTime = new Date(timestamp);
    this.metadata.stop = {
        at: stopTime
    };
    this.metadata.stops.push(stopTime);
}


MetaDataStopWatch.prototype.resume = function(timestamp) {
    FullStopWatch.prototype.resume.call(this, timestamp);
    var resumeTime = new Date(timestamp);
    this.metadata.resumes.push(resumeTime);
}


MetaDataStopWatch.prototype.addRelativeSplit = function(value) {
    /*  Adds a split at the specified duration
    Value is given in milliseconds since the stopwatch started
    */
    var nextNearestSplit = this.nextNearestSplit(value),
    metadata = {
        createdAt: new Date()
    }
    index;
    FullStopWatch.prototype.addRelativeSplit.call(this, value);
    if (nextNearestSplit.index < 0) {
        index = this.splits.length - 1;
    }
    this.metadata.splice(index, 0, metadata);
    return value;
}


MetaDataStopWatch.prototype.addSplit = function(timestamp) {
    var value = BasicStopWatch.prototype.addSplit.call(this, timestamp),
        splitTime = new Date(timestamp),
        metadata = {
            createdAt: splitTime
        };
    this.metadata.splits.push(metadata);
    return value;
}


MetaDataStopWatch.prototype.update = function(index, value) {
    FullStopWatch.prototype.update.call(this, index, value);
    this.metadata.splits[index].updatedAt = new Date();
}


MetaDataStopWatch.prototype.reset = function() {
    BasicStopWatch.prototype.reset.call(this);
    this.metadata = {};
}


try {
    module.exports = BasicStopWatch;
} catch {}
