var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var BasicStopwatch = (function () {
    function BasicStopwatch() {
        this.startValue = null;
        this.stopValue = null;
        this.totalGap = 0.0;
        var now = new Date;
        this.metadata = {
            createdAt: now,
            startedAt: null,
            stoppedAt: null,
            resumedAt: null,
            resetAt: null,
            lastModified: null,
            timezone: now.getTimezoneOffset()
        };
    }
    BasicStopwatch.prototype.setStartValue = function (newStartValue) {
        var now = new Date();
        if (!this.startValue && newStartValue) {
            this.metadata.startedAt = now;
        }
        this.startValue = newStartValue;
        this.metadata.lastModified = now;
    };
    BasicStopwatch.prototype.setStopValue = function (newStopValue) {
        var now = new Date();
        if (newStopValue) {
            if (!this.startValue) {
                throw Error('Cannot set a stopValue on a timer that has not started');
            }
            this.metadata.stoppedAt = now;
        }
        this.stopValue = newStopValue;
        this.metadata.lastModified = now;
    };
    BasicStopwatch.prototype.start = function (timestamp) {
        this.startValue = timestamp || Date.now();
        this.stopValue = null;
        var now = new Date();
        this.metadata.startedAt = now;
        this.metadata.lastModified = now;
    };
    BasicStopwatch.prototype.stop = function (timestamp) {
        if (!this.startValue) {
            throw Error('Stopwatch has not been started');
        }
        if (this.stopValue) {
            throw Error('Stopwatch has already been stopped');
        }
        this.stopValue = timestamp || Date.now();
        var now = new Date();
        this.metadata.stoppedAt = now;
        this.metadata.lastModified = now;
    };
    BasicStopwatch.prototype.resume = function (timestamp) {
        if (!this.stopValue) {
            throw Error('Stopwatch is already running, cannot resume');
        }
        var startValue = timestamp || Date.now(), now = new Date(), stopValue = this.stopValue, gap = BasicStopwatch.difference(startValue, stopValue);
        this.totalGap += gap;
        this.stopValue = null;
        this.metadata.lastModified = now;
        this.metadata.resumedAt = now;
    };
    BasicStopwatch.prototype.reset = function () {
        this.startValue = null;
        this.stopValue = null;
        this.totalGap = 0.0;
        this.metadata.startedAt = null;
        this.metadata.stoppedAt = null;
        var now = new Date();
        this.metadata.lastModified = now;
        this.metadata.resetAt = now;
    };
    BasicStopwatch.prototype.totalDuration = function (timestamp) {
        if (!this.startValue) {
            return 0;
        }
        var stopValue = timestamp || this.stopValue || Date.now();
        return BasicStopwatch.difference(this.startValue + this.totalGap, stopValue);
    };
    BasicStopwatch.prototype.isRunning = function () {
        return !!this.startValue && !this.stopValue;
    };
    BasicStopwatch.prototype.isActive = function () {
        return !!this.startValue;
    };
    BasicStopwatch.difference = function (startValue, endValue) {
        return Math.abs(endValue - startValue);
    };
    BasicStopwatch.breakdown = function (rawMilliseconds) {
        var totalSeconds = Math.floor(rawMilliseconds / 1000), totalMinutes = Math.floor(totalSeconds / 60), totalHours = Math.floor(totalMinutes / 60), totalDays = Math.floor(totalHours / 24), milliseconds = rawMilliseconds % 1000, seconds = totalSeconds % 60, minutes = totalMinutes % 60, hours = totalHours % 24, days = Math.floor(totalHours / 24), years = Math.floor(totalDays / 365);
        return {
            'milliseconds': milliseconds,
            'seconds': seconds,
            'minutes': minutes,
            'hours': hours,
            'days': days,
            'years': years
        };
    };
    return BasicStopwatch;
}());
var Split = (function () {
    function Split(value, metadata) {
        this.value = value;
        this.metadata = metadata;
    }
    return Split;
}());
var SplitStopwatch = (function (_super) {
    __extends(SplitStopwatch, _super);
    function SplitStopwatch() {
        var _this = _super.call(this) || this;
        _this.splits = [];
        _this.lastSplit = null;
        _this.splitGap = 0.0;
        return _this;
    }
    SplitStopwatch.prototype.setStartValue = function (newStartValue) {
        var now = new Date(), hasSplits = this.splits.length > 0;
        if (!newStartValue && (hasSplits || this.stopValue)) {
            throw Error('An active stopwatch must have a startValue');
        }
        else if (newStartValue && this.startValue && hasSplits) {
            var oldStartValue = this.startValue, difference = newStartValue - oldStartValue;
            this.splits[0].value += difference;
            this.splits[0].metadata.lastModified = now;
        }
        _super.prototype.setStartValue.call(this, newStartValue);
    };
    SplitStopwatch.prototype.setStopValue = function (newStopValue) {
        var now = new Date();
        if (this.stopValue && this.splits.length > 0) {
            var oldStopValue = this.stopValue, difference = newStopValue - oldStopValue, lastIndex = this.splits.length - 1;
            this.splits[lastIndex].value += difference;
            this.splits[lastIndex].metadata.lastModified = now;
        }
        _super.prototype.setStopValue.call(this, newStopValue);
    };
    SplitStopwatch.prototype.start = function (timestamp) {
        _super.prototype.start.call(this, timestamp);
        this.splits = [];
        this.lastSplit = this.startValue;
    };
    SplitStopwatch.prototype.resume = function (timestamp) {
        if (!this.stopValue) {
            throw Error('Stopwatch is not stopped');
        }
        var timestamp = timestamp || Date.now(), stopValue = this.stopValue, gap = BasicStopwatch.difference(stopValue, timestamp);
        _super.prototype.resume.call(this, timestamp);
        this.splitGap += gap;
    };
    SplitStopwatch.prototype.reset = function () {
        _super.prototype.reset.call(this);
        this.splits = [];
        this.splitGap = 0.0;
        this.lastSplit = null;
    };
    SplitStopwatch.prototype.nextNearestSplit = function (value) {
        var nearestSplitIndex = -1, runningDuration = 0.0;
        for (var i = 0; i < this.splits.length; i++) {
            var splitValue = this.splits[i].value;
            runningDuration += splitValue;
            if (runningDuration > value) {
                nearestSplitIndex = i;
                break;
            }
        }
        var difference = runningDuration - value;
        return {
            index: nearestSplitIndex,
            difference: difference
        };
    };
    SplitStopwatch.prototype.addRelativeSplit = function (value) {
        if (!this.startValue || !this.lastSplit) {
            throw Error('Stopwatch is not currently running');
        }
        var nextNearestSplit = this.nextNearestSplit(value), index, difference;
        if (nextNearestSplit.index < 0) {
            index = this.splits.length;
            difference = Math.abs(nextNearestSplit.difference);
            this.lastSplit += difference;
            this.splitGap = 0.0;
        }
        else {
            index = nextNearestSplit.index;
            difference = this.splits[index].value - nextNearestSplit.difference;
            this.splits[index].value = nextNearestSplit.difference;
            this.splits[index].metadata.lastModified = new Date();
        }
        var metadata = {
            createdAt: new Date(),
            lastModified: null
        }, data = {
            value: difference,
            metadata: metadata
        };
        this.splits.splice(index, 0, data);
        return data;
    };
    SplitStopwatch.prototype.addSplit = function (timestamp) {
        if (!this.startValue || !this.lastSplit) {
            throw Error('Stopwatch is not currently running');
        }
        var timestamp = timestamp || Date.now(), isTimestamp = timestamp > this.startValue;
        if (!isTimestamp) {
            return this.addRelativeSplit(timestamp);
        }
        var splitEnd = timestamp, splitStart = this.lastSplit + this.splitGap, value = BasicStopwatch.difference(splitStart, splitEnd), metadata = {
            createdAt: new Date(),
            lastModified: null
        }, data = new Split(value, metadata);
        this.splits.push(data);
        this.lastSplit = splitEnd;
        this.splitGap = 0.0;
        return data;
    };
    SplitStopwatch.prototype.removeSplit = function (index) {
        if (!this.startValue || !this.lastSplit) {
            throw Error('Stopwatch is not currently running');
        }
        var originalSplitsLength = this.splits.length;
        if (index >= originalSplitsLength) {
            throw RangeError('index ' + index + ' does not exists in splits');
        }
        if (index < 0) {
            index = originalSplitsLength + index;
        }
        var isLastSplit = index === originalSplitsLength - 1, split = this.splits[index].value;
        this.splits.splice(index, 1);
        if (isLastSplit) {
            this.lastSplit -= split;
        }
        else {
            this.splits[index].value += split;
            this.splits[index].metadata.lastModified = new Date();
        }
    };
    SplitStopwatch.prototype.updateSplit = function (index, value) {
        var splitCount = this.splits.length, now = new Date();
        if (index < 0) {
            index = splitCount + index;
        }
        var oldValue = this.splits[index].value, difference = oldValue - value;
        this.splits[index].value = value;
        this.splits[index].metadata.lastModified = now;
        if (this.lastSplit !== null) {
            this.lastSplit = this.startValue;
        }
        if (index === splitCount - 1) {
            this.lastSplit -= difference;
        }
        else {
            this.splits[index + 1].value += difference;
            this.splits[index + 1].metadata.lastModified = now;
        }
    };
    SplitStopwatch.prototype.splitDuration = function (timestamp) {
        if (!this.startValue || !this.lastSplit) {
            return 0;
        }
        var now = timestamp || this.stopValue || Date.now(), splitStart = this.lastSplit + this.splitGap;
        return BasicStopwatch.difference(splitStart, now);
    };
    return SplitStopwatch;
}(BasicStopwatch));
var Lap = (function (_super) {
    __extends(Lap, _super);
    function Lap(value, distance, distanceUnit, metadata) {
        var _this = _super.call(this, value, metadata) || this;
        _this.distance = distance;
        _this.distanceUnit = distanceUnit;
        return _this;
    }
    Lap.prototype.pace = function () {
        return this.value / this.distance;
    };
    Lap.prototype.speed = function () {
        return this.distance / this.value;
    };
    return Lap;
}(Split));
var LapStopwatch = (function (_super) {
    __extends(LapStopwatch, _super);
    function LapStopwatch(lapDistance, lapUnit) {
        var _this = _super.call(this) || this;
        _this.lastLap = null;
        _this.lapDistance = lapDistance;
        _this.lapUnit = lapUnit;
        _this.lapGap = 0.0;
        _this.lapCount = 0;
        return _this;
    }
    LapStopwatch.prototype.start = function (timestamp) {
        var timestamp = timestamp || Date.now();
        _super.prototype.start.call(this, timestamp);
        this.lastLap = timestamp;
    };
    LapStopwatch.prototype.resume = function (timestamp) {
        var startValue = timestamp || Date.now();
        if (!this.stopValue) {
            throw Error('Stopwatch is already running, cannot resume');
        }
        var startValue = timestamp || Date.now(), stopValue = this.stopValue, gap = BasicStopwatch.difference(startValue, stopValue);
        this.lapGap += gap;
        _super.prototype.resume.call(this, timestamp);
    };
    LapStopwatch.prototype.addLap = function (timestamp) {
        if (!this.lastLap) {
            throw Error('Stopwatch must already be running');
        }
        var timestamp = timestamp || Date.now(), lapEnd = timestamp, lapStart = this.lastLap + this.lapGap, value = BasicStopwatch.difference(lapStart, lapEnd), metadata = {
            createdAt: new Date(),
            lastModified: null
        }, lap = new Lap(value, this.lapDistance, this.lapUnit, metadata);
        this.splits.push(lap);
        this.lastSplit = this.lastLap = timestamp;
        this.splitGap = this.lapGap = 0.0;
        this.lapCount++;
        return lap;
    };
    LapStopwatch.prototype._removeLap = function (index) {
        var originalSplitsLength = this.splits.length;
        if (index >= originalSplitsLength) {
            throw RangeError('index ' + index + ' does not exists in splits');
        }
        if (index < 0) {
            index = originalSplitsLength + index;
        }
        var isLastSplit = index === originalSplitsLength - 1, nextLapIndex = null, lapDuration = this.splits[index].value;
        this.splits.splice(index, 1);
        if (isLastSplit) {
            this.lastSplit -= lapDuration;
        }
        else {
            this.splits[index].value += lapDuration;
            this.splits[index].metadata.lastModified = new Date();
            for (var i = index; i < this.splits.length; i++) {
                if (this.splits[i] instanceof Lap) {
                    nextLapIndex = i;
                    break;
                }
            }
        }
        var hasNextLap = nextLapIndex !== null, followedbySplit = nextLapIndex !== index;
        if (hasNextLap && followedbySplit) {
            this.splits[nextLapIndex].value += lapDuration;
            this.splits[nextLapIndex].metadata.lastModified = new Date();
        }
        else {
            this.lastLap -= lapDuration;
        }
        this.lapCount--;
    };
    LapStopwatch.prototype._removeSplit = function (index) {
        var originalSplitsLength = this.splits.length;
        if (index >= originalSplitsLength) {
            throw RangeError('index ' + index + ' does not exists in splits');
        }
        if (index < 0) {
            index = originalSplitsLength + index;
        }
        var isLastSplit = index === originalSplitsLength - 1, split = this.splits[index].value;
        this.splits.splice(index, 1);
        if (isLastSplit) {
            this.lastSplit -= split;
        }
        else if (!(this.splits[index] instanceof Lap)) {
            this.splits[index].value += split;
            this.splits[index].metadata.lastModified = new Date();
        }
    };
    ;
    LapStopwatch.prototype.removeSplit = function (index) {
        if (!this.startValue || !this.lastSplit) {
            throw Error('Stopwatch is not currently running');
        }
        var originalSplitsLength = this.splits.length;
        if (index >= originalSplitsLength) {
            throw RangeError('index ' + index + ' does not exists in splits');
        }
        if (index < 0) {
            index = originalSplitsLength + index;
        }
        var isLap = this.splits[index] instanceof Lap;
        if (isLap) {
            this._removeLap(index);
        }
        else {
            this._removeSplit(index);
        }
    };
    LapStopwatch.prototype.updateSplit = function (index, value) {
        var splitCount = this.splits.length, now = new Date();
        if (index < 0) {
            index = splitCount + index;
        }
        var oldValue = this.splits[index].value, difference = oldValue - value;
        this.splits[index].value = value;
        this.splits[index].metadata.lastModified = now;
        if (this.lastSplit !== null) {
            this.lastSplit = this.startValue;
        }
        if (index === splitCount - 1) {
            this.lastSplit -= difference;
        }
        else {
            this.splits[index + 1].value += difference;
            this.splits[index + 1].metadata.lastModified = now;
        }
    };
    LapStopwatch.prototype.lapDuration = function (timestamp) {
        if (!this.startValue || !this.lastLap) {
            return 0;
        }
        var now = timestamp || this.stopValue || Date.now(), lapStart = this.lastLap + this.lapGap;
        return BasicStopwatch.difference(lapStart, now);
    };
    LapStopwatch.prototype.reset = function () {
        _super.prototype.reset.call(this);
        this.lapGap = 0.0;
        this.lapCount = 0;
    };
    return LapStopwatch;
}(SplitStopwatch));
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        'BasicStopwatch': BasicStopwatch,
        'SplitStopwatch': SplitStopwatch,
        'LapStopwatch': LapStopwatch
    };
}
//# sourceMappingURL=stopwatch.web.js.map