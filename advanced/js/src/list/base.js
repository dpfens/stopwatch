const Form = ReactBootstrap.Form;

class BaseContainerView extends React.Component {
  static contextType = ThemeContext;

  constructor(props) {
    super(props);
    this.state = {
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

    this.sortAlphabeticalAsc = this.sortAlphabeticalAsc.bind(this);
    this.sortAlphabeticalDesc = this.sortAlphabeticalDesc.bind(this);
  }

  deleteInstance(instance) {
    const index = this.props.instances.indexOf(instance);
    this.props.instances.splice(index, 1);
    this.props.updateInstances();
  }

  viewInList() {
    this.setState({viewType: 'list'});
  }

  viewInGrid() {
    this.setState({viewType: 'grid'});
  }

  searchChange(event) {
    const query = event.target.value
    this.state.search.query = query;
    this.setState({search: this.state.search});
  }

  toggleLockFilter() {
    this.state.search.lock.locked = !this.state.search.lock.locked;
    this.state.search.lock.unlocked = false;
    this.setState({search: this.state.search});
  }

  toggleUnlockFilter() {
    this.state.search.lock.unlocked = !this.state.search.lock.unlocked;
    this.state.search.lock.locked = false;
    this.setState({search: this.state.search});
  }

  isMatch(instance) {
    var search = this.state.search,
        query = search.query,
        name = instance.name,
        isNameMatch = name.indexOf(query) > -1,

        isMatch = isNameMatch;
    return isMatch;
  }

  selectAll() {
    this.state.group.selected = this.props.instances.filter(this.isMatch.bind(this));
    this.setState({group: this.state.group});
  }

  deselectAll() {
    this.state.group.selected = [];
    this.setState({group: this.state.group});
  }

  sortAlphabeticalAsc(instances) {
    instances.sort(function(a, b) {
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

  sortAlphabeticalDesc(instances) {
    this.sortAlphabeticalAsc(instances);
    instances.reverse();
  }

  setSortChronologicalAsc() {
    const sort = {
      alphabetical: null,
      chronological: {
        ascending: true
      },
      durational: null
    };
    this.setState({sort: sort});
  }

  setSortChronologicalDesc() {
    const sort = {
      alphabetical: null,
      chronological: {
        ascending: false
      },
      durational: null
    };
    this.setState({sort: sort});
  }
}


class BaseMenuView extends BaseContainerView {

  constructor(props) {
    super(props);
    this.state.newName = '';
    this.state.errorMessage = '';
  }

  isMatch(instance) {
    const search = this.state.search,
        query = search.query,
        name = instance.name,
        isNameMatch = name.indexOf(query) > -1;
    return isNameMatch;
  }

  toggleSelect(instance) {
    var selected = this.state.group.selected,
        index = selected.indexOf(instance),
        isSelected = index > -1;
    if (isSelected) {
      selected.splice(index, 1);
    } else {
      selected.push(instance);
    }
    this.setState({selected: selected});
  }

  deleteSelected() {
    while (this.state.group.selected.length > 0) {
      var instance = this.state.group.selected.shift(),
          index = this.props.instances.indexOf(instance);
      this.props.instances.splice(index, 1);
    }
    this.props.updateInstances();
  }

  updateNew(event) {
    this.setState({newName: event.target.value});
  }

  sortInstances(instances) {
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

  renderBulkControls() {
    return <InputGroup className='my-3'>
      <Button variant="danger" onClick={this.deleteSelected.bind(this)}><i className='fad fa-trash fa-1x'></i></Button>
    </InputGroup>;
  }

  renderInstance(instance) {
    const id = instance.id,
      name = instance.name,
      isSelected = this.state.group.selected && this.state.group.selected.indexOf(instance) > -1,
      element = <Item active={isSelected} key={id} onClick={this.toggleSelect.bind(this, instance)} >{name}</Item>;
    return element;
  }

  renderCreateNew() {
    var errorElement;
    if (this.state.errorMessage) {
      errorElement = <Form.Control.Feedback type="invalid">{this.state.errorMessage}</Form.Control.Feedback>;
    }

    return <React.Fragment>
      <InputGroup className="mb-3">
        <InputGroup.Text id="new-stopwatch"><i className='fad fa-plus'></i></InputGroup.Text>
        <FormControl
        placeholder="Stopwatch Name"
        aria-label="new stopwatch"
        aria-describedby="new-stopwatch"
        value={this.state.newName}
        onKeyDown={this.createNew.bind(this)}
        onChange={this.updateNew.bind(this)}
        minLength='1'
        />
      </InputGroup>
      {errorElement}
    </React.Fragment>;
  }

  render() {
    var instances = this.props.instances.filter(this.isMatch.bind(this));
    this.sortInstances(instances);

    var listElements =[];
    for (var i = 0; i < instances.length; i++) {
      var element = this.renderInstance(instances[i]);
      listElements.push(element);
    }
    const sortControls = this.props.instances.length ? this.renderSortControls() : '',
      searchElement = this.props.instances.length ? this.renderSearch() : '',
      createNewElement = this.renderCreateNew();

    if (this.props.instances.length && !instances.length) {
      stopwatchViewElement = this.renderEmptyResults();
    } else {
      stopwatchViewElement = <ListGroup className='mt-3'>
          {listElements}
        </ListGroup>;
    }

    var bulkControls;
    if (this.state.group.selected.length) {
      bulkControls = this.renderBulkControls();
    }

    var className = this.props.className ? 'menu-container ' + this.props.className : 'menu-container';
    return <div className={className}>
      <div className='text-align-center my-3'>
        {sortControls}
      </div>
      {searchElement}

      {bulkControls}
      {stopwatchViewElement}
      {createNewElement}
    </div>;
  }
}
