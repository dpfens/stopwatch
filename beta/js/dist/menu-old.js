var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var ListGroup = ReactBootstrap.ListGroup,
    Item = ListGroup.Item,
    InputGroup = ReactBootstrap.InputGroup,
    FormControl = ReactBootstrap.FormControl;

var Menu = function (_React$Component) {
  _inherits(Menu, _React$Component);

  function Menu(props) {
    _classCallCheck(this, Menu);

    var _this = _possibleConstructorReturn(this, (Menu.__proto__ || Object.getPrototypeOf(Menu)).call(this, props));

    _this.state = {
      filter: '',
      maintenance: false,
      newName: '',
      group: {
        selected: []
      }
    };
    _this.handleChangeSearch = _this.handleChangeSearch.bind(_this);
    _this.toggleMaintainance = _this.toggleMaintainance.bind(_this);
    _this.deleteItem = _this.deleteItem.bind(_this);
    _this.updateNew = _this.updateNew.bind(_this);
    return _this;
  }

  _createClass(Menu, [{
    key: 'updateNew',
    value: function updateNew(event) {
      this.setState({ newName: event.target.value });
    }
  }, {
    key: 'handleChangeSearch',
    value: function handleChangeSearch(event) {
      this.setState({ filter: event.target.value });
    }
  }, {
    key: 'toggleSelect',
    value: function toggleSelect(item) {
      var isSelected = item.selected;
      item.selected = !isSelected;
      this.setState({ items: this.props.items });
      this.props.updatestopwatches();
    }
  }, {
    key: 'toggleMaintainance',
    value: function toggleMaintainance() {
      var newMaintenanceState = !this.state.maintenance;
      if (newMaintenanceState) {
        for (var i = 0; i < this.props.items.length; i++) {
          this.props.items[i].selected = false;
        }
      }
      this.setState({ maintenance: newMaintenanceState, items: this.props.items });
    }
  }, {
    key: 'deleteItem',
    value: function deleteItem(item) {
      var index = this.props.items.indexOf(item);
      if (index > -1) {
        this.props.items.splice(index, 1);
      }
      this.setState({ items: this.props.items });
      this.props.updatestopwatches();
    }
  }, {
    key: 'filterItems',
    value: function filterItems() {
      var items = [],
          nameProperty = this.props.name;
      for (var i = 0; i < this.props.items.length; i++) {
        var item = this.props.items[i],
            id = item.id,
            name = item[nameProperty],
            lockElement = item.locked ? React.createElement('i', { className: 'fad fa-lock' }) : React.createElement('i', { className: 'fad fa-lock-open' }),
            visibleElement = item.visible ? React.createElement('i', { className: 'fad fa-eye' }) : React.createElement('i', { className: 'fad fa-eye-slash' });
        isSelected = item.selected, element = React.createElement(
          Item,
          { active: isSelected, onClick: this.toggleSelect.bind(this, item), key: id },
          visibleElement,
          ' ',
          lockElement,
          ' ',
          name
        );
        if (this.state.maintenance) {
          element = React.createElement(
            Item,
            { active: isSelected, key: id },
            name,
            ' ',
            React.createElement(
              Button,
              { variant: 'outline-danger', onClick: this.deleteItem.bind(this, item) },
              React.createElement('i', { className: 'fad fa-trash' })
            )
          );
        }
        if (this.state.filter && name.indexOf(this.state.filter) === -1) {
          continue;
        }
        items.push(element);
      }
      return items;
    }
  }, {
    key: 'buildBaseControls',
    value: function buildBaseControls() {
      var inputGroupElement = React.createElement(
        InputGroup,
        { className: 'mb-3' },
        React.createElement(
          InputGroup.Text,
          { id: 'search-stopwatch' },
          React.createElement('i', { className: 'fad fa-search' })
        ),
        React.createElement(FormControl, {
          placeholder: 'Search',
          'aria-label': 'search stopwatch',
          'aria-describedby': 'search-stopwatch',
          value: this.state.filter,
          onChange: this.handleChangeSearch
        }),
        React.createElement(
          Button,
          { variant: 'outline-secondary', id: 'button-addon2', onClick: this.toggleMaintainance },
          React.createElement('i', { className: 'fad fa-cog fa-spin' })
        )
      );

      if (this.state.maintenance) {
        inputGroupElement = React.createElement(
          InputGroup,
          { className: 'mb-3' },
          React.createElement(
            InputGroup.Text,
            { id: 'search-stopwatch' },
            React.createElement('i', { className: 'fad fa-search' })
          ),
          React.createElement(FormControl, {
            placeholder: 'Search',
            'aria-label': 'search stopwatch',
            'aria-describedby': 'search-stopwatch',
            value: this.state.filter,
            onChange: this.handleChangeSearch
          }),
          React.createElement(
            Button,
            { variant: 'outline-secondary', id: 'button-addon2', onClick: this.toggleMaintainance },
            React.createElement(
              'span',
              { className: 'fa-stack' },
              React.createElement('i', { className: 'fad fa-cog fa-spin fa-stack-1x' }),
              React.createElement('i', { className: 'fad fa-slash fa-stack-1x' })
            )
          )
        );
      }
      return inputGroupElement;
    }
  }, {
    key: 'render',
    value: function render() {
      var items = this.filterItems();

      var itemListElement = React.createElement(
        ListGroup,
        null,
        items
      );

      var actionsElement = this.props.actions;

      var inputGroupElement,
          sortActionElements = '';
      if (this.props.items.length) {
        inputGroupElement = this.buildBaseControls();
        sortActionElements = this.props.sortActions;
      }

      return React.createElement(
        'div',
        null,
        inputGroupElement,
        actionsElement,
        sortActionElements,
        itemListElement,
        React.createElement(
          InputGroup,
          { className: 'mb-3' },
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
            onKeyDown: this.createNew,
            onChange: this.updateNew,
            minLength: '1'
          })
        )
      );
    }
  }]);

  return Menu;
}(React.Component);

