var displayElement = document.querySelector('div#time-display'),
    config = {localization: 'en-us'};
    display = new LCDDisplay(displayElement, config);
display.initialize();


if (window.Worker) {
    var stopwatchWorker = new Worker('js/worker.js');

    stopwatchWorker.onmessage = function(e) {
        var data = JSON.parse(e.data),
        action = data.action;
        if (action === 'display' || action == 'stop') {
            var render = function() {
                var currentTime = data.data;
                display.render(currentTime.days, currentTime.hours, currentTime.minutes, currentTime.seconds, currentTime.milliseconds);
            };
            requestAnimationFrame(render);
        }
        else if (action == 'split') {
            console.log(data);
        }
    }

    // UI Buttons
    var startButton = document.querySelector('#start'),
    stopButton = document.querySelector('#stop'),
    resumeButton = document.querySelector('#resume'),
    splitButton = document.querySelector('#split');
    startButton.addEventListener('click', function(e) {
        var data = JSON.stringify({action: 'start', timestamp: Date.now() });
        stopwatchWorker.postMessage(data);
        startButton.disabled = true;
        resumeButton.disabled = true;
        stopButton.disabled = false;
        splitButton.disabled = false;
    });
    stopButton.addEventListener('click', function(e) {
        var data = JSON.stringify({action: 'stop', timestamp: Date.now() });
        stopwatchWorker.postMessage(data);
        startButton.disabled = false;
        resumeButton.disabled = false;
        stopButton.disabled = true;
        splitButton.disabled = true;
    });
    resumeButton.addEventListener('click', function(e) {
        var data = JSON.stringify({action: 'resume'});
        stopwatchWorker.postMessage(data);
        startButton.disabled = true;
        resumeButton.disabled = true;
        stopButton.disabled = false;
        splitButton.disabled = false;
    });
    splitButton.addEventListener('click', function(e) {
        var data = JSON.stringify({action: 'split', timestamp: Date.now() });
        stopwatchWorker.postMessage(data);
    });
}
