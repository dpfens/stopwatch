var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ActivityContainerView = function (_React$Component) {
  _inherits(ActivityContainerView, _React$Component);

  function ActivityContainerView(props) {
    _classCallCheck(this, ActivityContainerView);

    var _this = _possibleConstructorReturn(this, (ActivityContainerView.__proto__ || Object.getPrototypeOf(ActivityContainerView)).call(this, props));

    _this.state = {
      query: '',
      types: [],
      instances: []
    };
    return _this;
  }

  _createClass(ActivityContainerView, [{
    key: 'renderInstanceFilter',
    value: function renderInstanceFilter(instance, key) {
      var active = this.state.instances.indexOf(instance) > -1,
          func = function () {
        var index = this.state.instances.indexOf(instance),
            isInFilter = index > -1;
        if (isInFilter) {
          this.state.instances.splice(index, 1);
        } else {
          this.state.instances.push(instance);
        }
        this.setState({ instances: this.state.instances });
      }.bind(this);

      return React.createElement(
        Dropdown.Item,
        { key: key, active: active, onClick: func },
        instance
      );
    }
  }, {
    key: 'renderInstanceFilters',
    value: function renderInstanceFilters() {
      var eligibleInstances = [];

      var instances = this.props.instances;
      for (var i = 0; i < instances.length; i++) {
        var instance = instances[i].instance;
        if (instance && eligibleInstances.indexOf(instance) === -1) {
          eligibleInstances.push(instance);
        }
      }

      var output = '';
      if (eligibleInstances.length > 1) {
        eligibleInstances.sort();
        var elements = [];
        for (var i = 0; i < eligibleInstances.length; i++) {
          var instance = eligibleInstances[i],
              element = this.renderInstanceFilter(instance, i);
          elements.push(element);
        }
        output = React.createElement(
          DropdownButton,
          { className: 'my-3', variant: 'outline-secondary', title: 'Stopwatch Instances' },
          elements
        );
      }
      return output;
    }
  }, {
    key: 'renderTypeFilter',
    value: function renderTypeFilter(type, key) {
      var active = this.state.types.indexOf(type) > -1,
          func = function () {
        var index = this.state.types.indexOf(type),
            isInFilter = index > -1;
        if (isInFilter) {
          this.state.types.splice(index, 1);
        } else {
          this.state.types.push(type);
        }
        this.setState({ types: this.state.types });
      }.bind(this);

      return React.createElement(
        Dropdown.Item,
        { key: key, active: active, onClick: func },
        type
      );
    }
  }, {
    key: 'renderTypeFilters',
    value: function renderTypeFilters() {
      var eligibleTypes = this.props.types || [];

      if (!eligibleTypes.length) {
        var instances = this.props.instances;
        for (var i = 0; i < instances.length; i++) {
          var type = instances[i].type;
          if (eligibleTypes.indexOf(type) === -1) {
            eligibleTypes.push(type);
          }
        }
      }

      var output = '';
      if (eligibleTypes.length > 1) {
        eligibleTypes.sort();
        var elements = [];
        for (var i = 0; i < eligibleTypes.length; i++) {
          var type = eligibleTypes[i],
              element = this.renderTypeFilter(type, i);
          elements.push(element);
        }
        output = React.createElement(
          DropdownButton,
          { className: 'my-3', variant: 'outline-secondary', title: 'Activity Types' },
          elements
        );
      }

      return output;
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
          'No activity yet. Create a stopwatch to get started!'
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
          'Sorry, no matching activity.'
        )
      );
    }
  }, {
    key: 'renderList',
    value: function renderList(instances) {
      var items = [];
      for (var i = 0; i < instances.length; i++) {
        var activity = instances[i],
            timestamp = activity.timestamp.toLocaleDateString() + ' ' + activity.timestamp.toLocaleTimeString(),
            instance = activity.instance ? React.createElement(
          'div',
          null,
          activity.instance
        ) : '',
            element = React.createElement(
          Item,
          { key: i, className: 'd-flex justify-content-between align-items-start' },
          React.createElement(
            'div',
            { className: 'me-2 me-auto text-align-left align-self-center' },
            React.createElement(
              'div',
              { className: 'fw-bold' },
              activity.type
            ),
            React.createElement(
              'div',
              { className: 'mb-1' },
              activity.description
            )
          ),
          React.createElement(
            'div',
            { className: 'ms-1 text-align-right align-self-center' },
            React.createElement(
              'div',
              { className: 'fw-bold' },
              timestamp
            ),
            instance
          )
        );
        items.push(element);
      }
      return React.createElement(
        ListGroup,
        { className: 'activity-list' },
        items
      );
    }
  }, {
    key: 'isMatch',
    value: function isMatch(instance) {
      var typeMatch = !this.state.types.length || this.state.types.indexOf(instance.type) > -1,
          instanceMatch = !this.state.instances.length || this.state.instances.indexOf(instance.instance) > -1;
      return typeMatch && instanceMatch;
    }
  }, {
    key: 'render',
    value: function render() {
      var typeControlsElement = this.renderTypeFilters(),
          instanceControlsElement = this.renderInstanceFilters();

      var instances = this.props.instances.filter(this.isMatch.bind(this)),
          resultsElement;

      if (instances.length) {
        instances.sort(function (a, b) {
          return b.timestamp - a.timestamp;
        });
        resultsElement = this.renderList(instances);
      } else if (!this.props.instances.length) {
        resultsElement = this.renderBlankState();
      } else if (this.props.instances.length && !instances.length) {
        resultsElement = this.renderEmptyResults();
      }

      return React.createElement(
        'div',
        { className: this.props.className },
        typeControlsElement,
        instanceControlsElement,
        resultsElement
      );
    }
  }]);

  return ActivityContainerView;
}(React.Component);