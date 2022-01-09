var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function stopwatchFromObject(obj) {
  obj.stopwatch.metadata.createdAt = new Date(obj.stopwatch.metadata.createdAt);
  obj.stopwatch.metadata.lastModified = new Date(obj.stopwatch.metadata.lastModified);
  obj.stopwatch.metadata.startedAt = obj.stopwatch.metadata.startedAt;
  obj.stopwatch.metadata.stoppedAt = obj.stopwatch.metadata.stoppedAt;

  for (var i = 0; i < obj.stopwatch.splits.length; i++) {

    if (obj.stopwatch.splits[i].distance && obj.stopwatch.splits[i].distanceUnit) {
      Object.setPrototypeOf(obj.stopwatch.splits[i], Lap.prototype);
    } else {
      Object.setPrototypeOf(obj.stopwatch.splits[i], Split.prototype);
    }
    obj.stopwatch.splits[i].metadata.createdAt = new Date(obj.stopwatch.splits[i].metadata.createdAt);
    obj.stopwatch.splits[i].metadata.lastModified = new Date(obj.stopwatch.splits[i].metadata.lastModified);
  }

  for (var i = 0; i < obj.activity.length; i++) {
    var activity = obj.activity[i];
    activity.timestamp = new Date(activity.timestamp);
  }

  obj.stopwatch = Object.setPrototypeOf(obj.stopwatch, LapStopwatch.prototype);
  return obj;
}

