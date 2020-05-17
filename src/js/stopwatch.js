function StopWatch() {
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;
    this.localGap = null;
    this.totalGap = null;
}


StopWatch.prototype.breakdown = function(rawMilliseconds) {
    var totalSeconds = parseInt(Math.floor(rawMilliseconds / 1000)),
    totalMinutes = parseInt(Math.floor(totalSeconds / 60)),
    totalHours = parseInt(Math.floor(totalMinutes / 60)),

    milliseconds = parseInt(rawMilliseconds % 1000),
    seconds = parseInt(totalSeconds % 60),
    minutes = parseInt(totalMinutes % 60),
    hours = parseInt(totalHours % 24),
    days = parseInt(Math.floor(totalHours / 24));

    return {
        'milliseconds': milliseconds,
        'seconds': seconds,
        'minutes': minutes,
        'hours': hours,
        'days': days
    };
}

;
StopWatch.prototype.difference = function(startValue, stopValue) {
    return Math.abs(stopValue - startValue);
}

StopWatch.prototype.start = function(timestamp) {
    this.startValue = timestamp || Date.now();
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = this.startValue;
    this.localGap = 0.0;
    this.totalGap = 0.0;
}


StopWatch.prototype.totalDuration = function() {
    var stopValue = Date.now();
    if (this.stopValue) {
        stopValue = this.stopValue;
    }
    return this.difference(this.startValue + this.totalGap, stopValue);
}


StopWatch.prototype.splitDuration = function() {
    var now = Date.now(),
    splitStart = this.lastSplit + this.localGap;
    return this.difference(splitStart, now);
}


StopWatch.prototype.split = function() {
    var splitEnd = Date.now(),
    splitStart = this.lastSplit + this.localGap,
    value = this.difference(splitStart, splitEnd);
    this.splits.push(value);
    this.lastSplit = splitEnd;
    this.localGap = 0.0;
    return value;
}


StopWatch.prototype.stop = function(timestamp) {
    this.stopValue = timestamp || Date.now();
    return this.difference(this.startValue + this.totalGap, this.stopValue);
}


StopWatch.prototype.resume = function(timestamp) {
    var startValue = timestamp || Date.now(),
    stopValue = this.stopValue,
    gap = this.difference(startValue, stopValue);
    this.localGap += gap;
    this.totalGap += gap;
    this.stopValue = null;
}


StopWatch.prototype.reset = function() {
    this.startValue = null;
    this.stopValue = null;
    this.splits = [];
    this.lastSplit = null;
    this.localGap = null;
    this.totalGap = null;
}


StopWatch.prototype.isRunning = function() {
    return this.startValue && !this.stopValue;
}


StopWatch.prototype.isActive = function() {
    return this.startValue;
}
