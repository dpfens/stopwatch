self.importScripts('../../src/js/stopwatch.js');

var stopwatch = new StopWatch(),
interval = null;

onmessage = function(e) {
    var data = JSON.parse(e.data),
    action = data['action'];
    if (action == 'start') {
        stopwatch.start(data.timestamp);
        interval = setInterval(postCurrentDuration, 10);
    }
    else if (action == 'resume') {
        stopwatch.resume();
        if (!interval) {
            interval = setInterval(postCurrentDuration, 10);
        }
    }
    else if (action == 'split') {
        var split = stopwatch.split(data.timestamp),
        brokenDownSplit = stopwatch.breakdown(split),
        data = { action: 'split', data: brokenDownSplit};
        postMessage(JSON.stringify(data));
    }
    else if (action == 'stop') {
        stopwatch.stop(data.timestamp);
        clearInterval(interval);
        interval = null;
        var endTime = stopwatch.duration(),
        endTimeBreakdown = stopwatch.breakdown(endTime),
        outgoingData = {action: 'stop', data: endTimeBreakdown};
        postMessage(JSON.stringify(outgoingData));
    }
}


function postCurrentDuration() {
    var duration = stopwatch.duration(),
    currentTime = stopwatch.breakdown(duration),
    data = {action: 'display', data: currentTime},
    serializedData = JSON.stringify(data);
    postMessage(serializedData);
}
