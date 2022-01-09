const ListGroup = ReactBootstrap.ListGroup,
      Item = ListGroup.Item,
      InputGroup = ReactBootstrap.InputGroup,
      FormControl = ReactBootstrap.FormControl
      Table = ReactBootstrap.Table,
      Form = ReactBootstrap.Form;


class Stopwatch extends React.Component {


  constructor(props) {
    super(props);
    this.state = {
      requestAnimationFrameId: null,
      clocks: {
        total: {},
        split: {},
        lap: {}
      },
      groups: [],
      edit: false
    };
    this.onStart = this.onStart.bind(this);
    this.onStop = this.onStop.bind(this);
    this.onResume = this.onResume.bind(this);
    this.onReset = this.onReset.bind(this);
    this.onSplit = this.onSplit.bind(this);
    this.onLap = this.onLap.bind(this);
    this.updateClocks = this.updateClocks.bind(this);
    this.animateClock = this.animateClock.bind(this);
  }

  handleNameChange(event) {
    this.props.instance.name = event.target.value;
    this.props.updateInstances();
  }

  handleDescriptionChange(event) {
    this.props.instance.description = event.target.value;
    this.props.updateInstances();
  }

  handleLapDistanceChange(event) {
    var value;
    try {
      value = parseInt(event.target.value);
    } catch (e) {
      try {
        value = parseInt(event.target.value);
      } catch (e) {
        value = '';
      }
    }
    if (isNaN(value)) {
      value = '';
    }
    this.props.instance.stopwatch.lapDistance = value;
    this.props.updateInstances();
  }

  handleLapDistanceUnitChange(event) {
    this.props.instance.stopwatch.lapUnit = event.target.value;
    this.props.updateInstances();
  }

  edit() {
    this.setState({edit: true});
  }