var StopwatchContainerView = function (_BaseContainerView) {
  _inherits(StopwatchContainerView, _BaseContainerView);

  function StopwatchContainerView(props) {
    _classCallCheck(this, StopwatchContainerView);

    var _this = _possibleConstructorReturn(this, (StopwatchContainerView.__proto__ || Object.getPrototypeOf(StopwatchContainerView)).call(this, props));

    _this.state.search.hidden = false;
    _this.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      durational: null
    };
    _this.state.group = {
      mode: false,
      selected: []
    };
    _this.sortChronologicalAsc = _this.sortChronologicalAsc.bind(_this);
    _this.sortChronologicalDesc = _this.sortChronologicalDesc.bind(_this);
    _this.sortDurationalAsc = _this.sortDurationalAsc.bind(_this);
    _this.sortDurationalDesc = _this.sortDurationalDesc.bind(_this);
    return _this;
  }

  _createClass(StopwatchContainerView, [{
    key: 'toggleGroupMode',
    value: function toggleGroupMode() {
      var group = this.state.group,
          isActive = group.mode;
      if (isActive) {
        group.selected = [];
        group.mode = false;
      } else {
        group.mode = true;
      }
      this.setState({ group: group });
    }
  }, {
    key: 'refreshGroupState',
    value: function refreshGroupState() {
      this.setState({ group: this.state.group });
    }
  }, {
    key: 'selectAll',
    value: function selectAll() {
      this.state.group.selected = this.props.instances.filter(this.isMatch.bind(this));
      this.setState({ group: this.state.group });
    }
  }, {
    key: 'deselectAll',
    value: function deselectAll() {
      this.state.group.selected = [];
      this.setState({ group: this.state.group });
    }
  }, {
    key: 'toggleSelect',
    value: function toggleSelect(instance) {
      var group = this.state.group,
          index = group.selected.indexOf(instance),
          isSelected = index > -1;
      if (isSelected) {
        group.selected.splice(index, 1);
      } else {
        group.selected.push(instance);
      }
      this.setState({ group: group });
    }
  }, {
    key: 'deleteSelected',
    value: function deleteSelected() {
      while (this.state.group.selected.length > 0) {
        var instance = this.state.group.selected.shift();
        this.props.deleteInstance(instance);
      }
      if (this.props.instances.length < 2) {
        this.toggleGroupMode();
      }
      this.props.updateInstances();
    }
  }, {
    key: 'lockSelected',
    value: function lockSelected() {
      var _stopwatchAdapter;

      var group = this.state.group;
      for (var i = 0; i < group.selected.length; i++) {
        var instance = group.selected[i];
        this.lock(instance);
      }

      var self = this;
      (_stopwatchAdapter = stopwatchAdapter).update.apply(_stopwatchAdapter, [STOPWATCHSTORE].concat(_toConsumableArray(group.selected))).then(function () {
        if (self.state.search.lock.unlocked) {
          group.selected = [];
          self.setState({ group: group });
        }
        self.props.updateInstances();
      });
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
    }
  }, {
    key: 'unlockSelected',
    value: function unlockSelected() {
      var _stopwatchAdapter2;

      var group = this.state.group;
      for (var i = 0; i < group.selected.length; i++) {
        var instance = group.selected[i];
        this.unlock(instance);
      }

      var self = this;
      (_stopwatchAdapter2 = stopwatchAdapter).update.apply(_stopwatchAdapter2, [STOPWATCHSTORE].concat(_toConsumableArray(group.selected))).then(function () {
        if (self.state.search.lock.locked) {
          group.selected = [];
          self.setState({ group: group });
        }
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
    }
  }, {
    key: 'hideSelected',
    value: function hideSelected() {
      var _stopwatchAdapter3;

      var group = this.state.group;
      for (var i = 0; i < group.selected.length; i++) {
        var instance = group.selected[i];
        this.hide(instance);
      }

      var self = this;
      (_stopwatchAdapter3 = stopwatchAdapter).update.apply(_stopwatchAdapter3, [STOPWATCHSTORE].concat(_toConsumableArray(group.selected))).then(function () {
        if (!self.state.search.hidden) {
          group.selected = [];
          self.setState({ group: group });
        }
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
    }
  }, {
    key: 'showSelected',
    value: function showSelected() {
      var _stopwatchAdapter4;

      var group = this.state.group;
      for (var i = 0; i < group.selected.length; i++) {
        var instance = group.selected[i];
        this.show(instance);
      }

      var self = this;
      (_stopwatchAdapter4 = stopwatchAdapter).update.apply(_stopwatchAdapter4, [STOPWATCHSTORE].concat(_toConsumableArray(group.selected))).then(function () {
        if (self.state.search.hidden) {
          group.selected = [];
          self.setState({ group: group });
        }
        self.props.updateInstances();
      });
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
    }
  }, {
    key: 'cloneSelected',
    value: function cloneSelected() {
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i],
            cloneFn = this.props.cloneInstance || this.cloneStopwatchInstance.bind(this);
        cloneFn(instance);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'cloneStopwatchInstance',
    value: function cloneStopwatchInstance(instance) {
      var now = new Date(),
          newItem = JSON.parse(JSON.stringify(instance)),
          newBaseName = newPotentialName = newName = instance.name + ' Copy',
          version = 0;

      newItem = stopwatchFromObject(newItem);
      newItem.stopwatch.metadata.createdAt = new Date();
      newItem.stopwatch.metadata.lastModified = null;

      // find new name for stopwatch
      while (true) {
        var isMatch = true;
        for (var i = 0; i < this.props.instances.length; i++) {
          var itemCheck = this.props.instances[i];
          if (itemCheck.name === newPotentialName) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          newName = newPotentialName;
          break;
        } else {
          version++;
          newPotentialName = newBaseName + ' ' + version;
        }
      }

      newItem.name = newName;

      var activity = {
        type: 'Cloned',
        description: '',
        timestamp: new Date()
      };
      newItem.activity.unshift(activity);
      delete newItem.id;
      var self = this;
      stopwatchAdapter.add(STOPWATCHSTORE, newItem).then(function (events) {
        var _stopwatchAdapter5;

        var newId = events[0].target.result;
        newItem.id = newId;

        // assign groups
        var updatedGroups = [];
        for (var i = 0; i < newItem.groups.length; i++) {
          var groupId = newItem.groups[i];
          for (var j = 0; j < self.props.groups.length; j++) {
            var potentialGroup = self.props.groups[j];
            if (potentialGroup.id == groupId) {
              potentialGroup.members.push(newItem.id);
              updatedGroups.push(potentialGroup);
              break;
            }
          }
        }
        self.props.instances.push(newItem);
        (_stopwatchAdapter5 = stopwatchAdapter).update.apply(_stopwatchAdapter5, [GROUPSTORE].concat(updatedGroups)).then(function () {
          self.props.updateInstances();
        });
      });
    }
  }, {
    key: 'start',
    value: function start(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Start',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.start(timestamp);
    }
  }, {
    key: 'startSelected',
    value: function startSelected() {
      var _stopwatchAdapter6;

      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.start(instance, now);
      }

      var self = this;
      (_stopwatchAdapter6 = stopwatchAdapter).update.apply(_stopwatchAdapter6, [STOPWATCHSTORE].concat(_toConsumableArray(this.state.group.selected))).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'stop',
    value: function stop(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Stop',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.stop(timestamp);
    }
  }, {
    key: 'stopSelected',
    value: function stopSelected() {
      var _stopwatchAdapter7;

      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.stop(instance, now);
      }

      var self = this;
      (_stopwatchAdapter7 = stopwatchAdapter).update.apply(_stopwatchAdapter7, [STOPWATCHSTORE].concat(_toConsumableArray(this.state.group.selected))).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'resume',
    value: function resume(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Resume',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.resume(timestamp);
    }
  }, {
    key: 'resumeSelected',
    value: function resumeSelected() {
      var _stopwatchAdapter8;

      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.resume(instance, now);
      }

      var self = this;
      (_stopwatchAdapter8 = stopwatchAdapter).update.apply(_stopwatchAdapter8, [STOPWATCHSTORE].concat(_toConsumableArray(this.state.group.selected))).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'split',
    value: function split(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Split',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.addSplit(timestamp);
    }
  }, {
    key: 'splitSelected',
    value: function splitSelected() {
      var _stopwatchAdapter9;

      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.split(instance, now);
      }

      var self = this;
      (_stopwatchAdapter9 = stopwatchAdapter).update.apply(_stopwatchAdapter9, [STOPWATCHSTORE].concat(_toConsumableArray(this.state.group.selected))).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'lap',
    value: function lap(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Lap',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.addLap(timestamp);
    }
  }, {
    key: 'lapSelected',
    value: function lapSelected() {
      var _stopwatchAdapter10;

      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.lap(instance, now);
      }

      var self = this;
      (_stopwatchAdapter10 = stopwatchAdapter).update.apply(_stopwatchAdapter10, [STOPWATCHSTORE].concat(_toConsumableArray(this.state.group.selected))).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'reset',
    value: function reset(instance) {
      var activity = {
        icon: 'fa-eye-slash',
        type: 'Reset',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.reset();
    }
  }, {
    key: 'resetSelected',
    value: function resetSelected() {
      var _stopwatchAdapter11;

      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.reset(instance, now);
      }

      var self = this;
      (_stopwatchAdapter11 = stopwatchAdapter).update.apply(_stopwatchAdapter11, [STOPWATCHSTORE].concat(_toConsumableArray(this.state.group.selected))).then(function (events) {
        self.props.updateInstances();
      });
    }
  }, {
    key: 'toggleHiddenFilter',
    value: function toggleHiddenFilter() {
      var search = this.state.search;
      search.hidden = !search.hidden;
      this.setState({ search: search });
    }
  }, {
    key: 'isMatch',
    value: function isMatch(instance) {
      var isMatch = _get(StopwatchContainerView.prototype.__proto__ || Object.getPrototypeOf(StopwatchContainerView.prototype), 'isMatch', this).call(this, instance);
      search = this.state.search, lock = search.lock, hasLockPreference = lock.locked ^ lock.unlocked, lockMatch = lock.locked && instance.locked, unlockMatch = lock.unlocked && !instance.locked, hiddenMatch = search.hidden === !instance.visible, isLockMatch = !hasLockPreference || lockMatch || unlockMatch;
      return isMatch && isLockMatch && hiddenMatch;
    }
  }, {
    key: 'setSortAlphabeticalAsc',
    value: function setSortAlphabeticalAsc() {
      var sort = {
        alphabetical: {
          ascending: true
        },
        chronological: null,
        durational: null
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'setSortAlphabeticalDesc',
    value: function setSortAlphabeticalDesc() {
      var sort = {
        alphabetical: {
          ascending: false
        },
        chronological: null,
        durational: null
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'sortChronologicalAsc',
    value: function sortChronologicalAsc(instances) {
      instances.sort(function (a, b) {
        var aVal = a.stopwatch.metadata.createdAt,
            bVal = b.stopwatch.metadata.createdAt;
        if (aVal < bVal) {
          return -1;
        }
        if (aVal > bVal) {
          return 1;
        }
        return 0;
      });
    }
  }, {
    key: 'sortChronologicalDesc',
    value: function sortChronologicalDesc(instances) {
      this.sortChronologicalAsc(instances);
      instances.reverse();
    }
  }, {
    key: 'setSortDurationalAsc',
    value: function setSortDurationalAsc() {
      var sort = {
        alphabetical: null,
        chronological: null,
        durational: {
          ascending: true
        }
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'setSortDurationalDesc',
    value: function setSortDurationalDesc() {
      var sort = {
        alphabetical: null,
        chronological: null,
        durational: {
          ascending: false
        }
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'sortDurationalAsc',
    value: function sortDurationalAsc(instances) {
      instances.sort(function (a, b) {
        var aVal = a.stopwatch.totalDuration(),
            bVal = b.stopwatch.totalDuration();
        return aVal - bVal;
      });
    }
  }, {
    key: 'sortDurationalDesc',
    value: function sortDurationalDesc(instances) {
      this.sortDurationalAsc(instances);
      instances.reverse();
    }
  }, {
    key: 'renderSortControls',
    value: function renderSortControls() {
      var sort = this.state.sort,
          alphabetical = sort.alphabetical,
          chronological = sort.chronological,
          durational = sort.durational;

      var alphabeticalVariant = 'outline-secondary',
          alphabeticalIcon = 'fad fa-sort-alpha-up fa-1x',
          alphabeticalHandler = this.setSortAlphabeticalAsc;
      if (alphabetical) {
        alphabeticalVariant = 'primary';
        if (alphabetical.ascending) {
          alphabeticalIcon = 'fad fa-sort-alpha-down fa-1x';
          alphabeticalHandler = this.setSortAlphabeticalDesc;
        }
      }

      var chronologicalVariant = 'outline-secondary',
          chronologicalIcon = 'fad fa-sort-numeric-up fa-1x',
          chronologicalHandler = this.setSortChronologicalAsc;
      if (chronological) {
        chronologicalVariant = 'primary';
        if (chronological.ascending) {
          chronologicalIcon = 'fad fa-sort-numeric-down fa-1x';
          chronologicalHandler = this.setSortChronologicalDesc;
        }
      }

      var durationalVariant = 'outline-secondary',
          durationalIcon = 'fad fa-sort-size-up-alt fa-1x',
          durationalHandler = this.setSortDurationalAsc;
      if (durational) {
        durationalVariant = 'primary';
        if (durational.ascending) {
          durationalIcon = 'fad fa-sort-size-down-alt fa-1x';
          durationalHandler = this.setSortDurationalDesc;
        }
      }

      var alphabeticalButton = React.createElement(
        Button,
        { variant: alphabeticalVariant, onClick: alphabeticalHandler.bind(this), title: 'Alphabetical' },
        React.createElement('i', { className: alphabeticalIcon })
      ),
          chronologicalButton = React.createElement(
        Button,
        { variant: chronologicalVariant, onClick: chronologicalHandler.bind(this), title: 'Chronological' },
        React.createElement('i', { className: chronologicalIcon })
      ),
          durationalButton = React.createElement(
        Button,
        { variant: durationalVariant, onClick: durationalHandler.bind(this), title: 'Durational' },
        React.createElement('i', { className: durationalIcon })
      );
      sortButtonGroup = React.createElement(
        ButtonGroup,
        null,
        chronologicalButton,
        alphabeticalButton,
        durationalButton
      );
      return sortButtonGroup;
    }
  }, {
    key: 'createNew',
    value: function createNew() {
      var stopwatch = new LapStopwatch(),
          stopwatchCount = this.props.instances.length;

      var stopwatchNumber = stopwatchCount,
          nameExists = true,
          name;
      while (nameExists) {
        stopwatchNumber++;
        name = 'Stopwatch #' + stopwatchNumber;
        nameExists = false;
        for (var i = 0; i < this.props.instances.length; i++) {
          var instance = this.props.instances[i];
          if (instance.name === name) {
            nameExists = true;
            break;
          }
        }

        if (!nameExists) {
          break;
        }
      }

      var activity = {
        type: 'Created',
        description: '',
        timestamp: stopwatch.metadata.createdAt
      },
          item = { name: name, stopwatch: stopwatch, locked: false, visible: true, selected: false, activity: [activity], groups: [] },
          self = this;

      stopwatchAdapter.add(STOPWATCHSTORE, item).then(function (events) {
        item.id = events[0].target.result;
        self.props.instances.push(item);
        self.props.updateInstances();
        self.setState({ instances: self.props.instances, newName: '' });
      });
    }
  }, {
    key: 'renderRunningControls',
    value: function renderRunningControls() {
      var renderStart = renderStop = renderResumeReset = renderSplit = renderLap = true;

      var instances = this.state.group.selected;
      for (var i = 0; i < instances.length; i++) {
        var instance = instances[i],
            isActive = instance.stopwatch.isActive(),
            isRunning = instance.stopwatch.isRunning();

        if (isActive) {
          renderStart = false;

          if (isRunning) {
            renderResumeReset = false;

            if (!instance.stopwatch.lapDistance) {
              renderLap = false;
            }
          } else {
            renderStop = renderSplit = renderLap = false;
          }
        } else {
          // not active
          renderResumeReset = renderSplit = renderLap = renderStop = false;
        }
      }

      var startElement, stopElement, resumeElement, splitElement, lapElement, resetElement;
      if (renderStart) {
        startElement = React.createElement(
          Button,
          { variant: 'success', onClick: this.startSelected.bind(this) },
          React.createElement('i', { className: 'fad fa-play fa-1x' })
        );
      }

      if (renderStop) {
        stopElement = React.createElement(
          Button,
          { variant: 'danger', onClick: this.stopSelected.bind(this) },
          React.createElement('i', { className: 'fad fa-stop fa-1x' })
        );
      }

      if (renderResumeReset) {
        resumeElement = React.createElement(
          Button,
          { variant: 'success', onClick: this.resumeSelected.bind(this) },
          React.createElement('i', { className: 'fad fa-play fa-1x' })
        );
        resetElement = React.createElement(
          Button,
          { variant: 'danger', onClick: this.resetSelected.bind(this) },
          'Reset'
        );
      }

      if (renderSplit) {
        splitElement = React.createElement(
          Button,
          { variant: 'outline-secondary', onClick: this.splitSelected.bind(this) },
          'Split'
        );
      }

      if (renderLap) {
        lapElement = React.createElement(
          Button,
          { variant: 'outline-secondary', onClick: this.lapSelected.bind(this) },
          'Lap'
        );
      }

      if (renderStart || renderStop || renderResumeReset || renderSplit || renderLap) {
        return React.createElement(
          InputGroup,
          null,
          startElement,
          stopElement,
          resumeElement,
          splitElement,
          lapElement,
          resetElement
        );
      } else {
        return React.createElement(
          Navbar.Text,
          null,
          'No actions available.'
        );
      }
    }
  }, {
    key: 'renderAdminControls',
    value: function renderAdminControls() {
      var addGroupTitle = React.createElement('i', { className: 'fad fa-ellipsis-v fa-1x' }),
          adminActionElements = React.createElement(
        InputGroup,
        null,
        React.createElement(
          ButtonGroup,
          { className: 'mx-3' },
          React.createElement(
            Button,
            { variant: 'outline-secondary', onClick: this.lockSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-lock fa-1x' })
          ),
          React.createElement(
            Button,
            { variant: 'outline-secondary', onClick: this.unlockSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-lock-open fa-1x' })
          )
        ),
        React.createElement(
          DropdownButton,
          { variant: 'outline-secondary', align: 'end', title: addGroupTitle },
          React.createElement(
            Dropdown.Item,
            { variant: 'outline-secondary', onClick: this.cloneSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-clone fa-1x' }),
            ' Clone'
          ),
          React.createElement(
            Dropdown.Item,
            { variant: 'outline-secondary', onClick: this.hideSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-eye-slash fa-1x' }),
            ' Hide'
          ),
          React.createElement(
            Dropdown.Item,
            { variant: 'danger', onClick: this.deleteSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-trash fa-1x' }),
            ' Delete'
          )
        )
      );
      return adminActionElements;
    }
  }, {
    key: 'renderViewElement',
    value: function renderViewElement() {
      var viewInGridVariant = this.state.viewType == 'grid' ? 'primary' : 'outline-secondary',
          viewInListVariant = this.state.viewType == 'list' ? 'primary' : 'outline-secondary';

      return React.createElement(
        ButtonGroup,
        null,
        React.createElement(
          Button,
          { variant: viewInGridVariant, onClick: this.viewInGrid.bind(this), title: 'Grid' },
          React.createElement('i', { className: 'fad fa-th-large fa-1x' })
        ),
        React.createElement(
          Button,
          { variant: viewInListVariant, onClick: this.viewInList.bind(this), title: 'List' },
          React.createElement('i', { className: 'fad fa-th-list fa-1x' })
        )
      );
    }
  }, {
    key: 'renderBlankState',
    value: function renderBlankState() {
      return React.createElement(
        'div',
        { className: 'empty text-align-center my-5' },
        React.createElement('i', { className: 'fad fa-stopwatch fa-9x' }),
        React.createElement(
          'p',
          { className: 'my-3' },
          'No stopwatches created...yet.'
        ),
        React.createElement(
          'p',
          null,
          React.createElement(
            Button,
            { onClick: this.createNew.bind(this) },
            React.createElement('i', { className: 'fad fa-plus fa-1x' }),
            ' New Stopwatch'
          )
        )
      );
    }
  }, {
    key: 'renderSearch',
    value: function renderSearch() {
      search = this.state.search, unlockedVariant = search.lock.unlocked ? 'primary' : 'outline-secondary', lockedVariant = search.lock.locked ? 'primary' : 'outline-secondary', hiddenVariant = search.hidden ? 'primary' : 'outline-secondary', hiddenIcon = search.hidden ? React.createElement('i', { className: 'fad fa-eye-slash fa-1x' }) : React.createElement('i', { className: 'fad fa-eye fa-1x' });
      return React.createElement(
        InputGroup,
        null,
        React.createElement(
          InputGroup.Text,
          { id: 'new-stopwatch' },
          React.createElement('i', { className: 'fad fa-search' })
        ),
        React.createElement(FormControl, { type: 'search', placeholder: 'Search Stopwatches', onChange: this.searchChange.bind(this), className: 'me-2', 'aria-label': 'Search Stopwatches' }),
        React.createElement(
          ButtonGroup,
          null,
          React.createElement(
            Button,
            { variant: unlockedVariant, title: 'Unlock', onClick: this.toggleUnlockFilter.bind(this) },
            React.createElement('i', { className: 'fad fa-lock-open fa-1x' })
          ),
          React.createElement(
            Button,
            { variant: lockedVariant, title: 'Lock', onClick: this.toggleLockFilter.bind(this) },
            React.createElement('i', { className: 'fad fa-lock fa-1x' })
          )
        ),
        React.createElement(
          Button,
          { className: 'mx-2', variant: hiddenVariant, title: 'Hidden', onClick: this.toggleHiddenFilter.bind(this) },
          hiddenIcon
        )
      );
    }
  }, {
    key: 'renderGroupControls',
    value: function renderGroupControls(visibleInstances) {
      var group = this.state.group,
          groupModeVariant = group.mode ? 'primary' : 'outline-secondary',
          allSelected = group.selected.length === visibleInstances.length,
          anySelected = group.selected.length > 0;

      var selectAllVariant = 'outline-primary',
          deselectAllVariant = 'outline-primary';
      if (allSelected) {
        selectAllVariant = 'primary';
      }
      if (!anySelected) {
        deselectAllVariant = 'primary';
      }

      isGroupMode = this.state.group.mode;
      var selectAllElement = isGroupMode ? React.createElement(
        Button,
        { variant: selectAllVariant, onClick: this.selectAll.bind(this), title: 'Select All' },
        React.createElement('i', { className: 'fad fa-expand fa-1x' })
      ) : '',
          deselectAllElement = isGroupMode ? React.createElement(
        Button,
        { variant: deselectAllVariant, onClick: this.deselectAll.bind(this), title: 'Deselect All' },
        React.createElement('i', { className: 'fad fa-compress fa-1x' })
      ) : '';
      return React.createElement(
        Nav,
        null,
        React.createElement(
          ButtonGroup,
          null,
          selectAllElement,
          deselectAllElement,
          React.createElement(
            Button,
            { variant: groupModeVariant, onClick: this.toggleGroupMode.bind(this) },
            React.createElement('i', { className: 'fad fa-object-group' })
          )
        )
      );
    }
  }, {
    key: 'sortInstances',
    value: function sortInstances(instances) {
      sort = this.state.sort;
      if (sort.alphabetical) {
        sortHandler = this.sortAlphabeticalDesc;
        if (sort.alphabetical.ascending) {
          sortHandler = this.sortAlphabeticalAsc;
        }
      }

      if (sort.chronological) {
        sortHandler = this.sortChronologicalDesc;
        if (sort.chronological.ascending) {
          sortHandler = this.sortChronologicalAsc;
        }
      }

      if (sort.durational) {
        sortHandler = this.sortDurationalDesc;
        if (sort.durational.ascending) {
          sortHandler = this.sortDurationalAsc;
        }
      }

      if (sortHandler) {
        sortHandler(instances);
      }

      return instances;
    }
  }, {
    key: 'renderEmptyResults',
    value: function renderEmptyResults() {
      return React.createElement(
        'div',
        { className: 'empty text-align-center my-5' },
        React.createElement('i', { className: 'fad fa-frown-open fa-9x' }),
        React.createElement(
          'p',
          { className: 'my-3' },
          'Sorry, no matching stopwatches.'
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      if (!this.props.instances.length) {
        return this.renderBlankState();
      }

      var cloneInstanceFn;
      if (this.props.cloneInstance) {
        cloneInstanceFn = this.props.cloneInstance;
      } else if (this.props.clone && !this.props.cloneInstance) {
        cloneInstanceFn = this.cloneStopwatchInstance.bind(this);
      }

      var deleteInstanceFn;
      if (this.props.deleteInstance) {
        deleteInstanceFn = this.props.deleteInstance;
      } else if (this.props.delete && !this.props.deleteInstance) {
        deleteInstanceFn = this.deleteInstance.bind(this);
      }

      var viewControlsElement = '';
      if (!this.props.viewType) {
        viewControlsElement = this.renderViewElement();
      }

      var instances = this.props.instances.filter(this.isMatch.bind(this)),
          stopwatchViewElement;
      this.sortInstances(instances);

      if (instances.length) {
        if (this.state.viewType == 'list') {
          stopwatchViewElement = React.createElement(StopwatchListView, { instances: instances, groups: this.props.groups, updateInstances: this.props.updateInstances, cloneInstance: cloneInstanceFn, deleteInstance: deleteInstanceFn, groupMode: this.state.group.mode, selectInstance: this.toggleSelect.bind(this), selected: this.state.group.selected });
        } else if (this.state.viewType == 'grid') {
          stopwatchViewElement = React.createElement(StopwatchGridView, { instances: instances, groups: this.props.groups, updateInstances: this.props.updateInstances, cloneInstance: cloneInstanceFn, deleteInstance: deleteInstanceFn, groupMode: this.state.group.mode, selectInstance: this.toggleSelect.bind(this), selected: this.state.group.selected });
        }
      } else {
        stopwatchViewElement = this.renderEmptyResults();
      }

      var addButton = this.props.addButton ? React.createElement(
        Button,
        { className: 'mx-3', onClick: this.createNew.bind(this), variant: 'success', title: 'New Stopwatch' },
        React.createElement('i', { className: 'fad fa-plus fa-1x' })
      ) : '';

      var groupNav;
      if (this.props.select) {
        groupNav = this.renderGroupControls(instances);
      }

      var sortControls = this.renderSortControls(),
          viewNavbarElement = React.createElement(
        Navbar,
        { bg: 'light', variant: 'light' },
        React.createElement(
          Nav,
          { className: 'me-auto' },
          viewControlsElement
        ),
        React.createElement(
          Nav,
          null,
          sortControls
        )
      );
      var searchBatchNav = React.createElement(
        Nav,
        { className: 'me-auto' },
        React.createElement(
          Navbar.Text,
          null,
          'Tap on a stopwatch to select it'
        )
      );
      if (this.state.group.mode) {
        if (this.state.group.selected.length) {
          var adminControls = this.renderAdminControls(),
              runningControls = this.renderRunningControls();
          searchBatchNav = React.createElement(
            React.Fragment,
            null,
            React.createElement(
              Nav,
              { className: 'me-auto' },
              adminControls
            ),
            React.createElement(
              Nav,
              { className: 'me-auto' },
              runningControls
            )
          );
        }
      } else {
        var searchElement = this.renderSearch();
        searchBatchNav = React.createElement(
          Nav,
          { className: 'me-auto' },
          searchElement,
          addButton
        );
      }
      var searchNavbarElement = React.createElement(
        Navbar,
        { bg: 'light', variant: 'light', sticky: 'top' },
        searchBatchNav,
        groupNav
      ),
          className = this.props.className ? 'stopwatch-container ' + this.props.className : 'stopwatch-container';
      return React.createElement(
        'div',
        { className: className },
        viewNavbarElement,
        searchNavbarElement,
        stopwatchViewElement
      );
    }
  }]);

  return StopwatchContainerView;
}(BaseContainerView);

var StopwatchMenuView = function (_StopwatchContainerVi) {
  _inherits(StopwatchMenuView, _StopwatchContainerVi);

  function StopwatchMenuView(props) {
    _classCallCheck(this, StopwatchMenuView);

    var _this2 = _possibleConstructorReturn(this, (StopwatchMenuView.__proto__ || Object.getPrototypeOf(StopwatchMenuView)).call(this, props));

    _this2.state.newName = '';
    return _this2;
  }

  _createClass(StopwatchMenuView, [{
    key: 'isMatch',
    value: function isMatch(instance) {
      var search = this.state.search,
          lock = search.lock,
          query = search.query,
          name = instance.name,
          isNameMatch = name.indexOf(query) > -1,
          hasLockPreference = lock.locked ^ lock.unlocked,
          lockMatch = lock.locked && instance.locked,
          unlockMatch = lock.unlocked && !instance.locked,
          hiddenMatch = search.hidden === !instance.visible,
          isLockMatch = !hasLockPreference || lockMatch || unlockMatch;
      return isNameMatch && isLockMatch && hiddenMatch;
    }
  }, {
    key: 'updateNew',
    value: function updateNew(event) {
      this.setState({ newName: event.target.value });
    }
  }, {
    key: 'createNew',
    value: function createNew(event) {
      if (event.keyCode === 13) {
        var stopwatch = new LapStopwatch(),
            stopwatchCount = this.props.instances.length;
        var name = this.state.newName;

        if (!name) {
          name = 'Stopwatch #' + stopwatchCount;
        }

        var activity = {
          type: 'Created',
          description: '',
          timestamp: stopwatch.metadata.createdAt
        },
            item = { name: name, stopwatch: stopwatch, locked: false, visible: true, id: stopwatchCount, activity: [activity], groups: [] },
            self = this;

        stopwatchAdapter.add(STOPWATCHSTORE, item).then(function (events) {
          item.id = events[0].target.result;
          self.props.instances.push(item);
          self.props.updateInstances();
          self.setState({ newName: '' });
        });
      }
    }
  }, {
    key: 'renderBulkControls',
    value: function renderBulkControls() {
      return React.createElement(
        InputGroup,
        { className: 'my-3' },
        React.createElement(
          Button,
          { variant: 'outline-secondary', onClick: this.cloneSelected.bind(this) },
          React.createElement('i', { className: 'fad fa-clone fa-1x' })
        ),
        React.createElement(
          ButtonGroup,
          { className: 'mx-auto' },
          React.createElement(
            Button,
            { variant: 'outline-secondary', onClick: this.showSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-eye fa-1x' })
          ),
          React.createElement(
            Button,
            { variant: 'outline-secondary', onClick: this.hideSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-eye-slash fa-1x' })
          )
        ),
        React.createElement(
          ButtonGroup,
          { className: 'mx-auto' },
          React.createElement(
            Button,
            { variant: 'outline-secondary', onClick: this.lockSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-lock fa-1x' })
          ),
          React.createElement(
            Button,
            { variant: 'outline-secondary', onClick: this.unlockSelected.bind(this) },
            React.createElement('i', { className: 'fad fa-lock-open fa-1x' })
          )
        ),
        React.createElement(
          Button,
          { variant: 'danger', onClick: this.deleteSelected.bind(this) },
          React.createElement('i', { className: 'fad fa-trash fa-1x' })
        )
      );
    }
  }, {
    key: 'renderInstance',
    value: function renderInstance(instance) {
      var id = instance.id,
          name = instance.name,
          lockElement = instance.locked ? React.createElement('i', { className: 'fad fa-lock' }) : React.createElement('i', { className: 'fad fa-lock-open' }),
          visibleElement = instance.visible ? React.createElement('i', { className: 'fad fa-eye' }) : React.createElement('i', { className: 'fad fa-eye-slash' }),
          isSelected = this.state.group.selected && this.state.group.selected.indexOf(instance) > -1,
          element = React.createElement(
        Item,
        { active: isSelected, key: id, onClick: this.toggleSelect.bind(this, instance) },
        visibleElement,
        ' ',
        lockElement,
        ' ',
        name
      );
      return element;
    }
  }, {
    key: 'renderEmptyResults',
    value: function renderEmptyResults() {
      return React.createElement(
        'div',
        { className: 'empty text-align-center my-5' },
        React.createElement('i', { className: 'fad fa-frown-open fa-9x' }),
        React.createElement(
          'p',
          { className: 'my-3' },
          'Sorry, no matching stopwatches.'
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var instances = this.props.instances.filter(this.isMatch.bind(this));

      this.sortInstances(instances);

      var listElements = [];
      for (var i = 0; i < instances.length; i++) {
        var element = this.renderInstance(instances[i]);
        listElements.push(element);
      }

      var stopwatchViewElement;
      if (this.props.instances.length && !instances.length) {
        stopwatchViewElement = this.renderEmptyResults();
      } else {
        stopwatchViewElement = React.createElement(
          ListGroup,
          { className: 'mt-3' },
          listElements
        );
      }
      var sortControls = this.props.instances.length ? this.renderSortControls() : '',
          searchElement = this.props.instances.length ? this.renderSearch() : '';

      var bulkControls;
      if (this.state.group.selected.length) {
        bulkControls = this.renderBulkControls();
      }

      var className = this.props.className ? 'stopwatch-menu-container ' + this.props.className : 'stopwatch-menu-container';
      return React.createElement(
        'div',
        { className: className },
        React.createElement(
          'div',
          { className: 'text-align-center my-3' },
          sortControls
        ),
        searchElement,
        bulkControls,
        stopwatchViewElement,
        React.createElement(
          InputGroup,
          { className: 'mb-3' },
          React.createElement(
            InputGroup.Text,
            { id: 'new-stopwatch' },
            React.createElement('i', { className: 'fad fa-plus' })
          ),
          React.createElement(FormControl, {
            placeholder: 'Stopwatch Name',
            'aria-label': 'new stopwatch',
            'aria-describedby': 'new-stopwatch',
            value: this.state.newName,
            onKeyDown: this.createNew.bind(this),
            onChange: this.updateNew.bind(this),
            minLength: '1'
          })
        )
      );
    }
  }]);

  return StopwatchMenuView;
}(StopwatchContainerView);