var StopWatch = require('./src/js/stopwatch.js');

var instance = new StopWatch();
instance.start();

setTimeout(function() {
  var split = instance.takeSplit();
  console.log(instance.splits);
}, 25);

setTimeout(function() {
  var split = instance.takeSplit();
  console.log(instance.splits);
  instance.addSplit(10);
  console.log(instance.splits);
  instance.addSplit(40);
  console.log(instance.splits);
  instance.addSplit(1000);
  console.log(instance.splits);
}, 1000);