  stopEditing() {
    this.props.instance.edit = false;

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.setState({edit: false});
      self.props.updateInstances();
    });

  }

  updateClocks() {
    const stopwatch = this.props.instance.stopwatch,
          rawTotalDuration = stopwatch.totalDuration(),
          totalDuration = BasicStopwatch.breakdown(rawTotalDuration),
          rawSplitDuration = stopwatch.splitDuration(),
          splitDuration =  BasicStopwatch.breakdown(rawSplitDuration),
          rawLapDuration = stopwatch.lapDuration(),
          lapDuration = BasicStopwatch.breakdown(rawLapDuration),
          clocks = {total: totalDuration, split: splitDuration, lap: lapDuration};
    this.setState({clocks: clocks});
  }

  animateClock() {
    var isRunning = this.props.instance.stopwatch.isRunning();
    this.updateClocks();
    if (isRunning) {
      requestAnimationFrameId = requestAnimationFrame(this.animateClock);
      this.setState({requestAnimationFrameId: requestAnimationFrameId});
    } else {
      this.setState({requestAnimationFrameId: null});
    }
  }

  updateGroups() {
    const groups = this.props.instance.groups,
          promise =  stopwatchAdapter.get(GROUPSTORE, ...groups),
          self = this;
    promise.then(function(events) {
      const groups = events.map(function(event) { return event.target.result });
      self.setState({groups: groups});
    });
  }

  componentDidMount() {
    if (this.props.instance.stopwatch.isActive()) {
      if (this.props.instance.stopwatch.isRunning() && !this.state.requestAnimationFrameId) {
        this.animateClock();
      } else {
        this.updateClocks();
      }
    }
    if (this.props.instance.groups.length) {
      this.updateGroups();
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.instance.stopwatch.isRunning() && !this.state.requestAnimationFrameId) {
      this.animateClock();
    }

    // handle edge case where a stopwatch is in multiple groups and stopwatch is reset.
    // ensures that the stopwatch values are zero-ed out when reset.
    if (!this.props.instance.stopwatch.isActive()) {
      var updateClocks = false;
      for (var key in this.state.clocks.total) {
        if (this.state.clocks.total[key]) {
          updateClocks = true;
          break;
        }
      }

      if(updateClocks) {
        this.updateClocks();
      }
    }

    if (this.props.instance.groups.length !== this.state.groups.length) {
      this.updateGroups();
    }
  }

  componentWillUnmount() {
    if (this.state.requestAnimationFrameId) {
      cancelAnimationFrame(this.state.requestAnimationFrameId);
    }
  }

  toggleLock() {
    var oldState = this.props.instance.locked,
        newState = !oldState,
        newVerb = newState ? 'Locked' : 'Unlocked',
        activity = {
          icon: 'fa-lock',
          type: newVerb,
          description: '',
          timestamp: new Date()
        };
    this.props.instance.activity.unshift(activity);
    this.props.instance.locked = newState;

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.props.updateInstances();
    });
  }

  onStart() {
    this.props.instance.stopwatch.start();
    var startedAt = this.props.instance.stopwatch.metadata.startedAt,
        activity = {
          type: 'Start',
          description: ``,
          timestamp: startedAt
        };
    this.props.instance.activity.unshift(activity);
    const requestAnimationFrameId = this.animateClock(),
          self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.setState({requestAnimationFrameId: requestAnimationFrameId});
      self.props.updateInstances();
    });
  }

  onStop() {
    this.props.instance.stopwatch.stop();
    var stoppedAt = this.props.instance.stopwatch.metadata.stoppedAt,
        activity = {
          type: 'Stop',
          description: ``,
          timestamp: stoppedAt
        };
    this.props.instance.activity.unshift(activity);
        const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.setState({requestAnimationFrameId: self.state.requestAnimationFrameId});
      self.props.updateInstances();
      self.updateClocks();
    });
  }

  onResume() {
    this.props.instance.stopwatch.resume();
    var resumedAt = this.props.instance.stopwatch.metadata.resumedAt,
        activity = {
          type: 'Resume',
          description: ``,
          timestamp: resumedAt
        };
    this.props.instance.activity.unshift(activity);
    const requestAnimationFrameId = this.animateClock(),
          self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.setState({requestAnimationFrameId: requestAnimationFrameId});
      self.props.updateInstances();
    });
  }

  onReset() {
    this.props.instance.stopwatch.reset();
    var resetAt = this.props.instance.stopwatch.metadata.resetAt,
        activity = {
          type: 'Reset',
          description: ``,
          timestamp: new Date()
        };
    this.props.instance.activity.unshift(activity);

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.updateClocks();
      self.props.updateInstances();
    });
  }

  onSplit() {
    var split = this.props.instance.stopwatch.addSplit(),
        splitCount = this.props.instance.stopwatch.splits.length,
        createdAt = split.metadata.createdAt,
        activity = {
          type: 'Split',
          description: ``,
          timestamp: new Date()
        };
    split.name = `Split #${splitCount}`;
    this.props.instance.activity.unshift(activity);

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.props.updateInstances();
    });
  }

  onLap() {
    var lap = this.props.instance.stopwatch.addLap();
    createdAt = lap.metadata.createdAt,
    activity = {
      type: 'Lap',
      description: `Created lap at {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}`,
      timestamp: createdAt
    };
    this.props.instance.activity.unshift(activity);

    const splits = this.props.instance.stopwatch.splits;
    var lapCount = 0;
    for (var i = 0; i < splits.length; i++) {
      var split = splits[i];
      if (split instanceof Lap) {
        lapCount++;
      }
    }
    lap.name = `Lap #${lapCount}`
    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function(events) {
      self.props.updateInstances();
    });
  }

}


class Display extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
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

    var years = this.props.years;
    if (!years) {
      years = '00';
    } else if (years < 10) {
      years = '0' + years;
    } else if (years < 100) {
      years = '00' + years;
    }

    var yearsElement = <span className='years'>{years}</span>,
        days = this.props.days;
    if (!days) {
      days = '00';
      yearsElement = '';
    } else if (days < 10) {
      days = '0' + days;
    }

    var daysElement = <span className='days'>{days}</span>,
        hours = this.props.hours;
    if (!hours) {
      hours = '00';
      daysElement = '';
    } else if (hours < 10) {
      hours = '0' + hours;
    }

    var hoursElement = <span className='hours'>{hours}</span>;
    var minutes = this.props.minutes;
    if (!minutes) {
      minutes = '00';
      hoursElement = '';
    } else if (minutes < 10) {
      minutes = '0' + minutes;
    }

    var seconds = this.props.seconds;
    if (!seconds) {
      seconds = '00';
    } else if (seconds < 10) {
      seconds = '0' + seconds;
    }

    var milliseconds = this.props.milliseconds;
    if (!milliseconds) {
      milliseconds = '000';
    } else if (milliseconds < 10) {
      milliseconds = '00' + milliseconds;
    } else if (milliseconds < 100) {
      milliseconds = '0' + milliseconds;
    }
    return (
      <time className={this.props.classname} dateTime={durationValue}>
        {yearsElement}
        {daysElement}
        {hoursElement}
        <span className='minutes'>{minutes}</span>
        <span className='seconds'>{seconds}</span>
        <span className='milliseconds'>{milliseconds}</span>
      </time>
    );
  }
}


