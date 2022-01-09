var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var BaseContainer = function (_React$Component) {
  _inherits(BaseContainer, _React$Component);

  function BaseContainer() {
    _classCallCheck(this, BaseContainer);

    return _possibleConstructorReturn(this, (BaseContainer.__proto__ || Object.getPrototypeOf(BaseContainer)).apply(this, arguments));
  }

  _createClass(BaseContainer, [{
    key: 'toggleLock',
    value: function toggleLock(instance) {
      var newState = !stopwatch.locked;
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
        name: newVerb,
        description: '',
        timestamp: new Date()
      };
      instance.activity.unshift(activity);
      instance.locked = true;
      this.setState({ stopwatches: this.state.stopwatches });
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
      this.setState({ stopwatches: this.state.stopwatches });
    }
  }, {
    key: 'lockSelected',
    value: function lockSelected() {
      for (var i = 0; i < this.state.stopwatches.length; i++) {
        var item = this.state.stopwatches[i];
        if (item.selected) {
          this.lock(item);
        }
      }
      this.setState({ stopwatches: this.state.stopwatches });
    }
  }, {
    key: 'unlockSelected',
    value: function unlockSelected() {
      for (var i = 0; i < this.state.stopwatches.length; i++) {
        var item = this.state.stopwatches[i];
        if (item.selected) {
          this.unlock(item);
        }
      }
      this.setState({ stopwatches: this.state.stopwatches });
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
      this.setState({ stopwatches: this.state.stopwatches });
    }
  }, {
    key: 'showSelected',
    value: function showSelected() {
      for (var i = 0; i < this.state.stopwatches.length; i++) {
        var item = this.state.stopwatches[i];
        if (item.selected) {
          this.show(item);
        }
      }
      this.setState({ stopwatches: this.state.stopwatches });
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
      this.setState({ stopwatches: this.state.stopwatches });
    }
  }, {
    key: 'hideSelected',
    value: function hideSelected() {
      for (var i = 0; i < this.state.stopwatches.length; i++) {
        var item = this.state.stopwatches[i];
        if (item.selected) {
          this.hide(item);
        }
      }
      this.setState({ stopwatches: this.state.stopwatches });
    }
  }]);

  return BaseContainer;
}(React.Component);