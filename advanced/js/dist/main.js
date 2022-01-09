var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Container = ReactBootstrap.Container,
    Row = ReactBootstrap.Row,
    Col = ReactBootstrap.Col,
    Grid = ReactBootstrap.Grid,
    Nav = ReactBootstrap.Nav,
    Navbar = ReactBootstrap.Navbar,
    NavDropdown = ReactBootstrap.NavDropdown,
    ButtonGroup = ReactBootstrap.ButtonGroup,
    Button = ReactBootstrap.Button,
    Offcanvas = ReactBootstrap.Offcanvas,
    Tabs = ReactBootstrap.Tabs,
    Tab = ReactBootstrap.Tab,
    Badge = ReactBootstrap.Badge,
    DropdownButton = ReactBootstrap.DropdownButton,
    Dropdown = ReactBootstrap.Dropdown;

var App = function (_React$Component) {
  _inherits(App, _React$Component);

  function App(props) {
    _classCallCheck(this, App);

    var _this = _possibleConstructorReturn(this, (App.__proto__ || Object.getPrototypeOf(App)).call(this, props));

    _this.state = {
      groups: [],
      stopwatches: [],
      showMenu: false,
      showActivityTab: false,
      activity: []
    };
    _this.closeMenu = _this.closeMenu.bind(_this);
    _this.openMenu = _this.openMenu.bind(_this);

    _this.closeActivityTab = _this.closeActivityTab.bind(_this);
    _this.openActivityTab = _this.openActivityTab.bind(_this);
    _this.updateStopwatches = _this.updateStopwatches.bind(_this);
    return _this;
  }

  _createClass(App, [{
    key: 'openMenu',
    value: function openMenu() {
      this.setState({ showMenu: true });
    }
  }, {
    key: 'closeMenu',
    value: function closeMenu() {
      this.setState({ showMenu: false });
    }
  }, {
    key: 'openActivityTab',
    value: function openActivityTab() {
      this.setState({ showActivityTab: true });
    }
  }, {
    key: 'closeActivityTab',
    value: function closeActivityTab() {
      this.setState({ showActivityTab: false });
    }
  }, {
    key: 'updateStopwatches',
    value: function updateStopwatches() {
      this.setState({ stopwatches: this.state.stopwatches });
    }
  }, {
    key: 'updateGroups',
    value: function updateGroups() {
      this.setState({ groups: this.state.groups });
    }
  }, {
    key: 'deleteStopwatch',
    value: function deleteStopwatch(instance) {
      var _stopwatchAdapter;

      var index = this.state.stopwatches.indexOf(instance);
      this.state.stopwatches.splice(index, 1);

      var groupsToUpdate = [];
      for (var i = 0; i < this.state.groups.length; i++) {
        var group = this.state.groups[i],
            memberIndex = group.members.indexOf(instance.id),
            isMember = memberIndex > -1;
        if (isMember) {
          group.members.splice(memberIndex, 1);
          groupsToUpdate.push(group);
        }
      }

      var self = this;

      deletePromise = stopwatchAdapter.delete(STOPWATCHSTORE, instance.id);
      groupUpdatePromise = (_stopwatchAdapter = stopwatchAdapter).update.apply(_stopwatchAdapter, [GROUPSTORE].concat(groupsToUpdate));
      Promise.all([deletePromise, groupUpdatePromise]).then(function () {
        if (instance.groups.length) {
          self.setState({ stopwatches: self.state.stopwatches, groups: self.state.groups });
        } else {
          self.setState({ stopwatches: self.state.stopwatches });
        }
      });
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
        var _stopwatchAdapter2;

        var newId = events[0].target.result;
        newItem.id = newId;
        self.state.stopwatches.push(newItem);

        // assign groups
        var updatedGroups = [];
        for (var i = 0; i < newItem.groups.length; i++) {
          var groupId = newItem.groups[i];
          for (var j = 0; j < this.state.groups.length; j++) {
            var potentialGroup = this.state.groups[j];
            if (potentialGroup.id === groupId) {
              potentialGroup.members.push(newItem.id);
              updatedGroups.push(potentialGroup);
              break;
            }
          }
        }

        (_stopwatchAdapter2 = stopwatchAdapter).update.apply(_stopwatchAdapter2, [GROUPSTORE].concat(updatedGroups)).then(function (event) {
          self.setState({ groups: self.state.groups, stopwatches: self.state.stopwatches });
        });
      });
    }
  }, {
    key: 'aggregateActivityLog',
    value: function aggregateActivityLog() {
      var stopwatches = this.state.stopwatches,
          aggregateActivities = [];
      for (var i = 0; i < stopwatches.length; i++) {
        var instance = stopwatches[i],
            name = instance.name;
        for (var j = 0; j < instance.activity.length; j++) {
          var activity = instance.activity[j],
              newActivity = { instance: name };
          for (var key in activity) {
            newActivity[key] = activity[key];
          }
          aggregateActivities.push(newActivity);
        }
      }

      return aggregateActivities;
    }
  }, {
    key: 'render',
    value: function render() {

      var aggregateActivities = this.aggregateActivityLog(),
          activityListElement = React.createElement(ActivityContainerView, { instances: aggregateActivities }),
          groupTabTitle = React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'span',
          null,
          'Groups'
        ),
        ' ',
        React.createElement(
          Badge,
          { pill: true },
          this.state.groups.length
        )
      ),
          groupViewElement = React.createElement(GroupContainerView, { instances: this.state.groups, stopwatches: this.state.stopwatches, updateInstances: this.updateGroups.bind(this), updateStopwatches: this.updateStopwatches.bind(this) }),
          stopwatchTabTitle = React.createElement(
        React.Fragment,
        null,
        React.createElement(
          'span',
          null,
          'Stopwatches'
        ),
        ' ',
        React.createElement(
          Badge,
          { pill: true },
          this.state.stopwatches.length
        )
      ),
          stopwatchViewElement = React.createElement(StopwatchContainerView, { instances: this.state.stopwatches, groups: this.state.groups, updateInstances: this.updateStopwatches.bind(this), deleteInstance: this.deleteStopwatch.bind(this), addButton: true, clone: true, 'delete': true, select: true });
      return React.createElement(
        ThemeContext.Provider,
        { value: themes.light },
        React.createElement(
          Container,
          { fluid: true },
          React.createElement(
            Navbar,
            { bg: 'light', variant: 'light', expand: 'sm' },
            React.createElement(
              Button,
              { variant: 'light', onClick: this.openMenu, className: 'me-2' },
              React.createElement('i', { className: 'fad fa-bars fa-lg' })
            ),
            React.createElement(
              Navbar.Brand,
              { href: '#home' },
              'Multi-Stopwatch'
            ),
            React.createElement(Nav, { className: 'me-auto' }),
            React.createElement(
              Nav,
              null,
              React.createElement(
                ButtonGroup,
                null,
                React.createElement(
                  Button,
                  { variant: 'outline-secondary', onClick: this.openActivityTab },
                  React.createElement('i', { className: 'fad fa-clipboard-list fa-lg' })
                )
              )
            )
          ),
          React.createElement(
            Tabs,
            { defaultActiveKey: 'stopwatches', id: 'uncontrolled-tab-example', className: 'mb-3' },
            React.createElement(
              Tab,
              { eventKey: 'groups', title: groupTabTitle },
              groupViewElement
            ),
            React.createElement(
              Tab,
              { eventKey: 'stopwatches', title: stopwatchTabTitle },
              stopwatchViewElement
            )
          )
        ),
        React.createElement(
          Offcanvas,
          { show: this.state.showMenu, onHide: this.closeMenu, placement: 'start' },
          React.createElement(
            Offcanvas.Header,
            { closeButton: true },
            React.createElement(
              Offcanvas.Title,
              null,
              'Menu'
            )
          ),
          React.createElement(
            Offcanvas.Body,
            null,
            React.createElement(
              Tabs,
              { defaultActiveKey: 'stopwatches', className: 'mb-3' },
              React.createElement(
                Tab,
                { eventKey: 'groups', title: groupTabTitle },
                React.createElement(GroupMenuView, { instances: this.state.groups, stopwatches: this.state.stopwtches })
              ),
              React.createElement(
                Tab,
                { eventKey: 'stopwatches', title: stopwatchTabTitle },
                React.createElement(StopwatchMenuView, { instances: this.state.stopwatches, groups: this.state.groups, updateInstances: this.updateStopwatches.bind(this), deleteInstance: this.deleteStopwatch.bind(this), clone: true, 'delete': true, select: true })
              )
            )
          )
        ),
        React.createElement(
          Offcanvas,
          { show: this.state.showActivityTab, onHide: this.closeActivityTab, placement: 'end' },
          React.createElement(
            Offcanvas.Header,
            { closeButton: true },
            React.createElement(
              Offcanvas.Title,
              null,
              'All Activity'
            )
          ),
          React.createElement(
            Offcanvas.Body,
            null,
            activityListElement
          )
        )
      );
    }
  }, {
    key: 'componentDidMount',
    value: function componentDidMount() {
      var self = this,
          stopwatchPromise = stopwatchAdapter.getAll(STOPWATCHSTORE),
          groupPromise = stopwatchAdapter.getAll(GROUPSTORE);
      Promise.all([stopwatchPromise, groupPromise]).then(function (results) {
        var stopwatches = results[0],
            groups = results[1];

        for (var i = 0; i < stopwatches.length; i++) {
          var instance = stopwatches[i];
          if (isV1Instance(instance)) {
            convertFromV1(instance);
          }
          stopwatches[i] = stopwatchFromObject(instance);
        }
        self.setState({ stopwatches: stopwatches, groups: groups });
      });
    }
  }]);

  return App;
}(React.Component);

var stopwatches = [];

ReactDOM.render(React.createElement(App, { stopwatches: stopwatches }), document.getElementById('app'));