class StopwatchView extends React.Component {
  static contextType = ThemeContext;

  toggleGroupMembership(instance, group) {
    var existingGroups = instance.groups,
        groupId = group.id,
        groupIndex = existingGroups.indexOf(groupId),
        activity = {
          type: 'Group Membership',
          timestamp: new Date()
        };
    if (groupIndex > -1) {
      activity.description = `Removed from "${group.name}" group`;
      existingGroups.splice(groupIndex, 1);
      group.members.splice(group.members.indexOf(instance.id), 1);
    } else {
      activity.description = `Added to "${group.name}" group`;
      existingGroups.push(groupId);
      group.members.push(instance.id);
    }
    instance.activity.push(activity);

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function() {
      self.props.updateInstances();
    });
    stopwatchAdapter.update(GROUPSTORE, group);
  }

  edit(instance) {
    instance.edit = !instance.edit;
    if (!instance.edit) {
      stopwatchAdapter.update(STOPWATCHSTORE, instance);
    }
    this.props.updateInstances();
  }

  show(instance) {
    var activity = {
          icon: 'fa-eye',
          type: 'Show',
          description: '',
          timestamp: new Date()
        };
    instance.activity.unshift(activity);
    instance.visible = true;

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function() {
      self.props.updateInstances();
    });
  }

  hide(instance) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Hide',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.visible = false;

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function() {
      self.props.updateInstances();
    });
  }

  toggleLock(instance) {
    var newState = !instance.locked;
    if (newState) {
      this.lock(instance);
    } else {
      this.unlock(instance);
    }
  }

  lock(instance) {
    var newVerb = 'Locked',
        activity = {
          icon: 'fa-lock',
          type: newVerb,
          description: '',
          timestamp: new Date()
        };
    instance.activity.unshift(activity);
    instance.locked = true;

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function(events) {
      self.props.updateInstances();
    });
  }

  unlock(instance) {
    var newVerb = 'Unlocked',
        activity = {
          icon: 'fa-lock',
          type: newVerb,
          description: '',
          timestamp: new Date()
        };
    instance.activity.unshift(activity);
    instance.locked = false;

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function(events) {
      self.props.updateInstances();
    });
  }
}


class StopwatchListView extends StopwatchView {
  static contextType = ThemeContext;

  buildActions(instance) {
    var editElement = <Dropdown.Item variant="outline-secondary" title='Edit' onClick={this.edit.bind(this, instance)}><i className="fad fa-edit fa-1x"></i> Edit</Dropdown.Item>,
        hideElement = instance.visible ? <Dropdown.Item variant="outline-secondary" title='Hide' onClick={this.hide.bind(this, instance)}><i className="fad fa-eye-slash fa-1x"></i> Hide</Dropdown.Item> :
          <Dropdown.Item variant="outline-secondary" title='Show' onClick={this.show.bind(this, instance)}><i className="fad fa-eye fa-1x"></i> Show</Dropdown.Item>,
        deleteElement = '',
        cloneElement = '';

    if (this.props.deleteInstance) {
      deleteElement = <Dropdown.Item variant="danger" title='Delete' onClick={() => this.props.deleteInstance(index)}><i className="fad fa-trash fa-1x"></i> Delete</Dropdown.Item>;
    }
    if (this.props.cloneInstance) {
      cloneElement = <Dropdown.Item variant="outline-secondary" title='Clone' onClick={() => this.props.cloneInstance(instance)}><i className="fad fa-clone fa-1x"></i> Clone</Dropdown.Item>;
    }
    if (instance.locked) {
      editElement = '';
      deleteElement = '';
      lockIcon = <span><i className='fad fa-unlock fa-1x'></i> Unlock</span>;
    } else {
      lockIcon = <span><i className='fad fa-lock fa-1x'></i> Lock</span>;
    }
    const lockElement = <Dropdown.Item variant="outline-secondary" onClick={this.toggleLock.bind(this, instance)}>{lockIcon}</Dropdown.Item>,
          moreActionsIcon = <i className="fad fa-ellipsis-v fa-1x"></i>;
    return <DropdownButton variant='outline-secondary' align='end' drop='up' title={moreActionsIcon}>
          {editElement}
          {lockElement}
          {cloneElement}
          {hideElement}
          {deleteElement}
        </DropdownButton>;
  }

