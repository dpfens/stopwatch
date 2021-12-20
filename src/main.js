const stopwatch = new LapStopwatch();
stopwatch.start();
const element = <Stopwatch stopwatch={stopwatch} />;

ReactDOM.render(
  element,
  document.getElementById('app')
);