var GroupMenu = function (_Menu) {
  _inherits(GroupMenu, _Menu);

  function GroupMenu(props) {
    _classCallCheck(this, GroupMenu);

    var _this2 = _possibleConstructorReturn(this, (GroupMenu.__proto__ || Object.getPrototypeOf(GroupMenu)).call(this, props));

    _this2.state.newName = '';
    _this2.createNew = _this2.createNew.bind(_this2);
    _this2.updateNew = _this2.updateNew.bind(_this2);
    return _this2;
  }

  _createClass(GroupMenu, [{
    key: 'createNew',
    value: function createNew(event) {
      if (event.keyCode === 13) {
        var name = this.state.newName;

        // check if any groups exist with the specified name
        for (var i = 0; i < this.props.items.length; i++) {
          var _item = this.props.items[i];
          if (_item.name === name) {
            return;
          }
        }

        var metadata = { createdAt: new Date(), lastModified: new Date() };
        var _item = { name: name, members: [], locked: false, visible: true, metadata: metadata, id: name };
        this.props.items.push(_item);
        this.setState({ items: this.props.items, newName: '' });
      }
    }
  }, {
    key: 'updateNew',
    value: function updateNew(event) {
      this.setState({ newName: event.target.value });
    }
  }, {
    key: 'deleteItem',
    value: function deleteItem(item) {
      _get(GroupMenu.prototype.__proto__ || Object.getPrototypeOf(GroupMenu.prototype), 'deleteItem', this).call(this, item);
      var groupName = item.name,
          stopwatches = this.props.stopwatches;
      for (var i = 0; i < stopwatches.length; i++) {
        var instance = stopwatches[i],
            groupIndex = instance.groups.indexOf(groupName),
            isMember = groupIndex > -1;
        if (isMember) {
          instance.groups.splice(groupIndex, 1);
        }
      }
      this.setState({ groups: this.state.groups });
      this.props.updatestopwatches();
    }
  }, {
    key: 'render',
    value: function render() {
      var items = this.filterItems();

      var itemListElement = React.createElement(
        ListGroup,
        null,
        items
      );

      var actionsElement = '',
          anySelectedItems = false;
      for (var i = 0; i < this.props.items.length; i++) {
        var item = this.props.items[i];
        if (item.selected) {
          anySelectedItems = true;
          break;
        }
      }
      if (anySelectedItems) {
        actionsElement = this.props.actions;
      }

      var inputGroupElement,
          sortActionElements = '';
      if (this.props.items.length) {
        inputGroupElement = this.buildBaseControls();
        sortActionElements = this.props.sortActions;
      }

      return React.createElement(
        'div',
        null,
        inputGroupElement,
        actionsElement,
        sortActionElements,
        itemListElement,
        React.createElement(
          InputGroup,
          { className: 'mb-3' },
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
            onKeyDown: this.createNew,
            onChange: this.updateNew,
            minLength: '1'
          })
        )
      );
    }
  }]);

  return GroupMenu;
}(Menu);