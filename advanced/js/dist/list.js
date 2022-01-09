var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseContainerView = function (_React$Component) {
  _inherits(BaseContainerView, _React$Component);

  function BaseContainerView(props) {
    _classCallCheck(this, BaseContainerView);

    var _this = _possibleConstructorReturn(this, (BaseContainerView.__proto__ || Object.getPrototypeOf(BaseContainerView)).call(this, props));

    _this.state = {
      viewType: props.viewType || 'grid',
      search: {
        query: '',
        lock: {
          unlocked: false,
          locked: false
        }
      },
      sort: {
        chronological: {
          ascending: true
        },
        alphabetical: null
      }
    };

    _this.sortAlphabeticalAsc = _this.sortAlphabeticalAsc.bind(_this);
    _this.sortAlphabeticalDesc = _this.sortAlphabeticalDesc.bind(_this);
    return _this;
  }

  _createClass(BaseContainerView, [{
    key: 'deleteInstance',
    value: function deleteInstance(instance) {
      var index = this.props.instances.indexOf(instance);
      this.props.instances.splice(index, 1);
      this.props.updateInstances();
    }
  }, {
    key: 'viewInList',
    value: function viewInList() {
      this.setState({ viewType: 'list' });
    }
  }, {
    key: 'viewInGrid',
    value: function viewInGrid() {
      this.setState({ viewType: 'grid' });
    }
  }, {
    key: 'searchChange',
    value: function searchChange(event) {
      var query = event.target.value;
      this.state.search.query = query;
      this.setState({ search: this.state.search });
    }
  }, {
    key: 'toggleLockFilter',
    value: function toggleLockFilter() {
      this.state.search.lock.locked = !this.state.search.lock.locked;
      this.state.search.lock.unlocked = false;
      this.setState({ search: this.state.search });
    }
  }, {
    key: 'toggleUnlockFilter',
    value: function toggleUnlockFilter() {
      this.state.search.lock.unlocked = !this.state.search.lock.unlocked;
      this.state.search.lock.locked = false;
      this.setState({ search: this.state.search });
    }
  }, {
    key: 'isMatch',
    value: function isMatch(instance) {
      var search = this.state.search,
          query = search.query,
          name = instance.name,
          isNameMatch = name.indexOf(query) > -1,
          isMatch = isNameMatch;
      return isMatch;
    }
  }, {
    key: 'sortAlphabeticalAsc',
    value: function sortAlphabeticalAsc(instances) {
      instances.sort(function (a, b) {
        var nameA = a.name.toUpperCase(),
            nameB = b.name.toUpperCase();
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }
        return 0;
      });
    }
  }, {
    key: 'sortAlphabeticalDesc',
    value: function sortAlphabeticalDesc(instances) {
      this.sortAlphabeticalAsc(instances);
      instances.reverse();
    }
  }, {
    key: 'setSortChronologicalAsc',
    value: function setSortChronologicalAsc() {
      var sort = {
        alphabetical: null,
        chronological: {
          ascending: true
        },
        durational: null
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'setSortChronologicalDesc',
    value: function setSortChronologicalDesc() {
      var sort = {
        alphabetical: null,
        chronological: {
          ascending: false
        },
        durational: null
      };
      this.setState({ sort: sort });
    }
  }]);

  return BaseContainerView;
}(React.Component);

BaseContainerView.contextType = ThemeContext;

var StopwatchContainerView = function (_BaseContainerView) {
  _inherits(StopwatchContainerView, _BaseContainerView);

  function StopwatchContainerView(props) {
    _classCallCheck(this, StopwatchContainerView);

    var _this2 = _possibleConstructorReturn(this, (StopwatchContainerView.__proto__ || Object.getPrototypeOf(StopwatchContainerView)).call(this, props));

    _this2.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      durational: null
    };
    _this2.state.group = {
      mode: false,
      selected: []
    };
    _this2.sortChronologicalAsc = _this2.sortChronologicalAsc.bind(_this2);
    _this2.sortChronologicalDesc = _this2.sortChronologicalDesc.bind(_this2);
    _this2.sortDurationalAsc = _this2.sortDurationalAsc.bind(_this2);
    _this2.sortDurationalDesc = _this2.sortDurationalDesc.bind(_this2);
    return _this2;
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
        var instance = this.state.group.selected.shift(),
            index = this.props.instances.indexOf(instance);
        this.props.instances.splice(index, 1);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'lockSelected',
    value: function lockSelected() {
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.lock(instance);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'lock',
    value: function lock(instance) {
      var newVerb = 'Locked',
          activity = {
        icon: 'fa-lock',
        name: newVerb,
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.locked = true;
    }
  }, {
    key: 'unlockSelected',
    value: function unlockSelected() {
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.unlock(instance);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'unlock',
    value: function unlock(instance) {
      var newVerb = 'Unlocked',
          activity = {
        icon: 'fa-lock',
        name: newVerb,
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.locked = false;
    }
  }, {
    key: 'hideSelected',
    value: function hideSelected() {
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.hide(instance);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'hide',
    value: function hide(instance) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Hide',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.visible = false;
    }
  }, {
    key: 'showSelected',
    value: function showSelected() {
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.show(instance);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'show',
    value: function show(instance) {
      var activity = {
        icon: 'fa-eye',
        name: 'Show',
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
        var instance = this.state.group.selected[i];
        this.cloneStopwatchInstance(instance);
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

      newItem.stopwatch.metadata.createdAt = new Date();
      newItem.stopwatch.metadata.lastModified = null;
      newItem.stopwatch.metadata.startedAt = instance.stopwatch.metadata.startedAt;
      newItem.stopwatch.metadata.stoppedAt = instance.stopwatch.metadata.stoppedAt;

      for (var i = 0; i < newItem.stopwatch.splits.length; i++) {
        if (newItem.stopwatch.splits[i].distance && newItem.stopwatch.splits[i].distanceUnit) {
          Object.setPrototypeOf(newItem.stopwatch.splits[i], Lap.prototype);
        } else {
          Object.setPrototypeOf(newItem.stopwatch.splits[i], Split.prototype);
        }
        newItem.stopwatch.splits[i].metadata.createdAt = instance.stopwatch.splits[i].metadata.createdAt;
        newItem.stopwatch.splits[i].metadata.lastModified = instance.stopwatch.splits[i].metadata.lastModified;
      }

      for (var i = 0; i < newItem.activity.length; i++) {
        var activity = newItem.activity[i];
        activity.timestamp = new Date(activity.timestamp);
      }

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

      // find new ID
      var newId = instance.id + 1;
      while (true) {
        var isMatch = true;
        for (var i = 0; i < this.props.instances.length; i++) {
          var itemCheck = this.props.instances[i];
          if (itemCheck.id === newId) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          break;
        } else {
          newId++;
        }
      }

      newItem.id = newId;
      newItem.name = newName;
      newItem.selected = false;

      newItem.stopwatch = Object.setPrototypeOf(newItem.stopwatch, LapStopwatch.prototype);

      // assign groups
      for (var i = 0; i < newItem.groups.length; i++) {
        var groupName = newItem.groups[i];
        for (var j = 0; j < this.props.groups.length; j++) {
          var potentialGroup = this.props.groups[j];
          if (potentialGroup.name == groupName) {
            potentialGroup.members.push(newItem.id);
          }
        }
      }

      var activity = {
        name: 'Cloned',
        description: '',
        timestamp: new Date()
      };
      newItem.activity.unshift(activity);
      this.props.instances.push(newItem);
      this.props.updateInstances();
    }
  }, {
    key: 'start',
    value: function start(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Start',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.start(timestamp);
    }
  }, {
    key: 'startSelected',
    value: function startSelected() {
      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.start(instance, now);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'stop',
    value: function stop(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Stop',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.stop(timestamp);
    }
  }, {
    key: 'stopSelected',
    value: function stopSelected() {
      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.stop(instance, now);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'resume',
    value: function resume(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Resume',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.resume(timestamp);
    }
  }, {
    key: 'resumeSelected',
    value: function resumeSelected() {
      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.resume(instance, now);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'split',
    value: function split(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Split',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.addSplit(timestamp);
    }
  }, {
    key: 'splitSelected',
    value: function splitSelected() {
      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.split(instance, now);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'lap',
    value: function lap(instance, timestamp) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Lap',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.addLap(timestamp);
    }
  }, {
    key: 'lapSelected',
    value: function lapSelected() {
      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.lap(instance, now);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'reset',
    value: function reset(instance) {
      var activity = {
        icon: 'fa-eye-slash',
        name: 'Reset',
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.stopwatch.reset();
    }
  }, {
    key: 'resetSelected',
    value: function resetSelected() {
      var now = Date.now();
      for (var i = 0; i < this.state.group.selected.length; i++) {
        var instance = this.state.group.selected[i];
        this.reset(instance, now);
      }
      this.props.updateInstances();
    }
  }, {
    key: 'isMatch',
    value: function isMatch(instance) {
      var isMatch = _get(StopwatchContainerView.prototype.__proto__ || Object.getPrototypeOf(StopwatchContainerView.prototype), 'isMatch', this).call(this, instance);
      search = this.state.search, lock = search.lock, hasLockPreference = lock.locked ^ lock.unlocked, lockMatch = lock.locked && instance.locked, unlockMatch = lock.unlocked && !instance.locked, isLockMatch = !hasLockPreference || lockMatch || unlockMatch;
      return isMatch && instance.visible && isLockMatch;
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
        name: 'Created',
        description: '',
        timestamp: stopwatch.metadata.createdAt
      },
          item = { name: name, stopwatch: stopwatch, locked: false, visible: true, selected: false, id: stopwatchCount, activity: [activity], groups: [] };
      this.props.instances.push(item);
      this.props.updateInstances();
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
          { variant: 'outline-secondary', onClick: this.resetSelected.bind(this) },
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
          Button,
          { variant: 'outline-secondary', onClick: this.cloneSelected.bind(this) },
          React.createElement('i', { className: 'fad fa-clone fa-1x' })
        ),
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
      return '';
    }
  }, {
    key: 'renderSearch',
    value: function renderSearch() {
      search = this.state.search, unlockedVariant = search.lock.unlocked ? 'primary' : 'outline-secondary', lockedVariant = search.lock.locked ? 'primary' : 'outline-secondary';
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
      if (this.state.viewType == 'list') {
        stopwatchViewElement = React.createElement(StopwatchListView, { instances: instances, groups: this.props.groups, updateInstances: this.props.updateInstances, cloneInstance: cloneInstanceFn, deleteInstance: deleteInstanceFn, groupMode: this.state.group.mode, selectInstance: this.toggleSelect.bind(this), selected: this.state.group.selected });
      } else if (this.state.viewType == 'grid') {
        stopwatchViewElement = React.createElement(StopwatchGridView, { instances: instances, groups: this.props.groups, updateInstances: this.props.updateInstances, cloneInstance: cloneInstanceFn, deleteInstance: deleteInstanceFn, groupMode: this.state.group.mode, selectInstance: this.toggleSelect.bind(this), selected: this.state.group.selected });
      }

      var addButton = this.props.addButton ? React.createElement(
        Button,
        { className: 'mx-3', onClick: this.createNew.bind(this), variant: 'success', title: 'New Stopwatch' },
        React.createElement('i', { className: 'fad fa-plus fa-1x' })
      ) : '';

      var groupNav;
      if (this.props.select && this.props.instances.length > 1) {
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

    var _this3 = _possibleConstructorReturn(this, (StopwatchMenuView.__proto__ || Object.getPrototypeOf(StopwatchMenuView)).call(this, props));

    _this3.state.newName = '';
    return _this3;
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
          isLockMatch = !hasLockPreference || lockMatch || unlockMatch;
      return isNameMatch && isLockMatch;
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

        if (name) {
          // check if any groups exist with the specified name
          for (var i = 0; i < this.props.instances.length; i++) {
            var _item = this.props.items[i];
            if (_item.name === name) {
              return;
            }
          }
        } else {
          name = 'Stopwatch #' + stopwatchCount;
        }

        var activity = {
          name: 'Created',
          description: '',
          timestamp: stopwatch.metadata.createdAt
        },
            _item = { name: name, stopwatch: stopwatch, locked: false, visible: true, id: stopwatchCount, activity: [activity], groups: [] };
        this.props.instances.push(_item);
        this.setState({ newName: '' });
        this.props.updateInstances();
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
    key: 'render',
    value: function render() {
      var instances = this.props.instances.filter(this.isMatch.bind(this));
      this.sortInstances(instances);

      var listElements = [];
      for (var i = 0; i < instances.length; i++) {
        var element = this.renderInstance(instances[i]);
        listElements.push(element);
      }
      var stopwatchViewElement = React.createElement(
        ListGroup,
        { className: 'mt-3' },
        listElements
      ),
          sortControls = this.props.instances.length ? this.renderSortControls() : '',
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

var GroupContainerView = function (_BaseContainerView2) {
  _inherits(GroupContainerView, _BaseContainerView2);

  function GroupContainerView(props) {
    _classCallCheck(this, GroupContainerView);

    var _this4 = _possibleConstructorReturn(this, (GroupContainerView.__proto__ || Object.getPrototypeOf(GroupContainerView)).call(this, props));

    _this4.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      membership: null
    };

    _this4.sortChronologicalAsc = _this4.sortChronologicalAsc.bind(_this4);
    _this4.sortChronologicalDesc = _this4.sortChronologicalDesc.bind(_this4);
    _this4.sortMembershipAsc = _this4.sortMembershipAsc.bind(_this4);
    _this4.sortMembershipDesc = _this4.sortMembershipDesc.bind(_this4);

    return _this4;
  }

  _createClass(GroupContainerView, [{
    key: 'cloneStopwatchInstance',
    value: function cloneStopwatchInstance(instance) {
      var now = new Date(),
          newItem = JSON.parse(JSON.stringify(instance)),
          newBaseName = newPotentialName = newName = instance.name + ' Copy',
          version = 0;

      newItem.stopwatch.metadata.createdAt = new Date();
      newItem.stopwatch.metadata.lastModified = null;
      newItem.stopwatch.metadata.startedAt = instance.stopwatch.metadata.startedAt;
      newItem.stopwatch.metadata.stoppedAt = instance.stopwatch.metadata.stoppedAt;

      for (var i = 0; i < newItem.stopwatch.splits.length; i++) {
        if (newItem.stopwatch.splits[i].distance && newItem.stopwatch.splits[i].distanceUnit) {
          Object.setPrototypeOf(newItem.stopwatch.splits[i], Lap.prototype);
        } else {
          Object.setPrototypeOf(newItem.stopwatch.splits[i], Split.prototype);
        }
        newItem.stopwatch.splits[i].metadata.createdAt = instance.stopwatch.splits[i].metadata.createdAt;
        newItem.stopwatch.splits[i].metadata.lastModified = instance.stopwatch.splits[i].metadata.lastModified;
      }

      for (var i = 0; i < newItem.activity.length; i++) {
        var activity = newItem.activity[i];
        activity.timestamp = new Date(activity.timestamp);
      }

      // find new name for stopwatch
      while (true) {
        var isMatch = true;
        for (var i = 0; i < this.props.stopwatches.length; i++) {
          var itemCheck = this.props.stopwatches[i];
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

      // find new ID
      var newId = instance.id + 1;
      while (true) {
        var isMatch = true;
        for (var i = 0; i < this.props.stopwatches.length; i++) {
          var itemCheck = this.props.stopwatches[i];
          if (itemCheck.id === newId) {
            isMatch = false;
            break;
          }
        }

        if (isMatch) {
          break;
        } else {
          newId++;
        }
      }

      newItem.id = newId;
      newItem.name = newName;
      newItem.selected = false;

      newItem.stopwatch = Object.setPrototypeOf(newItem.stopwatch, LapStopwatch.prototype);

      // assign groups
      for (var i = 0; i < newItem.groups.length; i++) {
        var groupName = newItem.groups[i];
        for (var j = 0; j < this.props.instances.length; j++) {
          var potentialGroup = this.props.instances[j];
          if (potentialGroup.name == groupName) {
            potentialGroup.members.push(newItem.id);
            break;
          }
        }
      }

      var activity = {
        name: 'Cloned',
        description: '',
        timestamp: new Date()
      };
      newItem.activity.unshift(activity);
      this.props.stopwatches.push(newItem);
      this.props.updateStopwatches();
    }
  }, {
    key: 'deleteInstance',
    value: function deleteInstance(instance) {
      _get(GroupContainerView.prototype.__proto__ || Object.getPrototypeOf(GroupContainerView.prototype), 'deleteInstance', this).call(this, instance);
      var instanceName = instance.name;

      // delete group from stopwatches
      for (var i = 0; i < this.props.stopwatches.length; i++) {
        var stopwatchInstance = this.props.stopwatches[i],
            groups = stopwatchInstance.groups,
            groupIndex = groups.indexOf(instanceName);
        if (groupIndex > -1) {
          groups.splice(groupIndex, 1);
        }
      }
      this.props.updateInstances();
    }
  }, {
    key: 'deleteStopwatchInstance',
    value: function deleteStopwatchInstance(instance) {
      var index = this.props.stopwatches.indexOf(instance);
      this.props.stopwatches.splice(index, 1);
      this.props.updateInstances();
    }
  }, {
    key: 'setSortChronologicalAsc',
    value: function setSortChronologicalAsc() {
      var sort = {
        alphabetical: null,
        chronological: {
          ascending: true
        },
        membership: null
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'setSortChronologicalDesc',
    value: function setSortChronologicalDesc() {
      var sort = {
        alphabetical: null,
        chronological: {
          ascending: false
        },
        membership: null
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'sortChronologicalAsc',
    value: function sortChronologicalAsc(instances) {
      instances.sort(function (a, b) {
        var aVal = a.createdAt,
            bVal = b.createdAt;
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
    key: 'setSortAlphabeticalAsc',
    value: function setSortAlphabeticalAsc() {
      var sort = {
        alphabetical: {
          ascending: true
        },
        chronological: null,
        membership: null
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
        membership: null
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'sortMembershipAsc',
    value: function sortMembershipAsc(instances) {
      instances.sort(function (a, b) {
        var aVal = a.members.length,
            bVal = b.members.length;
        return aVal - bVal;
      });
    }
  }, {
    key: 'sortMembershipDesc',
    value: function sortMembershipDesc(instances) {
      this.sortMembershipAsc(instances);
      instances.reverse();
    }
  }, {
    key: 'setSortMembershipAsc',
    value: function setSortMembershipAsc() {
      var sort = {
        alphabetical: null,
        chronological: null,
        membership: {
          ascending: true
        }
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'setSortMembershipDesc',
    value: function setSortMembershipDesc() {
      var sort = {
        alphabetical: null,
        chronological: null,
        membership: {
          ascending: false
        }
      };
      this.setState({ sort: sort });
    }
  }, {
    key: 'renderSortControls',
    value: function renderSortControls() {

      var sort = this.state.sort,
          alphabetical = sort.alphabetical,
          chronological = sort.chronological,
          membership = sort.membership;

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

      var membershipVariant = 'outline-secondary',
          membershipIcon = 'fad fa-sort-size-up-alt fa-1x',
          membershipHandler = this.setSortMembershipAsc;
      if (membership) {
        membershipVariant = 'primary';
        if (membership.ascending) {
          membershipIcon = 'fad fa-sort-size-down-alt fa-1x';
          membershipHandler = this.setSortMembershipDesc;
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
          membershipButton = React.createElement(
        Button,
        { variant: membershipVariant, onClick: membershipHandler.bind(this), title: 'Membership' },
        React.createElement('i', { className: membershipIcon })
      );
      sortButtonGroup = React.createElement(
        ButtonGroup,
        null,
        chronologicalButton,
        alphabeticalButton,
        membershipButton
      );
      return sortButtonGroup;
    }
  }, {
    key: 'renderStopwatchesByGroup',
    value: function renderStopwatchesByGroup(instances) {
      var ungroupedStopwatches = [];
      groupedStopwatches = [];
      for (var i = 0; i < this.props.stopwatches.length; i++) {
        var instance = this.props.stopwatches[i],
            hasGroups = instance.groups.length > 0;

        if (!instance.visible) {
          continue;
        }

        if (hasGroups) {
          groupedStopwatches.push(instance);
        } else {
          ungroupedStopwatches.push(instance);
        }
      }

      var groupElements = [];
      for (var i = 0; i < instances.length; i++) {
        var group = instances[i],
            groupStopwatches = [];

        // get group Stopwatches
        for (var j = 0; j < groupedStopwatches.length; j++) {
          var instance = groupedStopwatches[j],
              stopwatchId = instance.id,
              isMember = group.members.indexOf(stopwatchId) > -1;
          if (isMember) {
            groupStopwatches.push(instance);
          }
        }

        var stopwatchViewElement = React.createElement(StopwatchContainerView, { className: 'mx-2', instances: groupStopwatches, groups: this.props.instances, updateInstances: this.props.updateStopwatches, cloneInstance: this.cloneStopwatchInstance.bind(this), deleteInstance: this.deleteStopwatchInstance.bind(this), select: true });

        var groupElement = React.createElement(
          GroupItem,
          { instance: group, stopwatches: groupStopwatches, deleteInstance: this.deleteInstance.bind(this), key: group.name, update: this.props.updateInstances, updateStopwatches: this.props.updateStopwatches, edit: true },
          stopwatchViewElement
        );
        groupElements.push(groupElement);
      }

      if (ungroupedStopwatches.length) {
        var group = {
          name: 'Ungrouped'
        },
            stopwatchViewElement = React.createElement(StopwatchContainerView, { className: 'mx-2', instances: ungroupedStopwatches, groups: this.props.instances, updateInstances: this.props.updateStopwatches, cloneInstance: this.cloneStopwatchInstance.bind(this), deleteInstance: this.deleteStopwatchInstance.bind(this), select: true });
        /*if (this.state.viewType == 'list') {
          stopwatchViewElement = <StopwatchListView instances={ungroupedStopwatches} groups={this.props.instances} updateInstances={this.props.updateInstances} cloneInstance={this.cloneStopwatchInstance.bind(this)} deleteInstance={this.deleteStopwatchInstance.bind(this)} />;
        } else {
          stopwatchViewElement = <StopwatchGridView instances={ungroupedStopwatches} groups={this.props.instances} updateInstances={this.props.updateInstances} cloneInstance={this.cloneStopwatchInstance.bind(this)} deleteInstance={this.deleteStopwatchInstance.bind(this)} />;
        }*/
        groupElements.unshift(React.createElement(
          GroupItem,
          { instance: group, stopwatches: ungroupedStopwatches, key: null, updateStopwatches: this.props.updateStopwatches },
          stopwatchViewElement
        ));
      }
      return React.createElement(
        Row,
        null,
        groupElements
      );
    }
  }, {
    key: 'render',
    value: function render() {
      var unlockedVariant = this.state.search.lock.unlocked ? 'primary' : 'outline-secondary',
          lockedVariant = this.state.search.lock.locked ? 'primary' : 'outline-secondary',
          viewInGridVariant = this.state.viewType == 'grid' ? 'primary' : 'outline-secondary',
          viewInListVariant = this.state.viewType == 'list' ? 'primary' : 'outline-secondary',
          sortControls = this.renderSortControls();

      var navElement = React.createElement(
        Navbar,
        null,
        React.createElement(
          Nav,
          { className: 'me-auto' },
          React.createElement(
            InputGroup,
            null,
            React.createElement(
              InputGroup.Text,
              { id: 'new-stopwatch' },
              React.createElement('i', { className: 'fad fa-search' })
            ),
            React.createElement(FormControl, { type: 'search', placeholder: 'Search Groups', onChange: this.searchChange.bind(this), className: 'me-2', 'aria-label': 'Search Groups' })
          )
        ),
        React.createElement(Nav, { className: 'me-auto' }),
        React.createElement(
          Nav,
          null,
          sortControls
        )
      );
      var instances = this.props.instances.filter(this.isMatch.bind(this)),
          instanceCount = instances.length,
          sort = this.state.sort;
      var stopwatchViewElement, sortHandler;

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
        sortHandler = this.sortMembershipDesc;
        if (sort.durational.ascending) {
          sortHandler = this.sortMembershipAsc;
        }
      }

      if (sortHandler) {
        sortHandler(instances);
      }
      instanceViewElement = this.renderStopwatchesByGroup(instances);

      var className = this.props.className ? 'group-container ' + this.props.className : 'group-container';
      return React.createElement(
        'div',
        { className: className },
        navElement,
        instanceViewElement
      );
    }
  }]);

  return GroupContainerView;
}(BaseContainerView);