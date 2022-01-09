var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var GroupItem = function (_React$Component) {
  _inherits(GroupItem, _React$Component);

  function GroupItem(props) {
    _classCallCheck(this, GroupItem);

    var _this = _possibleConstructorReturn(this, (GroupItem.__proto__ || Object.getPrototypeOf(GroupItem)).call(this, props));

    _this.state = {
      edit: false,
      newName: _this.props.instance.name,
      errorMessage: ''
    };
    return _this;
  }

  _createClass(GroupItem, [{
    key: 'edit',
    value: function edit() {
      this.setState({ edit: true });
      this.props.update();
    }
  }, {
    key: 'stopEditing',
    value: function stopEditing() {
      if (!this.state.errorMessage) {
        this.setState({ edit: false });
        var oldName = this.props.instance.name;

        this.props.instance.name = this.state.newName;
        var self = this;
        stopwatchAdapter.update(GROUPSTORE, this.props.instance).then(function (events) {
          self.props.update();
        });
      } else {
        this.setState({ newName: this.props.instance.name, edit: false });
      }
    }
  }, {
    key: 'handleNameChange',
    value: function handleNameChange(event) {
      var newValue = event.target.value;

      var errorMessage = '';
      if (newValue) {
        if (newValue.toLowerCase() === 'ungrouped') {
          errorMessage = '"ungrouped" is a reserved group name.  Please use another';
        } else {
          for (var i = 0; i < this.props.instances.length; i++) {
            var item = this.props.instances[i];
            if (item.name === newValue && item !== this.props.instance) {
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
    key: 'render',
    value: function render() {
      var _this2 = this;

      var instance = this.props.instance,
          stopwatches = this.props.stopwatches,
          editElement = this.props.edit ? React.createElement(
        Button,
        { variant: 'outline-secondary', title: 'Edit', onClick: this.edit.bind(this, instance) },
        React.createElement('i', { className: 'fad fa-edit fa-1x' })
      ) : '',
          deleteElement = this.props.deleteInstance ? React.createElement(
        Dropdown.Item,
        { variant: 'danger', onClick: function onClick() {
            return _this2.props.deleteInstance(instance);
          } },
        React.createElement('i', { className: 'fad fa-trash fa-1x' }),
        ' Delete'
      ) : '',
          moreActionsIcon = React.createElement('i', { className: 'fad fa-ellipsis-v' });

      var dropdownElement = '';
      if (deleteElement) {
        dropdownElement = React.createElement(
          DropdownButton,
          { variant: 'outline-secondary', align: 'end', title: moreActionsIcon },
          deleteElement
        );
      }
      var className = this.state.edit ? 'mb-3 group-instance flippable flippable-v flipped' : 'mb-3 group-instance flippable flippable-h';
      if (this.props.className) {
        className += ' ' + this.props.className;
      }

      var errorElement;
      if (this.state.errorMessage) {
        errorElement = React.createElement(
          Form.Control.Feedback,
          { type: 'invalid' },
          this.state.errorMessage
        );
      }
      return React.createElement(
        'div',
        { className: className },
        React.createElement(
          'div',
          { className: 'front' },
          React.createElement(
            Row,
            null,
            React.createElement(
              Col,
              null,
              React.createElement(
                'h3',
                null,
                instance.name
              )
            ),
            React.createElement(
              Col,
              { className: 'text-align-right' },
              React.createElement(
                ButtonGroup,
                null,
                editElement,
                dropdownElement
              )
            )
          ),
          this.props.children
        ),
        React.createElement(
          'div',
          { className: 'back' },
          React.createElement(
            Container,
            { fluid: true },
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
                    value: this.state.newName,
                    onChange: this.handleNameChange.bind(this),
                    isInvalid: !!this.state.errorMessage
                  }),
                  errorElement
                )
              )
            )
          )
        )
      );
    }
  }]);

  return GroupItem;
}(React.Component);