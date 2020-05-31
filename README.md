# Stopwatch
A simple Javascript stopwatch.
The stopwatch records metadata about the stopwatch execution, such as when the stopwatch was started, stopped, and resumed.  All stopwatch measurements are taken using UTC time, to account for timezone changes.  The stopwatch also records when each split was taken and if/when the split was modified.


## Usage

### Basic usage
```javascript
var stopwatchInstance  = new StopWatch();

stopwatchInstance.start();
```

to get the total duration:
```javascript
var currentTotalDuration = stopwatchInstance.totalDuration();
```

To stop the stopwatch:
```javascript
var totalDuration = stopwatchInstance.stop()
```

To resume a stopped stopwatch:
```javascript
stopwatchInstance.resume();
```

To reset a stopwatch, use the `reset` method:
```javascript
stopwatchInstance.reset();
```

### Splits

To take a split for the current time use the `addSplit` method:
```javascript
var splitValue = stopwatchInstance.addSplit();
```

To find the duration of the stopwatch since the last split, use the `splitDuration` method.  The value will be returned in milliseconds:
```javascript
currentSplitDuration = stopwatchInstance.splitDuration();
```

To read all the existing splits taken on the stopwatch:
```javascript
for (var i = 0; i < stopwatchInstance.splits.length; i++) {
    var splitValue = stopwatchInstance.splits[i];
    console.log(splitValue);
}
```

Use the `update` method to change a split at a given `index` to a given `value`.  This method will recalculate the next split to account for the change to the previous split:
```javascript
var index = 1;
    value = 257000; // 4 minutes, 17 seconds
stopwatchInstance.update(index, value);
```
which will set the second split to `257000` milliseconds

To add a new split to the stopwatch, use the `addRelativeSplit(value)`, where the `value` is the number of milliseconds since the start of the stopwatch:
```javascript
var value = 240000;
stopwatchInstance.addRelativeSplit(value);
```
If there is a split after the one specified, its duration will be modified to account for the newly-added split.

To delete a split, use the `removeSplit` method, where the `index` specifies the index of the split to remove.  This method will also modify the next split to account for the change.

```javascript
var index = 2;
stopwatchInstance.removeSplit(index);
```


### State
To find out if the stopwatch is currently being used to time something, use the `isRunning` method:
```javascript
if (stopwatchInstance.isRunning()) {
    stopwatchInstance.stop();
}
```


To find out if the stopwatch has been used and not been reset, use the `isActive` method:
```javascript
if (!stopwatchInstance.isActive()) {
    stopwatchInstance.start();
}
```
