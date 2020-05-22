var StopWatch = require('./src/js/stopwatch.js');

var instance = new StopWatch();
instance.start();

setTimeout(function() {
  var split = instance.takeSplit();
}, 25);

setTimeout(function() {
  var split = instance.takeSplit();
  console.log(instance.splits);
  //console.log('testing addSplit');
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
    console.log('totalDuration: ' + totalDuration);
    instance.addSplit(totalDuration);
    console.log(instance.splits);
    console.log(instance.totalDuration());
    console.log(instance.splitDuration());
    instance.stop();
}, 2000);


setTimeout(function() {
    instance.resume();
}, 2100);


setTimeout(function() {
    console.log('testing stop/resume');
    var totalDuration = instance.totalDuration();
    console.log(instance.splits);
    console.log('totalDuration: ' + totalDuration);
    console.log(instance.splitDuration())
}, 3100);