  renderInstance(instance) {
    const id = instance.id,
    actionsElement = this.buildActions(instance),
    selectInstance = this.props.selectInstance,
    onClickHandler = this.props.groupMode ? function() { selectInstance(instance) } : null,
    isSelected = this.props.selected && this.props.selected.indexOf(instance) > -1;
    element = <StopwatchListItem id={id} onClick={onClickHandler} instance={instance} key={instance.id} updateInstances={this.props.updateInstances} selected={isSelected}>{actionsElement}</StopwatchListItem>;
    return element;
  }

  render() {
    var stopwatchElements = [];
    for (var i = 0; i < this.props.instances.length; i++) {
      var instance = this.props.instances[i],
          element = this.renderInstance(instance);
      stopwatchElements.push(element);
    }
    className = this.props.groupMode ? 'list-item group-mode' : 'list-item';

    return <Row className={className}>
        {stopwatchElements}
      </Row>;
  }
}


class StopwatchListItem extends Stopwatch {
  static contextType = ThemeContext;

  buildControls() {
    const stopwatch = this.props.instance.stopwatch,
      isActive = stopwatch.isActive(),
          isRunning = stopwatch.isRunning();
    var startElement = '';
    if (!isActive) {
      startElement = <Button variant="success" className='start' title='Start' onClick={this.onStart}><i className='fad fa-play fa-1x'></i> Start</Button>;
    }
    var stopElement = '',
        splitElement = '',
        lapElement = '';
    if (isRunning) {
      stopElement = <Button variant="danger" className='stop' title='Stop' onClick={this.onStop}><i className='fad fa-stop fa-1x'></i> Stop</Button>
      splitElement = <Button variant="secondary" className='split' title='Split' onClick={this.onSplit}>Split</Button>
      if (stopwatch.lapDistance) {
        lapElement = <Button variant="secondary" className='lap' title='Lap' onClick={this.onLap}>Lap ({stopwatch.lapDistance}{stopwatch.lapUnit})</Button>
      }
    }

    var resetElement = ''
        resumeElement = '';
    if (isActive && !isRunning) {
      resetElement = <Button variant="danger" className='reset' title='Reset' onClick={this.onReset}>Reset</Button>
      resumeElement = <Button variant="success" className='resume' title='Resume' onClick={this.onResume}><i className='fad fa-play fa-1x'></i> Resume</Button>
    }

    return <React.Fragment>
      {startElement}
      {stopElement}
      {resumeElement}
      {resetElement}
      {splitElement}
      {lapElement}
    </React.Fragment>;
  }

