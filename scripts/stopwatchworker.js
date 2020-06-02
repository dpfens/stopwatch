self.importScripts('/libs/stopwatch/src/js/stopwatch.js');

var stopwatch = new StopWatch(),
interval = null;

onmessage = function(e) {
    var data = JSON.parse(e.data),
    action = data['action'];
    if (action == 'start') {
        stopwatch.start(data.timestamp);
        interval = setInterval(postCurrentDuration, 10);
        var data = { action: 'start'};
        postMessage(JSON.stringify(data));
    }
    else if (action == 'resume') {
        stopwatch.resume();
        if (!interval) {
            interval = setInterval(postCurrentDuration, 10);
        }
        var data = { action: 'resume'};
        postMessage(JSON.stringify(data));
    }
    else if (action == 'split') {
        var splitDuration = stopwatch.split(data.timestamp),
        splitDurationBreakdown = stopwatch.breakdown(splitDuration),

        durationData = {
            breakdown: splitDurationBreakdown,
            timestamp: splitDuration,
            number: stopwatch.splits.length
        },
        data = { action: 'split', data: durationData};
        postMessage(JSON.stringify(data));
    }
    else if (action == 'stop') {
        stopwatch.stop(data.timestamp);
        clearInterval(interval);
        interval = null;
        var totalDuration = stopwatch.totalDuration(data.timestamp),
        totalDurationBreakdown = stopwatch.breakdown(totalDuration),
        splitDuration = stopwatch.splitDuration(data.timestamp),
        splitDurationBreakdown = stopwatch.breakdown(splitDuration),
        durationData = {
            total: {
                breakdown: totalDurationBreakdown,
                timestamp: totalDuration,
            },
            split: {
                breakdown: splitDurationBreakdown,
                timestamp: splitDuration
            }
        },
        outgoingData = {action: 'stop', data: durationData};
        postMessage(JSON.stringify(outgoingData));
    }
    else if (action == 'reset') {
        stopwatch.reset();
        var defaultTimeBreakdown = stopwatch.breakdown(0),
        durationData = {
            total: {
                breakdown: defaultTimeBreakdown,
                timestamp: 0
            },
            split: {
                breakdown: defaultTimeBreakdown,
                timestamp: 0
            }
        };
        data = { action: 'reset', data: durationData};
        postMessage(JSON.stringify(data));
    }
}


function postCurrentDuration() {
    var now = Date.now(),
    totalDuration = stopwatch.totalDuration(now),
    splitDuration = stopwatch.splitDuration(now),
    totalDurationBreakdown = stopwatch.breakdown(totalDuration),
    splitDurationBreakdown = stopwatch.breakdown(splitDuration),
    durationData = {
        total: {
            breakdown: totalDurationBreakdown,
            timestamp: totalDuration,
        },
        split: {
            breakdown: splitDurationBreakdown,
            timestamp: splitDuration,
            number: stopwatch.splits.length
        }
    },
    data = {action: 'display', data: durationData},
    serializedData = JSON.stringify(data);
    postMessage(serializedData);
}
