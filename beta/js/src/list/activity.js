class ActivityContainerView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      query: '',
      types: [],
      instances: []
    }
  }

  renderInstanceFilter(instance, key) {
    const active = this.state.instances.indexOf(instance) > -1,
      func = function() {
        const index = this.state.instances.indexOf(instance),
              isInFilter = index > -1;
        if (isInFilter) {
          this.state.instances.splice(index, 1);
        } else {
          this.state.instances.push(instance);
        }
        this.setState({instances: this.state.instances});
      }.bind(this);

    return <Dropdown.Item key={key} active={active} onClick={func}>{instance}</Dropdown.Item >;
  }

  renderInstanceFilters() {
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
      output = <DropdownButton className='my-3' variant='outline-secondary' title='Stopwatch Instances'>
            {elements}
          </DropdownButton>;
    }
    return output;
  }

  renderTypeFilter(type, key) {
    const active = this.state.types.indexOf(type) > -1,
      func = function() {
        const index = this.state.types.indexOf(type),
              isInFilter = index > -1;
        if (isInFilter) {
          this.state.types.splice(index, 1);
        } else {
          this.state.types.push(type);
        }
        this.setState({types: this.state.types});
      }.bind(this);

    return <Dropdown.Item key={key} active={active} onClick={func}>{type}</Dropdown.Item>;
  }

  renderTypeFilters() {
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
      output = <DropdownButton className='my-3' variant='outline-secondary' title='Activity Types'>
            {elements}
          </DropdownButton>;
    }

    return output;
  }

  renderBlankState() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-stopwatch fa-9x'></i>

      <p className='my-3'>No activity yet. Create a stopwatch to get started!</p>

    </div>
  }

  renderEmptyResults() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-frown-open fa-9x'></i>

      <p className='my-3'>Sorry, no matching activity.</p>
    </div>
  }

  renderList(instances) {
    var items = [];
    for (var i = 0; i < instances.length; i++) {
      var activity = instances[i],
          timestamp = `${activity.timestamp.toLocaleDateString()} ${activity.timestamp.toLocaleTimeString()}`,
          instance = activity.instance ? <div>{activity.instance}</div> : '',
          element = <Item key={i} className="d-flex justify-content-between align-items-start">
            <div className="me-2 me-auto text-align-left align-self-center">
              <div className="fw-bold">{activity.type}</div>
              <div className='mb-1'>{activity.description}</div>
            </div>
            <div className='ms-1 text-align-right align-self-center'>
              <div className='fw-bold'>{timestamp}</div>
              {instance}
            </div>
          </Item>;
      items.push(element);
    }
    return <ListGroup className='activity-list'>
      {items}
    </ListGroup>;
  }

  isMatch(instance) {
    const typeMatch = !this.state.types.length || this.state.types.indexOf(instance.type) > -1,
          instanceMatch = !this.state.instances.length || this.state.instances.indexOf(instance.instance) > -1;
    return typeMatch && instanceMatch;
  }

  render() {
    const typeControlsElement = this.renderTypeFilters(),
          instanceControlsElement = this.renderInstanceFilters();

    var instances = this.props.instances.filter(this.isMatch.bind(this)),
        resultsElement;

    if (instances.length) {
      instances.sort(function(a, b) {
        return b.timestamp - a.timestamp;
      });
      resultsElement = this.renderList(instances);
    } else if (!this.props.instances.length) {
      resultsElement = this.renderBlankState();
    } else if (this.props.instances.length && !instances.length) {
      resultsElement = this.renderEmptyResults();
    }

    return <div className={this.props.className}>
      {typeControlsElement}
      {instanceControlsElement}
      {resultsElement}
    </div>
  }
}
