var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Form = ReactBootstrap.Form;

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
      },
      group: {
        mode: false,
        selected: []
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

var BaseMenuView = function (_BaseContainerView) {
  _inherits(BaseMenuView, _BaseContainerView);

  function BaseMenuView(props) {
    _classCallCheck(this, BaseMenuView);

    var _this2 = _possibleConstructorReturn(this, (BaseMenuView.__proto__ || Object.getPrototypeOf(BaseMenuView)).call(this, props));

    _this2.state.newName = '';
    _this2.state.errorMessage = '';
    return _this2;
  }

  _createClass(BaseMenuView, [{
    key: 'isMatch',
    value: function isMatch(instance) {
      var search = this.state.search,
          query = search.query,
          name = instance.name,
          isNameMatch = name.indexOf(query) > -1;
      return isNameMatch;
    }
  }, {
    key: 'toggleSelect',
    value: function toggleSelect(instance) {
      var selected = this.state.group.selected,
          index = selected.indexOf(instance),
          isSelected = index > -1;
      if (isSelected) {
        selected.splice(index, 1);
      } else {
        selected.push(instance);
      }
      this.setState({ selected: selected });
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
    key: 'updateNew',
    value: function updateNew(event) {
      this.setState({ newName: event.target.value });
    }
  }, {
    key: 'sortInstances',
    value: function sortInstances(instances) {
      sort = this.state.sort;
      var sortHandler;
      if (sort.alphabetical) {
        sortHandler = this.sortAlphabeticalDesc;
        if (sort.alphabetical.ascending) {
          sortHandler = this.sortAlphabeticalAsc;
        }
      }

      if (sortHandler) {
        sortHandler(instances);
      }

      return instances;
    }
  }, {
    key: 'renderBulkControls',
    value: function renderBulkControls() {
      return React.createElement(
        InputGroup,
        { className: 'my-3' },
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
          isSelected = this.state.group.selected && this.state.group.selected.indexOf(instance) > -1,
          element = React.createElement(
        Item,
        { active: isSelected, key: id, onClick: this.toggleSelect.bind(this, instance) },
        name
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
        ),
        errorElement
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
      var sortControls = this.props.instances.length ? this.renderSortControls() : '',
          searchElement = this.props.instances.length ? this.renderSearch() : '',
          createNewElement = this.renderCreateNew();

      if (this.props.instances.length && !instances.length) {
        stopwatchViewElement = this.renderEmptyResults();
      } else {
        stopwatchViewElement = React.createElement(
          ListGroup,
          { className: 'mt-3' },
          listElements
        );
      }

      var bulkControls;
      if (this.state.group.selected.length) {
        bulkControls = this.renderBulkControls();
      }

      var className = this.props.className ? 'menu-container ' + this.props.className : 'menu-container';
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
        createNewElement
      );
    }
  }]);

  return BaseMenuView;
}(BaseContainerView);