  render() {
    var instance = this.props.instance,
        stopwatch = instance.stopwatch,
        isLocked = this.props.instance.locked,
        clocks = this.state.clocks,
        totalClock = clocks.total,
        splitClock = clocks.split,
        lapClock = clocks.lap,
        lockButton,
        lockIcon,
        classnames = 'stopwatch flippable flippable-v';
    if (this.props.instance.edit) {
      classnames += ' flipped';
    }
    if (isLocked) {
      lockIcon = <i className='fad fa-lock fa-1x'></i>;
    } else {
      lockIcon = <i className='fad fa-unlock fa-1x'></i>;
    }
    lockButton = <Button onClick={this.props.lockToggleHandler}>{lockIcon}</Button>;

    var lapDisplay = '';
    if (stopwatch.lapDistance) {
      lapDisplay = <Display classname='display lap' years={lapClock.years} days={lapClock.days} hours={lapClock.hours} minutes={lapClock.minutes} seconds={lapClock.seconds} milliseconds={lapClock.milliseconds} />;
    }

    var controlsElement;
    if (!instance.locked) {
      controlsElement = this.buildControls();
    }

    return <Item className={classnames} onClick={this.props.onClick} active={this.props.selected}>

      <div className='front d-sm-flex justify-content-between'>
        <div className='d-flex justify-content-between align-items-center top-row'>
          <div className='name'>
            <div>{instance.name}</div>
            <InputGroup className='d-block d-sm-none mt-4'>{controlsElement}{this.props.children}</InputGroup>
          </div>
          <div className='times'>
            <strong><Display classname='display total' years={totalClock.years} days={totalClock.days} hours={totalClock.hours} minutes={totalClock.minutes} seconds={totalClock.seconds} milliseconds={totalClock.milliseconds} /></strong>
            {lapDisplay}
            <Display classname='display split' years={splitClock.years} days={splitClock.days} hours={splitClock.hours} minutes={splitClock.minutes} seconds={splitClock.seconds} milliseconds={splitClock.milliseconds} />
          </div>
        </div>
        <div className='d-sm-flex align-items-center actions d-none'>
          <InputGroup>{controlsElement}{this.props.children}</InputGroup>
        </div>
      </div>

      <div className='back'>

        <div className='d-flex justify-content-between align-items-center'>
          <div className='me-1 ms-1'>
            <InputGroup className="mb-1">
              <InputGroup.Text id="name-stopwatch">Name</InputGroup.Text>
                <FormControl
                placeholder="Name"
                aria-label="name stopwatch"
                aria-describedby="name-stopwatch"
                value={this.props.instance.name}
                onChange={this.handleNameChange.bind(this)}
                />
            </InputGroup>

            <InputGroup className="mb-1">
              <InputGroup.Text id="description-stopwatch">Description</InputGroup.Text>
                <FormControl
                as="textarea"
                placeholder="Search"
                aria-label="search stopwatch"
                aria-describedby="search-stopwatch"
                value={this.props.instance.description}
                onChange={this.handleDescriptionChange.bind(this)}
                />
            </InputGroup>
          </div>

          <div className='me-1'>
            <div className='mb-1 text-align-right'>
              <ButtonGroup>
                <Button variant="outline-secondary" onClick={this.stopEditing.bind(this)}><i className="fad fa-times"></i></Button>
              </ButtonGroup>
            </div>
            <InputGroup className="mb-1">
              <InputGroup.Text id="lap-distance-stopwatch">Lap Distance</InputGroup.Text>
                <FormControl
                type='tel'
                placeholder="Lap Distance"
                aria-label="lap-distance"
                aria-describedby="lap-distance-stopwatch"
                value={this.props.instance.stopwatch.lapDistance}
                onChange={this.handleLapDistanceChange.bind(this)}
                />
            </InputGroup>

              <InputGroup className="mb-1">
                <InputGroup.Text id="lap-distance-unit-stopwatch">Lap Units</InputGroup.Text>
                  <FormControl
                  placeholder="Lap Distance Unit"
                  aria-label="lap-distance"
                  aria-describedby="lap-distance-stopwatch"
                  value={this.props.instance.stopwatch.lapUnit}
                  onChange={this.handleLapDistanceUnitChange.bind(this)}
                  />
              </InputGroup>
          </div>
        </div>
      </div>
    </Item>;
  }
}


class StopwatchGridView extends StopwatchView {
  static contextType = ThemeContext;

