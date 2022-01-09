var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ListGroup = ReactBootstrap.ListGroup,
    Item = ListGroup.Item,
    InputGroup = ReactBootstrap.InputGroup,
    FormControl = ReactBootstrap.FormControl;
Table = ReactBootstrap.Table, Form = ReactBootstrap.Form;

var Stopwatch = function (_React$Component) {
  _inherits(Stopwatch, _React$Component);

  function Stopwatch(props) {
    _classCallCheck(this, Stopwatch);

    var _this = _possibleConstructorReturn(this, (Stopwatch.__proto__ || Object.getPrototypeOf(Stopwatch)).call(this, props));

    _this.state = {
      requestAnimationFrameId: null,
      clocks: {
        total: {},
        split: {},
        lap: {}
      },
      groups: [],
      edit: false
    };
    _this.onStart = _this.onStart.bind(_this);
    _this.onStop = _this.onStop.bind(_this);
    _this.onResume = _this.onResume.bind(_this);
    _this.onReset = _this.onReset.bind(_this);
    _this.onSplit = _this.onSplit.bind(_this);
    _this.onLap = _this.onLap.bind(_this);
    _this.updateClocks = _this.updateClocks.bind(_this);
    _this.animateClock = _this.animateClock.bind(_this);
    return _this;
  }

  _createClass(Stopwatch, [{
    key: 'handleNameChange',
    value: function handleNameChange(event) {
      this.props.instance.name = event.target.value;
      this.props.updateInstances();
    }
  }, {
    key: 'handleDescriptionChange',
    value: function handleDescriptionChange(event) {
      this.props.instance.description = event.target.value;
      this.props.updateInstances();
    }
  }, {
    key: 'handleLapDistanceChange',
    value: function handleLapDistanceChange(event) {
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
  }, {
    key: 'handleLapDistanceUnitChange',
    value: function handleLapDistanceUnitChange(event) {
      this.props.instance.stopwatch.lapUnit = event.target.value;
      this.props.updateInstances();
    }
  }, {
    key: 'edit',
    value: function edit() {
      this.setState({ edit: true });
    }
  }, {
    key: 'stopEditing',
    value: function stopEditing() {
      this.props.instance.edit = false;

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.setState({ edit: false });
        self.props.updateInstances();
      });
    }
  }, {
    key: 'updateClocks',
    value: function updateClocks() {
      var stopwatch = this.props.instance.stopwatch,
          rawTotalDuration = stopwatch.totalDuration(),
          totalDuration = BasicStopwatch.breakdown(rawTotalDuration),
          rawSplitDuration = stopwatch.splitDuration(),
          splitDuration = BasicStopwatch.breakdown(rawSplitDuration),
          rawLapDuration = stopwatch.lapDuration(),
          lapDuration = BasicStopwatch.breakdown(rawLapDuration),
          clocks = { total: totalDuration, split: splitDuration, lap: lapDuration };
      this.setState({ clocks: clocks });
    }
  }, {
    key: 'animateClock',
    value: function animateClock() {
      var isRunning = this.props.instance.stopwatch.isRunning();
      this.updateClocks();
      if (isRunning) {
        requestAnimationFrameId = requestAnimationFrame(this.animateClock);
        this.setState({ requestAnimationFrameId: requestAnimationFrameId });
      } else {
        this.setState({ requestAnimationFrameId: null });
      }
    }
  }, {
    key: 'updateGroups',
    value: function updateGroups() {
      var _stopwatchAdapter;

      var groups = this.props.instance.groups,
          promise = (_stopwatchAdapter = stopwatchAdapter).get.apply(_stopwatchAdapter, [GROUPSTORE].concat(_toConsumableArray(groups))),
          self = this;
      promise.then(function (events) {
        var groups = events.map(function (event) {
          return event.target.result;
        });
        self.setState({ groups: groups });
      });
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
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
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(prevProps, prevState) {
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

        if (updateClocks) {
          this.updateClocks();
        }
      }

      if (this.props.instance.groups.length !== this.state.groups.length) {
        this.updateGroups();
      }
    }
  }, {
    key: 'componentWillUnmount',
    value: function componentWillUnmount() {
      if (this.state.requestAnimationFrameId) {
        cancelAnimationFrame(this.state.requestAnimationFrameId);
      }
    }
  }, {
    key: 'toggleLock',
    value: function toggleLock() {
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

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'onStart',
    value: function onStart() {
      this.props.instance.stopwatch.start();
      var startedAt = this.props.instance.stopwatch.metadata.startedAt,
          activity = {
        type: 'Start',
        description: '',
        timestamp: startedAt
      };
      this.props.instance.activity.unshift(activity);
      var requestAnimationFrameId = this.animateClock(),
          self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.setState({ requestAnimationFrameId: requestAnimationFrameId });
        self.props.updateInstances();
      });
    }
  }, {
    key: 'onStop',
    value: function onStop() {
      this.props.instance.stopwatch.stop();
      var stoppedAt = this.props.instance.stopwatch.metadata.stoppedAt,
          activity = {
        type: 'Stop',
        description: '',
        timestamp: stoppedAt
      };
      this.props.instance.activity.unshift(activity);
      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.setState({ requestAnimationFrameId: self.state.requestAnimationFrameId });
        self.props.updateInstances();
        self.updateClocks();
      });
    }
  }, {
    key: 'onResume',
    value: function onResume() {
      this.props.instance.stopwatch.resume();
      var resumedAt = this.props.instance.stopwatch.metadata.resumedAt,
          activity = {
        type: 'Resume',
        description: '',
        timestamp: resumedAt
      };
      this.props.instance.activity.unshift(activity);
      var requestAnimationFrameId = this.animateClock(),
          self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.setState({ requestAnimationFrameId: requestAnimationFrameId });
        self.props.updateInstances();
      });
    }
  }, {
    key: 'onReset',
    value: function onReset() {
      this.props.instance.stopwatch.reset();
      var resetAt = this.props.instance.stopwatch.metadata.resetAt,
          activity = {
        type: 'Reset',
        description: '',
        timestamp: new Date()
      };
      this.props.instance.activity.unshift(activity);

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.updateClocks();
        self.props.updateInstances();
      });
    }
  }, {
    key: 'onSplit',
    value: function onSplit() {
      var split = this.props.instance.stopwatch.addSplit(),
          splitCount = this.props.instance.stopwatch.splits.length,
          createdAt = split.metadata.createdAt,
          activity = {
        type: 'Split',
        description: '',
        timestamp: new Date()
      };
      split.name = 'Split #' + splitCount;
      this.props.instance.activity.unshift(activity);

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'onLap',
    value: function onLap() {
      var lap = this.props.instance.stopwatch.addLap();
      createdAt = lap.metadata.createdAt, activity = {
        type: 'Lap',
        description: 'Created lap at {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString()}',
        timestamp: createdAt
      };
      this.props.instance.activity.unshift(activity);

      var splits = this.props.instance.stopwatch.splits;
      var lapCount = 0;
      for (var i = 0; i < splits.length; i++) {
        var split = splits[i];
        if (split instanceof Lap) {
          lapCount++;
        }
      }
      lap.name = 'Lap #' + lapCount;
      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, this.props.instance).then(function (events) {
        self.props.updateInstances();
      });
    }
  }]);

  return Stopwatch;
}(React.Component);

