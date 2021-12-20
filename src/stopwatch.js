class Stopwatch extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      id: props.id,
      stopwatch: props.stopwatch,
      requestAnimationFrameId: null,
      clocks: {
        total: {},
        split: {},
        lap: {}
      }
    };
    this.updateClocks();
    this.onStart = this.onStart.bind(this);
    this.onStop = this.onStop.bind(this);
    this.onResume = this.onResume.bind(this);
    this.onReset = this.onReset.bind(this);
    this.onSplit = this.onSplit.bind(this);
    this.onLap = this.onLap.bind(this);
    this.updateClocks = this.updateClocks.bind(this);
  }

  buildControls() {
    var startElement = '';
    const isActive = this.state.stopwatch.isActive(),
          isRunning = this.state.stopwatch.isRunning();
    if (!isActive) {
      startElement = <button className='start' onClick={this.onStart}>Start</button>;
    }
    var stopElement = '',
        resumeElement = '',
        splitElement = '',
        lapElement = '';
    if (isRunning) {
      stopElement = <button className='stop' onClick={this.onStop}>Stop</button>
      splitElement = <button className='split' onClick={this.onSplit}>Split</button>
      lapElement = <button className='lap' onClick={this.onLap}>Lap</button>
    } else {
      resumeElement = <button className='resume' onClick={this.onResume}>Resume</button>
    }

    var resetElement = '';
    if (isActive && !isRunning) {
      resetElement = <button className='reset' onClick={this.onReset}>Reset</button>
    }

    return <div className='controls'>
      {startElement}
      {stopElement}
      {resumeElement}
      {resetElement}
      {splitElement}
      {lapElement}
    </div>
  }

  render() {
    const controlsElement = this.buildControls(),
          totalClock = this.state.clocks.total,
          splitClock = this.state.clocks.split,
          lapClock = this.state.clocks.lap;
    return <div className='stopwatch'>
        <Display classname='display total' years={totalClock.years} days={totalClock.days} hours={totalClock.hours} minutes={totalClock.minutes} seconds={totalClock.seconds} milliseconds={totalClock.milliseconds} />
        <Display classname='display lap' years={lapClock.years} days={lapClock.days} hours={lapClock.hours} minutes={lapClock.minutes} seconds={lapClock.seconds} milliseconds={lapClock.milliseconds} />
        <Display classname='display split' years={splitClock.years} days={splitClock.days} hours={splitClock.hours} minutes={splitClock.minutes} seconds={splitClock.seconds} milliseconds={splitClock.milliseconds} />
        {controlsElement}
      </div>;
  }

  updateClocks() {
    const rawTotalDuration = this.state.stopwatch.totalDuration(),
          totalDuration = BasicStopwatch.breakdown(rawTotalDuration),
          rawSplitDuration = this.state.stopwatch.splitDuration(),
          splitDuration =  BasicStopwatch.breakdown(rawSplitDuration),
          rawLapDuration = this.state.stopwatch.lapDuration(),
          lapDuration = BasicStopwatch.breakdown(rawLapDuration);
    this.setState({clocks: {total: totalDuration, split: splitDuration, lap: lapDuration}});
    requestAnimationFrame(this.updateClocks);
  }

  componentDidMount() {
    if (this.state.stopwatch.isRunning()) {
      requestAnimationFrameId = requestAnimationFrame(this.updateClocks);
      this.setState({requestAnimationFrameId: requestAnimationFrameId});
    }
  }

  componentWillUnmount() {
    if (this.state.requestAnimationFrameId) {
      cancelAnimationFrame(this.state.requestAnimationFrameId)
    }
  }

  onStart() {
    this.state.stopwatch.start();
    requestAnimationFrameId = requestAnimationFrame(this.updateClocks);
    this.setState({stopwatch: this.state.stopwatch, requestAnimationFrameId: requestAnimationFrameId});
  }

  onStop() {
    this.state.stopwatch.stop();
    cancelAnimationFrame(this.state.requestAnimationFrameId);
    this.setState({stopwatch: this.state.stopwatch, requestAnimationFrameId: this.state.requestAnimationFrameId});
  }

  onResume() {
    this.state.stopwatch.resume();
    requestAnimationFrameId = requestAnimationFrame(this.updateClocks);
    this.setState({stopwatch: this.state.stopwatch, requestAnimationFrameId: requestAnimationFrameId});
  }

  onReset() {
    this.state.stopwatch.reset();
    this.setState({stopwatch: this.state.stopwatch});
  }

  onSplit() {
    this.state.stopwatch.addSplit();
    this.setState({stopwatch: this.state.stopwatch});
  }

  onLap() {
    this.state.stopwatch.addLap();
    this.setState({stopwatch: this.state.stopwatch});
  }

}


class Display extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      years: props.years,
      days: props.days,
      hours: props.hours,
      minutes: props.minutes,
      seconds: props.seconds || 0.0,
      milliseconds: props.milliseconds,
    };
  }

  calculateDurationAttribute() {
    var durationValue = '';
    if (this.props.years) {
        durationValue += `${this.props.years}Y`;
    }
    if (this.props.days) {
        durationValue += `${this.props.days}D`;
    }
    if (this.props.hours) {
        durationValue += `${this.props.hours}H`;
    }
    if (this.props.minutes) {
        durationValue += `${this.props.minutes}M`;
    }
    var durationSeconds = this.props.seconds;
    if (this.props.milliseconds) {
        durationSeconds += `.${this.props.milliseconds}`;
    }
    if (durationSeconds) {
      durationSeconds += 'S';
      durationValue += durationSeconds;
    }
    if (durationValue) {
      durationValue = 'PT' + durationValue;
    }
    return durationValue;
  }

  render() {
    const durationValue = this.calculateDurationAttribute();
    return (
      <time className={this.props.classname} dateTime={durationValue}>
        <span className='years'>{this.props.years}</span>:
        <span className='days'>{this.props.days}</span>:
        <span className='hours'>{this.props.hours}</span>:
        <span className='minutes'>{this.props.minutes}</span>:
        <span className='seconds'>{this.props.seconds}</span>.
        <span className='milliseconds'>{this.props.milliseconds}</span>
      </time>
    );
  }
}