  buildStopwatchControls(instance) {
    var lockIcon = <i className='fad fa-lock-open fa-1x'></i>,
        editElement = <Button variant="outline-secondary" title='Edit' onClick={this.edit.bind(this, instance)}><i className="fad fa-edit fa-1x"></i></Button>,
        hideElement = instance.visible ? <Dropdown.Item variant="outline-secondary" title='Hide' onClick={this.hide.bind(this, instance)}><i className="fad fa-eye-slash fa-1x"></i> Hide</Dropdown.Item> :
          <Dropdown.Item variant="outline-secondary" title='Show' onClick={this.show.bind(this, instance)}><i className="fad fa-eye fa-1x"></i> Show</Dropdown.Item>,
        cloneElement,
        deleteElement;

    if (this.props.cloneInstance) {
      cloneElement = <Button variant="outline-secondary" title='Clone' onClick={() => this.props.cloneInstance(instance)}><i className="fad fa-clone fa-1x"></i></Button>
    }
    if (this.props.deleteInstance) {
      deleteElement = <Dropdown.Item variant="danger" title='Delete' onClick={() => this.props.deleteInstance(instance)}><i className="fad fa-trash fa-1x"></i> Delete</Dropdown.Item>;
    }

    if (instance.locked) {
      editElement = '';
      deleteElement = '';
    } else {
      lockIcon = <i className='fad fa-lock fa-1x'></i>;
    }
    const lockElement = <Button variant="outline-secondary" title='Lock' onClick={this.toggleLock.bind(this, instance)}>{lockIcon}</Button>;

    var toggleGroupElement = '';
    if (this.props.groups.length) {
      var toggleGroupElements = [];
      for (var i = 0; i < this.props.groups.length; i++) {
          var group = this.props.groups[i],
              name = group.name,
              isMember = instance.groups.indexOf(name) > -1,
              toggleElement;
              if (isMember) {
                toggleElement = <Dropdown.Item key={name} active onClick={this.toggleGroupMembership.bind(this, instance, group)}><i className='fad fa-check fa-1x'></i> {name}</Dropdown.Item>;
              } else {
                toggleElement = <Dropdown.Item key={name} onClick={this.toggleGroupMembership.bind(this, instance, group)}>{name}</Dropdown.Item>;
              }
          toggleGroupElements.push(toggleElement);
      }
      const addGroupTitle = <i className='fad fa-object-group fa-1x'></i>;
      toggleGroupElement = <DropdownButton variant='outline-secondary' title={addGroupTitle}>
          {toggleGroupElements}
      </DropdownButton>;
    }
    const moreActionsIcon = <i className="fad fa-ellipsis-v fa-1x"></i>;
    return <Row>
      <Col className='text-align-left'>
        <ButtonGroup>
          {toggleGroupElement}
          {lockElement}
          {cloneElement}
        </ButtonGroup>
      </Col>
      <Col className='text-align-right'>
        <ButtonGroup>
          {editElement}
          <DropdownButton variant='outline-secondary' align='end' title={moreActionsIcon}>
              {hideElement}
              {deleteElement}
          </DropdownButton>
        </ButtonGroup>
      </Col>
    </Row>;
  }

  renderStopwatch(instance) {
    var stopwatchActions = this.buildStopwatchControls(instance),
        selectInstance = this.props.selectInstance,
        onClickHandler = this.props.groupMode ? function() { selectInstance(instance) } : null,
        isSelected = this.props.selected && this.props.selected.indexOf(instance) > -1;
    return <Col className='mb-3' xs={12} sm={6} md={4} lg={3} key={instance.id} onClick={onClickHandler}><StopwatchGridItem id={instance.id} instance={instance} updateInstances={this.props.updateInstances} selected={isSelected}>{stopwatchActions}</StopwatchGridItem></Col>
  }

  render() {
    var stopwatchElements = [];
    for (var i = 0; i < this.props.instances.length; i++) {
      var instance = this.props.instances[i],
          element = this.renderStopwatch(instance);
      stopwatchElements.push(element);
    }
    className = this.props.groupMode ? 'grid group-mode' : 'grid';
    return <Row className={className}>
        {stopwatchElements}
      </Row>
  }

}


class StopwatchGridItem extends Stopwatch {
  static contextType = ThemeContext;

  buildControls() {
    const stopwatch = this.props.instance.stopwatch,
      isActive = stopwatch.isActive(),
          isRunning = stopwatch.isRunning();
    var startElement = '';
    if (!isActive) {
      startElement = <Button variant="success" className='start' title='Start' onClick={this.onStart}><i className='fad fa-play fa-1x'></i> Start</Button>;
    }
    var stopElement = '',
        splitElement = '',
        lapElement = '';
    if (isRunning) {
      stopElement = <Button variant="danger" className='stop' title='Stop' onClick={this.onStop}><i className='fad fa-stop fa-1x'></i> Stop</Button>
      splitElement = <Button variant="secondary" className='split' title='Split' onClick={this.onSplit}>Split</Button>
      if (stopwatch.lapDistance) {
        lapElement = <Button variant="secondary" className='lap' title='Lap' onClick={this.onLap}>Lap ({stopwatch.lapDistance}{stopwatch.lapUnit})</Button>
      }
    }

    var resetElement = ''
        resumeElement = '';
    if (isActive && !isRunning) {
      resetElement = <Button variant="danger" className='reset' title='Reset' onClick={this.onReset}>Reset</Button>
      resumeElement = <Button variant="success" className='resume' title='Resume' onClick={this.onResume}><i className='fad fa-play fa-1x'></i> Resume</Button>
    }

    return <ButtonGroup aria-label="Basic example">
      {startElement}
      {stopElement}
      {resumeElement}
      {resetElement}
      {splitElement}
      {lapElement}
    </ButtonGroup>
  }

