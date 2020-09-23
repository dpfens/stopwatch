var stopwatch = require('./dist/basic.js');

var instance = new stopwatch.SplitStopwatch();
instance.start();

setTimeout(function() {
  var split = instance.addSplit();
}, 25);

setTimeout(function() {
  var split = instance.addSplit();
  console.log(instance.splits);
  console.log('testing addSplit');
  instance.addSplit(10);
  console.log(instance.splits);
  instance.addSplit(40);
  console.log(instance.splits);
  instance.addSplit(1000);
  console.log(instance.splits);
}, 1000);

setTimeout(function() {
    console.log('testing removeSplit');
    console.log(instance.splits);
    instance.removeSplit(-1);
    var totalDuration = instance.totalDuration();
    console.log(instance.splits);
    console.log('Total Duration: ' + totalDuration);
    instance.addSplit(totalDuration);
    console.log(instance.splits);
    console.log('Total Duration: ' + instance.totalDuration());
    console.log('Split Duration: ' + instance.splitDuration());
    instance.stop();
}, 2000);


setTimeout(function() {
    instance.resume();
}, 2100);


setTimeout(function() {
    console.log('testing stop/resume');
    var totalDuration = instance.totalDuration();
    console.log(instance.splits);
    console.log('Total Duration: ' + totalDuration);
    console.log('Split Duration: ' + instance.splitDuration())
}, 3100);
