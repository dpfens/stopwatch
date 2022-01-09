var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GroupContainerView = function (_BaseContainerView) {
  _inherits(GroupContainerView, _BaseContainerView);

  function GroupContainerView(props) {
    _classCallCheck(this, GroupContainerView);

    var _this = _possibleConstructorReturn(this, (GroupContainerView.__proto__ || Object.getPrototypeOf(GroupContainerView)).call(this, props));

    _this.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      membership: null
    };

    _this.sortChronologicalAsc = _this.sortChronologicalAsc.bind(_this);
    _this.sortChronologicalDesc = _this.sortChronologicalDesc.bind(_this);
    _this.sortMembershipAsc = _this.sortMembershipAsc.bind(_this);
    _this.sortMembershipDesc = _this.sortMembershipDesc.bind(_this);

    return _this;
  }

  _createClass(GroupContainerView, [{
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

      newItem.name = newName;

      var activity = {
        name: 'Cloned',
        description: '',
        timestamp: new Date()
      };
      newItem.activity.unshift(activity);
      delete newItem.id;
      var self = this;
      stopwatchAdapter.add(STOPWATCHSTORE, newItem).then(function (events) {
        var _stopwatchAdapter;

        var newId = events[0].target.result;
        newItem.id = newId;
        self.props.stopwatches.push(newItem);
        self.props.updateStopwatches();

        // assign groups
        var updatedGroups = [];
        for (var i = 0; i < newItem.groups.length; i++) {
          var groupId = newItem.groups[i];
          for (var j = 0; j < self.props.instances.length; j++) {
            var potentialGroup = self.props.instances[j];
            if (potentialGroup.id == groupId) {
              potentialGroup.members.push(newItem.id);
              updatedGroups.push(potentialGroup);
              break;
            }
          }
        }

        // save updated groups
        (_stopwatchAdapter = stopwatchAdapter).update.apply(_stopwatchAdapter, [GROUPSTORE].concat(updatedGroups)).then(function () {
          self.props.updateInstances();
        });
      });
    }
  }, {
    key: 'deleteInstance',
    value: function deleteInstance(instance) {
      var _stopwatchAdapter2;

      _get(GroupContainerView.prototype.__proto__ || Object.getPrototypeOf(GroupContainerView.prototype), 'deleteInstance', this).call(this, instance);

      var self = this;
      stopwatchAdapter.delete(GROUPSTORE, instance.id).then(function () {
        self.props.updateInstances();
      });

      // delete group from stopwatches
      var groupStopwatches = [],
          instanceId = instance.id;
      for (var i = 0; i < this.props.stopwatches.length; i++) {
        var stopwatchInstance = this.props.stopwatches[i],
            groups = stopwatchInstance.groups,
            groupIndex = groups.indexOf(instanceId);
        if (groupIndex > -1) {
          groups.splice(groupIndex, 1);
          groupStopwatches.push(stopwatchInstance);
        }
      }
      (_stopwatchAdapter2 = stopwatchAdapter).update.apply(_stopwatchAdapter2, [STOPWATCHSTORE].concat(groupStopwatches));
    }
  }, {
    key: 'deleteStopwatchInstance',
    value: function deleteStopwatchInstance(instance) {
      var index = this.props.stopwatches.indexOf(instance);
      var self = this;
      stopwatchAdapter.delete(STOPWATCHSTORE, instance.id).then(function () {
        self.props.stopwatches.splice(index, 1);
      });

      var groupsToUpdate = [];
      if (instance.groups.length) {
        for (var i = 0; i < this.props.instances.length; i++) {
          var group = this.props.instances[i],
              memberIndex = group.members.indexOf(instance.id),
              isMember = memberIndex > -1;
          if (isMember) {
            group.members.splice(memberIndex, 1);
            groupsToUpdate.push(group);
          }
        }

        if (groupsToUpdate.length) {
          var _stopwatchAdapter3;

          (_stopwatchAdapter3 = stopwatchAdapter).update.apply(_stopwatchAdapter3, [GROUPSTORE].concat(groupsToUpdate));
        }
      }
      self.props.updateInstances();
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
        if (groupStopwatches.length) {
          var stopwatchViewElement = React.createElement(StopwatchContainerView, { className: 'mx-2', instances: groupStopwatches, groups: this.props.instances, updateInstances: this.props.updateStopwatches, cloneInstance: this.cloneStopwatchInstance.bind(this), deleteInstance: this.deleteStopwatchInstance.bind(this), select: true });
        } else {
          stopwatchViewElement = React.createElement(
            'div',
            { className: 'empty text-align-center my-5' },
            React.createElement('i', { className: 'fad fa-stopwatch fa-9x' }),
            React.createElement(
              'p',
              { className: 'my-3' },
              'No stopwatches assigned...yet.'
            )
          );
        }

        var groupElement = React.createElement(
          GroupItem,
          { instance: group, instances: this.props.instances, stopwatches: groupStopwatches, deleteInstance: this.deleteInstance.bind(this), key: group.name, update: this.props.updateInstances, updateStopwatches: this.props.updateStopwatches, edit: true },
          stopwatchViewElement
        );
        groupElements.push(groupElement);
      }

      // only include the Ungrouped group if the user is not actively searching
      if (ungroupedStopwatches.length && !this.state.search.query) {
        var group = {
          name: 'Ungrouped'
        },
            stopwatchViewElement = React.createElement(StopwatchContainerView, { className: 'mx-2', instances: ungroupedStopwatches, groups: this.props.instances, updateInstances: this.props.updateStopwatches, cloneInstance: this.cloneStopwatchInstance.bind(this), deleteInstance: this.deleteStopwatchInstance.bind(this), select: true });
        groupElements.unshift(React.createElement(
          GroupItem,
          { instance: group, groups: this.props.instances, stopwatches: ungroupedStopwatches, key: null, update: this.props.updateInstances, updateStopwatches: this.props.updateStopwatches },
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
    key: 'renderBlankState',
    value: function renderBlankState() {
      return React.createElement(
        'div',
        { className: 'empty text-align-center my-5' },
        React.createElement('i', { className: 'fad fa-ball-pile fa-9x' }),
        React.createElement(
          'p',
          { className: 'my-3' },
          'No groups created...yet.'
        ),
        React.createElement(
          'p',
          null,
          'Groups can be created in the Groups tab of the menu.'
        )
      );
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
          'Sorry, no matching groups.'
        )
      );
    }
  }, {
    key: 'render',
    value: function render() {
      if (!this.props.instances.length) {
        return this.renderBlankState();
      }

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

      if (sort.membership) {
        sortHandler = this.sortMembershipDesc;
        if (sort.membership.ascending) {
          sortHandler = this.sortMembershipAsc;
        }
      }

      if (sortHandler) {
        sortHandler(instances);
      }

      if (instances.length) {
        instanceViewElement = this.renderStopwatchesByGroup(instances);
      } else {
        instanceViewElement = this.renderEmptyResults();
      }

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

var GroupMenuView = function (_BaseMenuView) {
  _inherits(GroupMenuView, _BaseMenuView);

  function GroupMenuView(props) {
    _classCallCheck(this, GroupMenuView);

    var _this2 = _possibleConstructorReturn(this, (GroupMenuView.__proto__ || Object.getPrototypeOf(GroupMenuView)).call(this, props));

    _this2.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      membership: null
    };
    return _this2;
  }

  _createClass(GroupMenuView, [{
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
    key: 'renderSearch',
    value: function renderSearch() {
      return React.createElement(
        InputGroup,
        null,
        React.createElement(
          InputGroup.Text,
          { id: 'new-stopwatch' },
          React.createElement('i', { className: 'fad fa-search' })
        ),
        React.createElement(FormControl, { type: 'search', placeholder: 'Search Groups', onChange: this.searchChange.bind(this), className: 'me-2', 'aria-label': 'Search Groups' })
      );
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
          'Sorry, no matching groups.'
        )
      );
    }
  }, {
    key: 'deleteInstance',
    value: function deleteInstance(instance) {
      var _stopwatchAdapter4;

      _get(GroupMenuView.prototype.__proto__ || Object.getPrototypeOf(GroupMenuView.prototype), 'deleteInstance', this).call(this, instance);

      var self = this;
      stopwatchAdapter.delete(GROUPSTORE, instance.id).then(function () {
        self.props.stopwatches.splice(index, 1);
        self.props.updateInstances();
      });

      // delete group from stopwatches
      var groupStopwatches = [],
          instanceId = instance.id;
      for (var i = 0; i < this.props.stopwatches.length; i++) {
        var stopwatchInstance = this.props.stopwatches[i],
            groups = stopwatchInstance.groups,
            groupIndex = groups.indexOf(instanceId);
        if (groupIndex > -1) {
          groups.splice(groupIndex, 1);
          groupStopwatches.push(stopwatchInstance);
        }
      }
      (_stopwatchAdapter4 = stopwatchAdapter).update.apply(_stopwatchAdapter4, [STOPWATCHSTORE].concat(groupStopwatches));
    }
  }, {
    key: 'updateNew',
    value: function updateNew(event) {
      var newValue = event.target.value;

      var errorMessage = '';
      if (newValue) {
        if (newValue.toLowerCase() === 'ungrouped') {
          errorMessage = '"ungrouped" is a reserved group name.  Please use another';
        } else {
          for (var i = 0; i < this.props.instances.length; i++) {
            var item = this.props.instances[i];
            if (item.name === newValue) {
              errorMessage = 'Group "' + newValue + '" already exists. Enter a unique name';
              break;
            }
          }
        }
      } else {
        errorMessage = 'Group must have a name';
      }
      this.setState({ newName: newValue, errorMessage: errorMessage });
    }
  }, {
    key: 'createNew',
    value: function createNew(event) {
      if (this.state.errorMessage) {
        return;
      }

      if (!this.state.newName) {
        this.setState({ errorMessage: 'Group must have a name' });
      } else if (event.keyCode === 13) {
        var name = this.state.newName;

        // check if any groups exist with the specified name
        for (var i = 0; i < this.props.instances.length; i++) {
          var _item = this.props.instances[i];
          if (_item.name === name) {
            return;
          }
        }

        var metadata = { createdAt: new Date(), lastModified: new Date() },
            _item = { name: name, members: [], locked: false, visible: true, metadata: metadata },
            self = this;

        stopwatchAdapter.add(GROUPSTORE, _item).then(function (events) {
          _item.id = events[0].target.result;
          self.props.instances.push(_item);
          self.setState({ instances: self.props.instances, newName: '' });
        });
      }
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
    key: 'renderInstance',
    value: function renderInstance(instance) {
      var id = instance.id,
          name = instance.name,
          isSelected = this.state.group.selected && this.state.group.selected.indexOf(instance) > -1,
          element = React.createElement(
        Item,
        { active: isSelected, key: id, onClick: this.toggleSelect.bind(this, instance), className: 'd-flex justify-content-between align-items-start' },
        React.createElement(
          'div',
          { className: 'ms-2 me-auto' },
          name
        ),
        React.createElement(
          Badge,
          { variant: 'primary', pill: true },
          instance.members.length
        )
      );
      return element;
    }
  }, {
    key: 'renderCreateNew',
    value: function renderCreateNew() {
      var errorElement;
      if (this.state.errorMessage) {
        errorElement = React.createElement(
          Form.Control.Feedback,
          { type: 'invalid' },
          this.state.errorMessage
        );
      }
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          InputGroup,
          { className: 'mb-3', hasValidation: true },
          React.createElement(
            InputGroup.Text,
            { id: 'new-group' },
            React.createElement('i', { className: 'fad fa-plus' })
          ),
          React.createElement(FormControl, {
            placeholder: 'Group Name',
            'aria-label': 'new group',
            'aria-describedby': 'new-group',
            value: this.state.newName,
            onKeyDown: this.createNew.bind(this),
            onChange: this.updateNew.bind(this),
            minLength: '1',
            isInvalid: !!this.state.errorMessage
          }),
          errorElement
        )
      );
    }
  }]);

  return GroupMenuView;
}(BaseMenuView);