  renderSplits() {
    const stopwatch = this.props.instance.stopwatch;
    var output = <p>No splits recorded yet.</p>;
    if (stopwatch.splits.length) {
      var splitElements = [],
          hasLaps = false,
          currentLapNumber = 0,
          currentLapDistance = 0.0,
          totalLapDistance = 0.0,
          lapUnits = stopwatch.lapUnit;

      for (var i = 0; i < stopwatch.splits.length; i++) {
          var split = stopwatch.splits[i];
          if (split instanceof Lap) {
              hasLaps = true;
              break;
          }
      }
      for (var i = 0; i < stopwatch.splits.length; i++) {
        var split = stopwatch.splits[i],
            splitValue = split.value,
            splitBreakdown = BasicStopwatch.breakdown(splitValue),
            element = '';

        if (split instanceof Lap) {
          hasLaps = true;
          currentLapNumber += 1;
          currentLapDistance = split.distance;
          totalLapDistance += currentLapDistance;
          element = <tr key={i}>
            <td>{split.name}</td>
            <td>{totalLapDistance}{lapUnits}</td>
            <td>{currentLapDistance}{lapUnits}</td>
            <td><Display years={splitBreakdown.years} days={splitBreakdown.days} hours={splitBreakdown.hours} minutes={splitBreakdown.minutes} seconds={splitBreakdown.seconds} milliseconds={splitBreakdown.milliseconds} /></td>
          </tr>
        } else {
          if (hasLaps) {
            element = <tr key={i}>
              <td>{split.name}</td>
              <td></td>
              <td></td>
              <td><Display years={splitBreakdown.years} days={splitBreakdown.days} hours={splitBreakdown.hours} minutes={splitBreakdown.minutes} seconds={splitBreakdown.seconds} milliseconds={splitBreakdown.milliseconds} /></td>
            </tr>
          } else {
            element = <tr key={i}>
              <td>{split.name}</td>
              <td><Display years={splitBreakdown.years} days={splitBreakdown.days} hours={splitBreakdown.hours} minutes={splitBreakdown.minutes} seconds={splitBreakdown.seconds} milliseconds={splitBreakdown.milliseconds} /></td>
            </tr>
          }

        }
        splitElements.push(element);
      }
      if (hasLaps) {
        output = <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Total Distance</th>
              <th>Lap Distance</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {splitElements}
          </tbody>
        </Table>
      } else {
        output = <Table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            {splitElements}
          </tbody>
        </Table>
      }
    }
    return output;
  }