var Display = function (_React$Component2) {
  _inherits(Display, _React$Component2);

  function Display(props) {
    _classCallCheck(this, Display);

    return _possibleConstructorReturn(this, (Display.__proto__ || Object.getPrototypeOf(Display)).call(this, props));
  }

  _createClass(Display, [{
    key: 'calculateDurationAttribute',
    value: function calculateDurationAttribute() {
      var durationValue = '';
      if (this.props.years) {
        durationValue += this.props.years + 'Y';
      }
      if (this.props.days) {
        durationValue += this.props.days + 'D';
      }
      if (this.props.hours) {
        durationValue += this.props.hours + 'H';
      }
      if (this.props.minutes) {
        durationValue += this.props.minutes + 'M';
      }
      var durationSeconds = this.props.seconds;
      if (this.props.milliseconds) {
        durationSeconds += '.' + this.props.milliseconds;
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
  }, {
    key: 'render',
    value: function render() {
      var durationValue = this.calculateDurationAttribute();

      var years = this.props.years;
      if (!years) {
        years = '00';
      } else if (years < 10) {
        years = '0' + years;
      } else if (years < 100) {
        years = '00' + years;
      }

      var yearsElement = React.createElement(
        'span',
        { className: 'years' },
        years
      ),
          days = this.props.days;
      if (!days) {
        days = '00';
        yearsElement = '';
      } else if (days < 10) {
        days = '0' + days;
      }

      var daysElement = React.createElement(
        'span',
        { className: 'days' },
        days
      ),
          hours = this.props.hours;
      if (!hours) {
        hours = '00';
        daysElement = '';
      } else if (hours < 10) {
        hours = '0' + hours;
      }

      var hoursElement = React.createElement(
        'span',
        { className: 'hours' },
        hours
      );
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
      return React.createElement(
        'time',
        { className: this.props.classname, dateTime: durationValue },
        yearsElement,
        daysElement,
        hoursElement,
        React.createElement(
          'span',
          { className: 'minutes' },
          minutes
        ),
        React.createElement(
          'span',
          { className: 'seconds' },
          seconds
        ),
        React.createElement(
          'span',
          { className: 'milliseconds' },
          milliseconds
        )
      );
    }
  }]);

  return Display;
}(React.Component);

Display.contextType = ThemeContext;

var StopwatchView = function (_React$Component3) {
  _inherits(StopwatchView, _React$Component3);

  function StopwatchView() {
    _classCallCheck(this, StopwatchView);

    return _possibleConstructorReturn(this, (StopwatchView.__proto__ || Object.getPrototypeOf(StopwatchView)).apply(this, arguments));
  }

  _createClass(StopwatchView, [{
    key: 'toggleGroupMembership',
    value: function toggleGroupMembership(instance, group) {
      var existingGroups = instance.groups,
          groupId = group.id,
          groupIndex = existingGroups.indexOf(groupId),
          activity = {
        type: 'Group Membership',
        timestamp: new Date()
      };
      if (groupIndex > -1) {
        activity.description = 'Removed from "' + group.name + '" group';
        existingGroups.splice(groupIndex, 1);
        group.members.splice(group.members.indexOf(instance.id), 1);
      } else {
        activity.description = 'Added to "' + group.name + '" group';
        existingGroups.push(groupId);
        group.members.push(instance.id);
      }
      instance.activity.push(activity);

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function () {
        self.props.updateInstances();
      });
      stopwatchAdapter.update(GROUPSTORE, group);
    }
  }, {
    key: 'edit',
    value: function edit(instance) {
      instance.edit = !instance.edit;
      if (!instance.edit) {
        stopwatchAdapter.update(STOPWATCHSTORE, instance);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'show',
    value: function show(instance) {
      var activity = {
        icon: 'fa-eye',
        type: 'Show',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.visible = true;

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function () {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'hide',
    value: function hide(instance) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Hide',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.visible = false;

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function () {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'toggleLock',
    value: function toggleLock(instance) {
      var newState = !instance.locked;
      if (newState) {
        this.lock(instance);
      } else {
        this.unlock(instance);
      }
    }
  }, {
    key: 'lock',
    value: function lock(instance) {
      var newVerb = 'Locked',
          activity = {
        icon: 'fa-lock',
        type: newVerb,
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.locked = true;

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'unlock',
    value: function unlock(instance) {
      var newVerb = 'Unlocked',
          activity = {
        icon: 'fa-lock',
        type: newVerb,
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.locked = false;

      var self = this;
      stopwatchAdapter.update(STOPWATCHSTORE, instance).then(function (events) {
        self.props.updateInstances();
      });
    }
  }]);

  return StopwatchView;
}(React.Component);

StopwatchView.contextType = ThemeContext;

var StopwatchListView = function (_StopwatchView) {
  _inherits(StopwatchListView, _StopwatchView);

  function StopwatchListView() {
    _classCallCheck(this, StopwatchListView);

    return _possibleConstructorReturn(this, (StopwatchListView.__proto__ || Object.getPrototypeOf(StopwatchListView)).apply(this, arguments));
  }

  _createClass(StopwatchListView, [{
    key: 'buildActions',
    value: function buildActions(instance) {
      var _this5 = this;

      var editElement = React.createElement(
        Dropdown.Item,
        { variant: 'outline-secondary', title: 'Edit', onClick: this.edit.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-edit fa-1x' }),
        ' Edit'
      ),
          hideElement = instance.visible ? React.createElement(
        Dropdown.Item,
        { variant: 'outline-secondary', title: 'Hide', onClick: this.hide.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-eye-slash fa-1x' }),
        ' Hide'
      ) : React.createElement(
        Dropdown.Item,
        { variant: 'outline-secondary', title: 'Show', onClick: this.show.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-eye fa-1x' }),
        ' Show'
      ),
          deleteElement = '',
          cloneElement = '';

      if (this.props.deleteInstance) {
        deleteElement = React.createElement(
          Dropdown.Item,
          { variant: 'danger', title: 'Delete', onClick: function onClick() {
              return _this5.props.deleteInstance(index);
            } },
          React.createElement('i', { className: 'fad fa-trash fa-1x' }),
          ' Delete'
        );
      }
      if (this.props.cloneInstance) {
        cloneElement = React.createElement(
          Dropdown.Item,
          { variant: 'outline-secondary', title: 'Clone', onClick: function onClick() {
              return _this5.props.cloneInstance(instance);
            } },
          React.createElement('i', { className: 'fad fa-clone fa-1x' }),
          ' Clone'
        );
      }
      if (instance.locked) {
        editElement = '';
        deleteElement = '';
        lockIcon = React.createElement(
          'span',
          null,
          React.createElement('i', { className: 'fad fa-unlock fa-1x' }),
          ' Unlock'
        );
      } else {
        lockIcon = React.createElement(
          'span',
          null,
          React.createElement('i', { className: 'fad fa-lock fa-1x' }),
          ' Lock'
        );
      }
      var lockElement = React.createElement(
        Dropdown.Item,
        { variant: 'outline-secondary', onClick: this.toggleLock.bind(this, instance) },
        lockIcon
      ),
          moreActionsIcon = React.createElement('i', { className: 'fad fa-ellipsis-v fa-1x' });
      return React.createElement(
        DropdownButton,
        { variant: 'outline-secondary', align: 'end', drop: 'up', title: moreActionsIcon },
        editElement,
        lockElement,
        cloneElement,
        hideElement,
        deleteElement
      );
    }
  }, {
    key: 'renderInstance',
    value: function renderInstance(instance) {
      var id = instance.id,
          actionsElement = this.buildActions(instance),
          selectInstance = this.props.selectInstance,
          onClickHandler = this.props.groupMode ? function () {
        selectInstance(instance);
      } : null,
          isSelected = this.props.selected && this.props.selected.indexOf(instance) > -1;
      element = React.createElement(
        StopwatchListItem,
        { id: id, onClick: onClickHandler, instance: instance, key: instance.id, updateInstances: this.props.updateInstances, selected: isSelected },
        actionsElement
      );
      return element;
    }
  }, {
    key: 'render',
    value: function render() {
      var stopwatchElements = [];
      for (var i = 0; i < this.props.instances.length; i++) {
        var instance = this.props.instances[i],
            element = this.renderInstance(instance);
        stopwatchElements.push(element);
      }
      className = this.props.groupMode ? 'list-item group-mode' : 'list-item';

      return React.createElement(
        Row,
        { className: className },
        stopwatchElements
      );
    }
  }]);

  return StopwatchListView;
}(StopwatchView);

StopwatchListView.contextType = ThemeContext;

var StopwatchListItem = function (_Stopwatch) {
  _inherits(StopwatchListItem, _Stopwatch);

  function StopwatchListItem() {
    _classCallCheck(this, StopwatchListItem);

    return _possibleConstructorReturn(this, (StopwatchListItem.__proto__ || Object.getPrototypeOf(StopwatchListItem)).apply(this, arguments));
  }

  _createClass(StopwatchListItem, [{
    key: 'buildControls',
    value: function buildControls() {
      var stopwatch = this.props.instance.stopwatch,
          isActive = stopwatch.isActive(),
          isRunning = stopwatch.isRunning();
      var startElement = '';
      if (!isActive) {
        startElement = React.createElement(
          Button,
          { variant: 'success', className: 'start', title: 'Start', onClick: this.onStart },
          React.createElement('i', { className: 'fad fa-play fa-1x' }),
          ' Start'
        );
      }
      var stopElement = '',
          splitElement = '',
          lapElement = '';
      if (isRunning) {
        stopElement = React.createElement(
          Button,
          { variant: 'danger', className: 'stop', title: 'Stop', onClick: this.onStop },
          React.createElement('i', { className: 'fad fa-stop fa-1x' }),
          ' Stop'
        );
        splitElement = React.createElement(
          Button,
          { variant: 'secondary', className: 'split', title: 'Split', onClick: this.onSplit },
          'Split'
        );
        if (stopwatch.lapDistance) {
          lapElement = React.createElement(
            Button,
            { variant: 'secondary', className: 'lap', title: 'Lap', onClick: this.onLap },
            'Lap (',
            stopwatch.lapDistance,
            stopwatch.lapUnit,
            ')'
          );
        }
      }

      var resetElement = '';
      resumeElement = '';
      if (isActive && !isRunning) {
        resetElement = React.createElement(
          Button,
          { variant: 'danger', className: 'reset', title: 'Reset', onClick: this.onReset },
          'Reset'
        );
        resumeElement = React.createElement(
          Button,
          { variant: 'success', className: 'resume', title: 'Resume', onClick: this.onResume },
          React.createElement('i', { className: 'fad fa-play fa-1x' }),
          ' Resume'
        );
      }

      return React.createElement(
        React.Fragment,
        null,
        startElement,
        stopElement,
        resumeElement,
        resetElement,
        splitElement,
        lapElement
      );
    }
  }, {
    key: 'render',
    value: function render() {
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
        lockIcon = React.createElement('i', { className: 'fad fa-lock fa-1x' });
      } else {
        lockIcon = React.createElement('i', { className: 'fad fa-unlock fa-1x' });
      }
      lockButton = React.createElement(
        Button,
        { onClick: this.props.lockToggleHandler },
        lockIcon
      );

      var lapDisplay = '';
      if (stopwatch.lapDistance) {
        lapDisplay = React.createElement(Display, { classname: 'display lap', years: lapClock.years, days: lapClock.days, hours: lapClock.hours, minutes: lapClock.minutes, seconds: lapClock.seconds, milliseconds: lapClock.milliseconds });
      }

      var controlsElement;
      if (!instance.locked) {
        controlsElement = this.buildControls();
      }

      return React.createElement(
        Item,
        { className: classnames, onClick: this.props.onClick, active: this.props.selected },
        React.createElement(
          'div',
          { className: 'front d-sm-flex justify-content-between' },
          React.createElement(
            'div',
            { className: 'd-flex justify-content-between align-items-center top-row' },
            React.createElement(
              'div',
              { className: 'name' },
              React.createElement(
                'div',
                null,
                instance.name
              ),
              React.createElement(
                InputGroup,
                { className: 'd-block d-sm-none mt-4' },
                controlsElement,
                this.props.children
              )
            ),
            React.createElement(
              'div',
              { className: 'times' },
              React.createElement(
                'strong',
                null,
                React.createElement(Display, { classname: 'display total', years: totalClock.years, days: totalClock.days, hours: totalClock.hours, minutes: totalClock.minutes, seconds: totalClock.seconds, milliseconds: totalClock.milliseconds })
              ),
              lapDisplay,
              React.createElement(Display, { classname: 'display split', years: splitClock.years, days: splitClock.days, hours: splitClock.hours, minutes: splitClock.minutes, seconds: splitClock.seconds, milliseconds: splitClock.milliseconds })
            )
          ),
          React.createElement(
            'div',
            { className: 'd-sm-flex align-items-center actions d-none' },
            React.createElement(
              InputGroup,
              null,
              controlsElement,
              this.props.children
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'back' },
          React.createElement(
            'div',
            { className: 'd-flex justify-content-between align-items-center' },
            React.createElement(
              'div',
              { className: 'me-1 ms-1' },
              React.createElement(
                InputGroup,
                { className: 'mb-1' },
                React.createElement(
                  InputGroup.Text,
                  { id: 'name-stopwatch' },
                  'Name'
                ),
                React.createElement(FormControl, {
                  placeholder: 'Name',
                  'aria-label': 'name stopwatch',
                  'aria-describedby': 'name-stopwatch',
                  value: this.props.instance.name,
                  onChange: this.handleNameChange.bind(this)
                })
              ),
              React.createElement(
                InputGroup,
                { className: 'mb-1' },
                React.createElement(
                  InputGroup.Text,
                  { id: 'description-stopwatch' },
                  'Description'
                ),
                React.createElement(FormControl, {
                  as: 'textarea',
                  placeholder: 'Search',
                  'aria-label': 'search stopwatch',
                  'aria-describedby': 'search-stopwatch',
                  value: this.props.instance.description,
                  onChange: this.handleDescriptionChange.bind(this)
                })
              )
            ),
            React.createElement(
              'div',
              { className: 'me-1' },
              React.createElement(
                'div',
                { className: 'mb-1 text-align-right' },
                React.createElement(
                  ButtonGroup,
                  null,
                  React.createElement(
                    Button,
                    { variant: 'outline-secondary', onClick: this.stopEditing.bind(this) },
                    React.createElement('i', { className: 'fad fa-times' })
                  )
                )
              ),
              React.createElement(
                InputGroup,
                { className: 'mb-1' },
                React.createElement(
                  InputGroup.Text,
                  { id: 'lap-distance-stopwatch' },
                  'Lap Distance'
                ),
                React.createElement(FormControl, {
                  type: 'tel',
                  placeholder: 'Lap Distance',
                  'aria-label': 'lap-distance',
                  'aria-describedby': 'lap-distance-stopwatch',
                  value: this.props.instance.stopwatch.lapDistance,
                  onChange: this.handleLapDistanceChange.bind(this)
                })
              ),
              React.createElement(
                InputGroup,
                { className: 'mb-1' },
                React.createElement(
                  InputGroup.Text,
                  { id: 'lap-distance-unit-stopwatch' },
                  'Lap Units'
                ),
                React.createElement(FormControl, {
                  placeholder: 'Lap Distance Unit',
                  'aria-label': 'lap-distance',
                  'aria-describedby': 'lap-distance-stopwatch',
                  value: this.props.instance.stopwatch.lapUnit,
                  onChange: this.handleLapDistanceUnitChange.bind(this)
                })
              )
            )
          )
        )
      );
    }
  }]);

  return StopwatchListItem;
}(Stopwatch);

StopwatchListItem.contextType = ThemeContext;

var StopwatchGridView = function (_StopwatchView2) {
  _inherits(StopwatchGridView, _StopwatchView2);

  function StopwatchGridView() {
    _classCallCheck(this, StopwatchGridView);

    return _possibleConstructorReturn(this, (StopwatchGridView.__proto__ || Object.getPrototypeOf(StopwatchGridView)).apply(this, arguments));
  }

  _createClass(StopwatchGridView, [{
    key: 'buildStopwatchControls',
    value: function buildStopwatchControls(instance) {
      var _this8 = this;

      var lockIcon = React.createElement('i', { className: 'fad fa-lock-open fa-1x' }),
          editElement = React.createElement(
        Button,
        { variant: 'outline-secondary', title: 'Edit', onClick: this.edit.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-edit fa-1x' })
      ),
          hideElement = instance.visible ? React.createElement(
        Dropdown.Item,
        { variant: 'outline-secondary', title: 'Hide', onClick: this.hide.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-eye-slash fa-1x' }),
        ' Hide'
      ) : React.createElement(
        Dropdown.Item,
        { variant: 'outline-secondary', title: 'Show', onClick: this.show.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-eye fa-1x' }),
        ' Show'
      ),
          cloneElement,
          deleteElement;

      if (this.props.cloneInstance) {
        cloneElement = React.createElement(
          Button,
          { variant: 'outline-secondary', title: 'Clone', onClick: function onClick() {
              return _this8.props.cloneInstance(instance);
            } },
          React.createElement('i', { className: 'fad fa-clone fa-1x' })
        );
      }
      if (this.props.deleteInstance) {
        deleteElement = React.createElement(
          Dropdown.Item,
          { variant: 'danger', title: 'Delete', onClick: function onClick() {
              return _this8.props.deleteInstance(instance);
            } },
          React.createElement('i', { className: 'fad fa-trash fa-1x' }),
          ' Delete'
        );
      }

      if (instance.locked) {
        editElement = '';
        deleteElement = '';
      } else {
        lockIcon = React.createElement('i', { className: 'fad fa-lock fa-1x' });
      }
      var lockElement = React.createElement(
        Button,
        { variant: 'outline-secondary', title: 'Lock', onClick: this.toggleLock.bind(this, instance) },
        lockIcon
      );

      var toggleGroupElement = '';
      if (this.props.groups.length) {
        var toggleGroupElements = [];
        for (var i = 0; i < this.props.groups.length; i++) {
          var group = this.props.groups[i],
              name = group.name,
              isMember = instance.groups.indexOf(name) > -1,
              toggleElement;
          if (isMember) {
            toggleElement = React.createElement(
              Dropdown.Item,
              { key: name, active: true, onClick: this.toggleGroupMembership.bind(this, instance, group) },
              React.createElement('i', { className: 'fad fa-check fa-1x' }),
              ' ',
              name
            );
          } else {
            toggleElement = React.createElement(
              Dropdown.Item,
              { key: name, onClick: this.toggleGroupMembership.bind(this, instance, group) },
              name
            );
          }
          toggleGroupElements.push(toggleElement);
        }
        var addGroupTitle = React.createElement('i', { className: 'fad fa-object-group fa-1x' });
        toggleGroupElement = React.createElement(
          DropdownButton,
          { variant: 'outline-secondary', title: addGroupTitle },
          toggleGroupElements
        );
      }
      var moreActionsIcon = React.createElement('i', { className: 'fad fa-ellipsis-v fa-1x' });
      return React.createElement(
        Row,
        null,
        React.createElement(
          Col,
          { className: 'text-align-left' },
          React.createElement(
            ButtonGroup,
            null,
            toggleGroupElement,
            lockElement,
            cloneElement
          )
        ),
        React.createElement(
          Col,
          { className: 'text-align-right' },
          React.createElement(
            ButtonGroup,
            null,
            editElement,
            React.createElement(
              DropdownButton,
              { variant: 'outline-secondary', align: 'end', title: moreActionsIcon },
              hideElement,
              deleteElement
            )
          )
        )
      );
    }
  }, {
    key: 'renderStopwatch',
    value: function renderStopwatch(instance) {
      var stopwatchActions = this.buildStopwatchControls(instance),
          selectInstance = this.props.selectInstance,
          onClickHandler = this.props.groupMode ? function () {
        selectInstance(instance);
      } : null,
          isSelected = this.props.selected && this.props.selected.indexOf(instance) > -1;
      return React.createElement(
        Col,
        { className: 'mb-3', xs: 12, sm: 6, md: 4, lg: 3, key: instance.id, onClick: onClickHandler },
        React.createElement(
          StopwatchGridItem,
          { id: instance.id, instance: instance, updateInstances: this.props.updateInstances, selected: isSelected },
          stopwatchActions
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var stopwatchElements = [];
      for (var i = 0; i < this.props.instances.length; i++) {
        var instance = this.props.instances[i],
            element = this.renderStopwatch(instance);
        stopwatchElements.push(element);
      }
      className = this.props.groupMode ? 'grid group-mode' : 'grid';
      return React.createElement(
        Row,
        { className: className },
        stopwatchElements
      );
    }
  }]);

  return StopwatchGridView;
}(StopwatchView);

StopwatchGridView.contextType = ThemeContext;

var StopwatchGridItem = function (_Stopwatch2) {
  _inherits(StopwatchGridItem, _Stopwatch2);

  function StopwatchGridItem() {
    _classCallCheck(this, StopwatchGridItem);

    return _possibleConstructorReturn(this, (StopwatchGridItem.__proto__ || Object.getPrototypeOf(StopwatchGridItem)).apply(this, arguments));
  }

  _createClass(StopwatchGridItem, [{
    key: 'buildControls',
    value: function buildControls() {
      var stopwatch = this.props.instance.stopwatch,
          isActive = stopwatch.isActive(),
          isRunning = stopwatch.isRunning();
      var startElement = '';
      if (!isActive) {
        startElement = React.createElement(
          Button,
          { variant: 'success', className: 'start', title: 'Start', onClick: this.onStart },
          React.createElement('i', { className: 'fad fa-play fa-1x' }),
          ' Start'
        );
      }
      var stopElement = '',
          splitElement = '',
          lapElement = '';
      if (isRunning) {
        stopElement = React.createElement(
          Button,
          { variant: 'danger', className: 'stop', title: 'Stop', onClick: this.onStop },
          React.createElement('i', { className: 'fad fa-stop fa-1x' }),
          ' Stop'
        );
        splitElement = React.createElement(
          Button,
          { variant: 'secondary', className: 'split', title: 'Split', onClick: this.onSplit },
          'Split'
        );
        if (stopwatch.lapDistance) {
          lapElement = React.createElement(
            Button,
            { variant: 'secondary', className: 'lap', title: 'Lap', onClick: this.onLap },
            'Lap (',
            stopwatch.lapDistance,
            stopwatch.lapUnit,
            ')'
          );
        }
      }

      var resetElement = '';
      resumeElement = '';
      if (isActive && !isRunning) {
        resetElement = React.createElement(
          Button,
          { variant: 'danger', className: 'reset', title: 'Reset', onClick: this.onReset },
          'Reset'
        );
        resumeElement = React.createElement(
          Button,
          { variant: 'success', className: 'resume', title: 'Resume', onClick: this.onResume },
          React.createElement('i', { className: 'fad fa-play fa-1x' }),
          ' Resume'
        );
      }

      return React.createElement(
        ButtonGroup,
        { 'aria-label': 'Basic example' },
        startElement,
        stopElement,
        resumeElement,
        resetElement,
        splitElement,
        lapElement
      );
    }
  }, {
    key: 'renderSplits',
    value: function renderSplits() {
      var stopwatch = this.props.instance.stopwatch;
      var output = React.createElement(
        'p',
        null,
        'No splits recorded yet.'
      );
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
            element = React.createElement(
              'tr',
              { key: i },
              React.createElement(
                'td',
                null,
                split.name
              ),
              React.createElement(
                'td',
                null,
                totalLapDistance,
                lapUnits
              ),
              React.createElement(
                'td',
                null,
                currentLapDistance,
                lapUnits
              ),
              React.createElement(
                'td',
                null,
                React.createElement(Display, { years: splitBreakdown.years, days: splitBreakdown.days, hours: splitBreakdown.hours, minutes: splitBreakdown.minutes, seconds: splitBreakdown.seconds, milliseconds: splitBreakdown.milliseconds })
              )
            );
          } else {
            if (hasLaps) {
              element = React.createElement(
                'tr',
                { key: i },
                React.createElement(
                  'td',
                  null,
                  split.name
                ),
                React.createElement('td', null),
                React.createElement('td', null),
                React.createElement(
                  'td',
                  null,
                  React.createElement(Display, { years: splitBreakdown.years, days: splitBreakdown.days, hours: splitBreakdown.hours, minutes: splitBreakdown.minutes, seconds: splitBreakdown.seconds, milliseconds: splitBreakdown.milliseconds })
                )
              );
            } else {
              element = React.createElement(
                'tr',
                { key: i },
                React.createElement(
                  'td',
                  null,
                  split.name
                ),
                React.createElement(
                  'td',
                  null,
                  React.createElement(Display, { years: splitBreakdown.years, days: splitBreakdown.days, hours: splitBreakdown.hours, minutes: splitBreakdown.minutes, seconds: splitBreakdown.seconds, milliseconds: splitBreakdown.milliseconds })
                )
              );
            }
          }
          splitElements.push(element);
        }
        if (hasLaps) {
          output = React.createElement(
            Table,
            null,
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                null,
                React.createElement(
                  'th',
                  null,
                  'Name'
                ),
                React.createElement(
                  'th',
                  null,
                  'Total Distance'
                ),
                React.createElement(
                  'th',
                  null,
                  'Lap Distance'
                ),
                React.createElement(
                  'th',
                  null,
                  'Value'
                )
              )
            ),
            React.createElement(
              'tbody',
              null,
              splitElements
            )
          );
        } else {
          output = React.createElement(
            Table,
            null,
            React.createElement(
              'thead',
              null,
              React.createElement(
                'tr',
                null,
                React.createElement(
                  'th',
                  null,
                  'Name'
                ),
                React.createElement(
                  'th',
                  null,
                  'Value'
                )
              )
            ),
            React.createElement(
              'tbody',
              null,
              splitElements
            )
          );
        }
      }
      return output;
    }
  }, {
    key: 'render',
    value: function render() {
      var instance = this.props.instance,
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
          lockElement = React.createElement(
        Button,
        { variant: 'outline-secondary', title: 'Unlock', onClick: this.toggleLock },
        React.createElement('i', { className: 'fad fa-lock-open fa-1x' })
      );
      if (!instance.locked) {
        controlsElement = this.buildControls();
        lockElement = React.createElement(
          Button,
          { variant: 'outline-secondary', title: 'Lock', onClick: this.toggleLock },
          React.createElement('i', { className: 'fad fa-lock fa-1x' })
        );
      }

      var lapDisplay = '';
      if (stopwatch.lapDistance) {
        lapDisplay = React.createElement(Display, { classname: 'display lap', years: lapClock.years, days: lapClock.days, hours: lapClock.hours, minutes: lapClock.minutes, seconds: lapClock.seconds, milliseconds: lapClock.milliseconds });
      }

      var splitElement = this.renderSplits(),
          activityListElement = React.createElement(ActivityContainerView, { instances: this.props.instance.activity }),
          description = instance.description,
          metadata = stopwatch.metadata,
          createdAt = metadata.createdAt,
          lastModified = metadata.lastModified;

      var lastModifiedElement = '';
      if (lastModified) {
        lastModifiedElement = React.createElement(
          'p',
          null,
          React.createElement(
            'b',
            null,
            'Last Modified At'
          ),
          ': ',
          lastModified.toLocaleDateString(),
          ' ',
          lastModified.toLocaleTimeString()
        );
      }

      var descriptionElement = '';
      if (description) {
        descriptionElement = React.createElement(
          'p',
          null,
          React.createElement('i', { className: 'fad fa-comment-alt' }),
          ' ',
          description
        );
      }

      var groupElements = [];
      for (var i = 0; i < this.state.groups.length; i++) {
        var group = this.state.groups[i],
            element = React.createElement(
          Badge,
          { pill: true, bg: 'primary', key: group.id },
          group.name
        );
        groupElements.push(element);
      }
      var groupElement = React.createElement(
        'p',
        null,
        groupElements
      );

      return React.createElement(
        'div',
        { className: classnames },
        React.createElement(
          'div',
          { className: 'front' },
          React.createElement(
            Container,
            null,
            React.createElement(
              Row,
              null,
              React.createElement(
                Col,
                null,
                this.props.children,
                React.createElement(
                  'h2',
                  null,
                  name
                ),
                groupElement,
                React.createElement(Display, { classname: 'display total', years: totalClock.years, days: totalClock.days, hours: totalClock.hours, minutes: totalClock.minutes, seconds: totalClock.seconds, milliseconds: totalClock.milliseconds }),
                lapDisplay,
                React.createElement(Display, { classname: 'display split', years: splitClock.years, days: splitClock.days, hours: splitClock.hours, minutes: splitClock.minutes, seconds: splitClock.seconds, milliseconds: splitClock.milliseconds }),
                controlsElement,
                React.createElement(
                  Tabs,
                  { defaultActiveKey: 'split', id: 'uncontrolled-tab-example', className: 'mb-3' },
                  React.createElement(
                    Tab,
                    { eventKey: 'split', title: 'Splits' },
                    splitElement
                  ),
                  React.createElement(
                    Tab,
                    { eventKey: 'metadata', title: 'Metadata' },
                    descriptionElement,
                    React.createElement(
                      'p',
                      null,
                      React.createElement(
                        'b',
                        null,
                        'Created At'
                      ),
                      ': ',
                      createdAt.toLocaleDateString(),
                      ' ',
                      createdAt.toLocaleTimeString()
                    ),
                    lastModifiedElement
                  ),
                  React.createElement(
                    Tab,
                    { eventKey: 'activity', title: 'Activity' },
                    activityListElement
                  )
                )
              )
            )
          )
        ),
        React.createElement(
          'div',
          { className: 'back' },
          React.createElement(
            Container,
            null,
            React.createElement(
              Row,
              null,
              React.createElement(
                Col,
                null,
                React.createElement(
                  'div',
                  { className: 'text-align-right' },
                  React.createElement(
                    ButtonGroup,
                    null,
                    React.createElement(
                      Button,
                      { variant: 'outline-secondary', onClick: this.stopEditing.bind(this) },
                      React.createElement('i', { className: 'fad fa-times' })
                    )
                  )
                ),
                React.createElement(
                  InputGroup,
                  { className: 'mb-3' },
                  React.createElement(
                    InputGroup.Text,
                    { id: 'name-stopwatch' },
                    'Name'
                  ),
                  React.createElement(FormControl, {
                    placeholder: 'Name',
                    'aria-label': 'name stopwatch',
                    'aria-describedby': 'name-stopwatch',
                    value: this.props.instance.name,
                    onChange: this.handleNameChange.bind(this)
                  })
                ),
                React.createElement(
                  InputGroup,
                  { className: 'mb-3' },
                  React.createElement(
                    InputGroup.Text,
                    { id: 'description-stopwatch' },
                    'Description'
                  ),
                  React.createElement(FormControl, {
                    as: 'textarea',
                    placeholder: 'Search',
                    'aria-label': 'search stopwatch',
                    'aria-describedby': 'search-stopwatch',
                    value: this.props.instance.description,
                    onChange: this.handleDescriptionChange.bind(this)
                  })
                ),
                React.createElement(
                  InputGroup,
                  { className: 'mb-3' },
                  React.createElement(
                    InputGroup.Text,
                    { id: 'lap-distance-stopwatch' },
                    'Lap Distance'
                  ),
                  React.createElement(FormControl, {
                    type: 'tel',
                    placeholder: 'Lap Distance',
                    'aria-label': 'lap-distance',
                    'aria-describedby': 'lap-distance-stopwatch',
                    value: this.props.instance.stopwatch.lapDistance,
                    onChange: this.handleLapDistanceChange.bind(this)
                  })
                ),
                React.createElement(
                  InputGroup,
                  { className: 'mb-3' },
                  React.createElement(
                    InputGroup.Text,
                    { id: 'lap-distance-unit-stopwatch' },
                    'Lap Units'
                  ),
                  React.createElement(FormControl, {
                    placeholder: 'Lap Distance Unit',
                    'aria-label': 'lap-distance',
                    'aria-describedby': 'lap-distance-stopwatch',
                    value: this.props.instance.stopwatch.lapUnit,
                    onChange: this.handleLapDistanceUnitChange.bind(this)
                  })
                )
              )
            )
          )
        )
      );
    }
  }]);

  return StopwatchGridItem;
}(Stopwatch);

StopwatchGridItem.contextType = ThemeContext;