  render() {
    const instance = this.props.instance,
          stopwatch = instance.stopwatch,
          name = instance.name,
          clocks = this.state.clocks,
          totalClock = clocks.total,
          splitClock = clocks.split,
          lapClock = clocks.lap;

    var classnames = 'stopwatch flippable flippable-h';
    if (this.props.instance.edit) {
      classnames += ' flipped';
    }
    if (this.props.selected) {
      classnames += ' selected bg-primary text-white';
    }
    if (this.props.classname) {
      classnames += ' ' + this.props.classname;
    }

    var controlsElement = '',
        lockElement = <Button variant="outline-secondary" title='Unlock' onClick={this.toggleLock}><i className='fad fa-lock-open fa-1x'></i></Button>;
    if (!instance.locked) {
      controlsElement = this.buildControls();
      lockElement = <Button variant="outline-secondary" title='Lock' onClick={this.toggleLock}><i className='fad fa-lock fa-1x'></i></Button>;
    }

    var lapDisplay = '';
    if (stopwatch.lapDistance) {
      lapDisplay = <Display classname='display lap' years={lapClock.years} days={lapClock.days} hours={lapClock.hours} minutes={lapClock.minutes} seconds={lapClock.seconds} milliseconds={lapClock.milliseconds} />;
    }

    const splitElement = this.renderSplits(),
          activityListElement = <ActivityContainerView instances={this.props.instance.activity} />,
          description = instance.description,
          metadata = stopwatch.metadata,
          createdAt = metadata.createdAt,
          lastModified = metadata.lastModified;

    var lastModifiedElement = '';
    if (lastModified) {
      lastModifiedElement = <p><b>Last Modified At</b>: { lastModified.toLocaleDateString() } { lastModified.toLocaleTimeString() }</p>
    }

    var descriptionElement = '';
    if (description) {
      descriptionElement = <p><i className='fad fa-comment-alt'></i> {description}</p>;
    }

    var groupElements = [];
    for (var i = 0; i < this.state.groups.length; i++) {
      var group = this.state.groups[i],

          element = <Badge pill bg="primary" key={group.id}>{group.name}</Badge>;
      groupElements.push(element);
    }
    var groupElement = <p>{groupElements}</p>;

    return <div className={classnames}>
        <div className='front'>
          <Container>
            <Row>
              <Col>
                {this.props.children}

                <h2>{name}</h2>
                {groupElement}
                <Display classname='display total' years={totalClock.years} days={totalClock.days} hours={totalClock.hours} minutes={totalClock.minutes} seconds={totalClock.seconds} milliseconds={totalClock.milliseconds} />
                {lapDisplay}
                <Display classname='display split' years={splitClock.years} days={splitClock.days} hours={splitClock.hours} minutes={splitClock.minutes} seconds={splitClock.seconds} milliseconds={splitClock.milliseconds} />

                {controlsElement}

                <Tabs defaultActiveKey="split" id="uncontrolled-tab-example" className="mb-3">
                  <Tab eventKey="split" title="Splits">
                    {splitElement}
                  </Tab>
                  <Tab eventKey="metadata" title="Metadata">

                    {descriptionElement}

                    <p><b>Created At</b>: { createdAt.toLocaleDateString() } { createdAt.toLocaleTimeString() }</p>

                    {lastModifiedElement}
                  </Tab>
                  <Tab eventKey="activity" title="Activity">
                    {activityListElement}
                  </Tab>
                </Tabs>
              </Col>
            </Row>
          </Container>
        </div>
        <div className='back'>
          <Container>
            <Row>
              <Col>
                <div className='text-align-right'>
                  <ButtonGroup >
                    <Button variant="outline-secondary" onClick={this.stopEditing.bind(this)}><i className="fad fa-times"></i></Button>
                  </ButtonGroup>
                </div>

                <InputGroup className="mb-3">
                  <InputGroup.Text id="name-stopwatch">Name</InputGroup.Text>
                    <FormControl
                    placeholder="Name"
                    aria-label="name stopwatch"
                    aria-describedby="name-stopwatch"
                    value={this.props.instance.name}
                    onChange={this.handleNameChange.bind(this)}
                    />
                </InputGroup>

                <InputGroup className="mb-3">
                  <InputGroup.Text id="description-stopwatch">Description</InputGroup.Text>
                    <FormControl
                    as="textarea"
                    placeholder="Search"
                    aria-label="search stopwatch"
                    aria-describedby="search-stopwatch"
                    value={this.props.instance.description}
                    onChange={this.handleDescriptionChange.bind(this)}
                    />
                </InputGroup>

                <InputGroup className="mb-3">
                  <InputGroup.Text id="lap-distance-stopwatch">Lap Distance</InputGroup.Text>
                    <FormControl
                    type='tel'
                    placeholder="Lap Distance"
                    aria-label="lap-distance"
                    aria-describedby="lap-distance-stopwatch"
                    value={this.props.instance.stopwatch.lapDistance}
                    onChange={this.handleLapDistanceChange.bind(this)}
                    />
                </InputGroup>

                <InputGroup className="mb-3">
                  <InputGroup.Text id="lap-distance-unit-stopwatch">Lap Units</InputGroup.Text>
                    <FormControl
                    placeholder="Lap Distance Unit"
                    aria-label="lap-distance"
                    aria-describedby="lap-distance-stopwatch"
                    value={this.props.instance.stopwatch.lapUnit}
                    onChange={this.handleLapDistanceUnitChange.bind(this)}
                    />
                </InputGroup>
              </Col>
            </Row>
            </Container>
        </div>
      </div>;
  }

}
