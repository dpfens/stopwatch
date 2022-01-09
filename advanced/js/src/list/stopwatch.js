function stopwatchFromObject(obj) {
  obj.stopwatch.metadata.createdAt = new Date(obj.stopwatch.metadata.createdAt);
  obj.stopwatch.metadata.lastModified = new Date(obj.stopwatch.metadata.lastModified);
  obj.stopwatch.metadata.startedAt = obj.stopwatch.metadata.startedAt;
  obj.stopwatch.metadata.stoppedAt = obj.stopwatch.metadata.stoppedAt;

  for (var i = 0; i < obj.stopwatch.splits.length; i++) {

      if (obj.stopwatch.splits[i].distance && obj.stopwatch.splits[i].distanceUnit) {
          Object.setPrototypeOf(obj.stopwatch.splits[i], Lap.prototype);
      }  else {
          Object.setPrototypeOf(obj.stopwatch.splits[i], Split.prototype);
      }
      obj.stopwatch.splits[i].metadata.createdAt = new Date(obj.stopwatch.splits[i].metadata.createdAt);
      obj.stopwatch.splits[i].metadata.lastModified = new Date(obj.stopwatch.splits[i].metadata.lastModified);
  }

  for (var i = 0; i < obj.activity.length; i++) {
    var activity = obj.activity[i];
    activity.timestamp = new Date(activity.timestamp);
  }

  obj.stopwatch = Object.setPrototypeOf(obj.stopwatch, LapStopwatch.prototype);
  return obj;
}

class StopwatchContainerView extends BaseContainerView {

  constructor(props) {
    super(props);
    this.state.search.hidden = false;
    this.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      durational: null
    };
    this.state.group = {
      mode: false,
      selected: []
    };
    this.sortChronologicalAsc = this.sortChronologicalAsc.bind(this);
    this.sortChronologicalDesc = this.sortChronologicalDesc.bind(this);
    this.sortDurationalAsc = this.sortDurationalAsc.bind(this);
    this.sortDurationalDesc = this.sortDurationalDesc.bind(this);
  }

  toggleGroupMode() {
    var group = this.state.group,
        isActive = group.mode;
    if (isActive) {
      group.selected = [];
      group.mode = false;
    } else {
      group.mode = true;
    }
    this.setState({group: group});
  }

  refreshGroupState() {
    this.setState({group: this.state.group});
  }

  selectAll() {
    this.state.group.selected = this.props.instances.filter(this.isMatch.bind(this));
    this.setState({group: this.state.group});
  }

  deselectAll() {
    this.state.group.selected = [];
    this.setState({group: this.state.group});
  }

  toggleSelect(instance) {
    var group = this.state.group,
        index = group.selected.indexOf(instance),
        isSelected = index > -1;
    if (isSelected) {
      group.selected.splice(index, 1);
    } else {
      group.selected.push(instance);
    }
    this.setState({group: group});
  }

  deleteSelected() {
    while (this.state.group.selected.length > 0) {
      const instance = this.state.group.selected.shift();
      this.props.deleteInstance(instance);
    }
    if (this.props.instances.length < 2) {
      this.toggleGroupMode();
    }
    this.props.updateInstances();
  }

  lockSelected() {
    var group = this.state.group;
    for (var i = 0; i < group.selected.length; i++) {
      var instance = group.selected[i];
      this.lock(instance);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...group.selected).then(function() {
      if (self.state.search.lock.unlocked) {
        group.selected = [];
        self.setState({group: group});
      }
      self.props.updateInstances();
    });
  }

  lock(instance) {
    var newVerb = 'Locked',
        activity = {
          icon: 'fa-lock',
          type: newVerb,
          description: '',
          timestamp: new Date()
        };
    instance.activity.unshift(activity);
    instance.locked = true;
  }

  unlockSelected() {
    var group = this.state.group;
    for (var i = 0; i < group.selected.length; i++) {
      var instance = group.selected[i];
      this.unlock(instance);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...group.selected).then(function() {
      if (self.state.search.lock.locked) {
        group.selected = [];
        self.setState({group: group});
      }
      self.props.updateInstances();
    });
  }

  unlock(instance) {
    var newVerb = 'Unlocked',
        activity = {
          icon: 'fa-lock',
          type: newVerb,
          description: '',
          timestamp: new Date()
        };
    instance.activity.unshift(activity);
    instance.locked = false;
  }

  hideSelected() {
    var group = this.state.group;
    for (var i = 0; i < group.selected.length; i++) {
      var instance = group.selected[i];
      this.hide(instance);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...group.selected).then(function() {
      if (!self.state.search.hidden) {
        group.selected = [];
        self.setState({group: group});
      }
      self.props.updateInstances();
    });
  }

  hide(instance) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Hide',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.visible = false;
  }

  showSelected() {
    var group = this.state.group;
    for (var i = 0; i < group.selected.length; i++) {
      var instance = group.selected[i];
      this.show(instance);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...group.selected).then(function() {
      if (self.state.search.hidden) {
        group.selected = [];
        self.setState({group: group});
      }
      self.props.updateInstances();
    });
  }

  show(instance) {
    var activity = {
          icon: 'fa-eye',
          type: 'Show',
          description: '',
          timestamp: new Date()
        };
    instance.activity.unshift(activity);
    instance.visible = true;
  }

  cloneSelected() {
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i],
          cloneFn = this.props.cloneInstance || this.cloneStopwatchInstance.bind(this);
      cloneFn(instance);
    }
    this.props.updateInstances();
  }

  cloneStopwatchInstance(instance) {
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

    newItem.name = newName;

    var activity = {
          type: 'Cloned',
          description: '',
          timestamp: new Date()
        };
    newItem.activity.unshift(activity);
    delete newItem.id;
    var self = this;
    stopwatchAdapter.add(STOPWATCHSTORE, newItem).then(function(events) {
      var newId = events[0].target.result;
      newItem.id = newId;

      // assign groups
      var updatedGroups = [];
      for (var i = 0; i < newItem.groups.length; i++) {
        var groupId = newItem.groups[i];
        for (var j = 0; j < self.props.groups.length; j++) {
          var potentialGroup = self.props.groups[j];
          if (potentialGroup.id == groupId) {
            potentialGroup.members.push(newItem.id);
            updatedGroups.push(potentialGroup);
            break;
          }
        }
      }
      self.props.instances.push(newItem);
      stopwatchAdapter.update(GROUPSTORE, ...updatedGroups).then(function () {
        self.props.updateInstances();
      });

    });

  }

  start(instance, timestamp) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Start',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.stopwatch.start(timestamp);
  }

  startSelected() {
    const now = Date.now();
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i];
      this.start(instance, now);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...this.state.group.selected).then(function(events) {
      self.props.updateInstances();
    });
  }

  stop(instance, timestamp) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Stop',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.stopwatch.stop(timestamp);
  }

  stopSelected() {
    const now = Date.now();
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i];
      this.stop(instance, now);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...this.state.group.selected).then(function(events) {
      self.props.updateInstances();
    });
  }

  resume(instance, timestamp) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Resume',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.stopwatch.resume(timestamp);
  }

  resumeSelected() {
    const now = Date.now();
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i];
      this.resume(instance, now);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...this.state.group.selected).then(function(events) {
      self.props.updateInstances();
    });
  }

  split(instance, timestamp) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Split',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.stopwatch.addSplit(timestamp);
  }

  splitSelected() {
    const now = Date.now();
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i];
      this.split(instance, now);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...this.state.group.selected).then(function(events) {
      self.props.updateInstances();
    });
  }

  lap(instance, timestamp) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Lap',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.stopwatch.addLap(timestamp);
  }

  lapSelected() {
    const now = Date.now();
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i];
      this.lap(instance, now);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...this.state.group.selected).then(function(events) {
      self.props.updateInstances();
    });
  }

  reset(instance) {
    var activity = {
      icon: 'fa-eye-slash',
      type: 'Reset',
      description: '',
      timestamp: new Date()
    };
    instance.activity.unshift(activity);
    instance.stopwatch.reset();
  }

  resetSelected() {
    const now = Date.now();
    for (var i = 0; i < this.state.group.selected.length; i++) {
      var instance = this.state.group.selected[i];
      this.reset(instance, now);
    }

    const self = this;
    stopwatchAdapter.update(STOPWATCHSTORE, ...this.state.group.selected).then(function(events) {
      self.props.updateInstances();
    });
  }

  toggleHiddenFilter() {
    var search = this.state.search;
    search.hidden = !search.hidden;
    this.setState({search: search});
  }

  isMatch(instance) {
    const isMatch = super.isMatch(instance);
        search = this.state.search,
        lock = search.lock,
        hasLockPreference = lock.locked ^ lock.unlocked,
        lockMatch = lock.locked && instance.locked,
        unlockMatch = lock.unlocked && !instance.locked,
        hiddenMatch = search.hidden === !instance.visible,
        isLockMatch = !hasLockPreference || lockMatch || unlockMatch;
    return isMatch && isLockMatch && hiddenMatch;
  }

  setSortAlphabeticalAsc() {
    const sort = {
      alphabetical: {
        ascending: true
      },
      chronological: null,
      durational: null
    };
    this.setState({sort: sort});
  }

  setSortAlphabeticalDesc() {
    const sort = {
      alphabetical: {
        ascending: false
      },
      chronological: null,
      durational: null
    };
    this.setState({sort: sort});
  }

  sortChronologicalAsc(instances) {
    instances.sort(function(a, b) {
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

  sortChronologicalDesc(instances) {
    this.sortChronologicalAsc(instances);
    instances.reverse();
  }

  setSortDurationalAsc() {
    const sort = {
      alphabetical: null,
      chronological: null,
      durational: {
        ascending: true
      }
    };
    this.setState({sort: sort});
  }

  setSortDurationalDesc() {
    const sort = {
      alphabetical: null,
      chronological: null,
      durational: {
        ascending: false
      }
    };
    this.setState({sort: sort});
  }

  sortDurationalAsc(instances) {
    instances.sort(function(a, b) {
      var aVal = a.stopwatch.totalDuration(),
          bVal = b.stopwatch.totalDuration();
      return aVal - bVal;
    });
  }

  sortDurationalDesc(instances) {
    this.sortDurationalAsc(instances);
    instances.reverse();
  }

  renderSortControls() {
    const sort = this.state.sort,
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

    const alphabeticalButton = <Button variant={alphabeticalVariant} onClick={alphabeticalHandler.bind(this)} title='Alphabetical'><i className={alphabeticalIcon}></i></Button>,
          chronologicalButton = <Button variant={chronologicalVariant} onClick={chronologicalHandler.bind(this)} title='Chronological'><i className={chronologicalIcon}></i></Button>,
          durationalButton = <Button variant={durationalVariant} onClick={durationalHandler.bind(this)} title='Durational'><i className={durationalIcon}></i></Button>
          sortButtonGroup = <ButtonGroup>
            {chronologicalButton}
            {alphabeticalButton}
            {durationalButton}
          </ButtonGroup>;
    return sortButtonGroup;
  }

  createNew() {
    const stopwatch = new LapStopwatch(),
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

    const activity = {
        type: 'Created',
        description: '',
        timestamp: stopwatch.metadata.createdAt
    },
    item = {name: name, stopwatch: stopwatch, locked: false, visible: true, selected: false,  activity: [activity], groups: []},
    self = this;

    stopwatchAdapter.add(STOPWATCHSTORE, item).then(function(events) {
      item.id = events[0].target.result;
      self.props.instances.push(item);
      self.props.updateInstances();
      self.setState({instances: self.props.instances, newName: ''});
    });
  }

  renderRunningControls() {
    var renderStart = renderStop = renderResumeReset = renderSplit = renderLap = true;

    const instances = this.state.group.selected;
    for (var i = 0; i < instances.length; i++) {
      const instance = instances[i],
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
      startElement = <Button variant='success' onClick={this.startSelected.bind(this)}><i className='fad fa-play fa-1x'></i></Button>;
    }

    if (renderStop) {
      stopElement = <Button variant='danger' onClick={this.stopSelected.bind(this)}><i className='fad fa-stop fa-1x'></i></Button>;
    }

    if (renderResumeReset) {
      resumeElement = <Button variant='success' onClick={this.resumeSelected.bind(this)}><i className='fad fa-play fa-1x'></i></Button>;
      resetElement = <Button variant='danger' onClick={this.resetSelected.bind(this)}>Reset</Button>;
    }

    if (renderSplit) {
      splitElement = <Button variant='outline-secondary' onClick={this.splitSelected.bind(this)}>Split</Button>;
    }

    if (renderLap) {
      lapElement = <Button variant='outline-secondary' onClick={this.lapSelected.bind(this)}>Lap</Button>;
    }

    if (renderStart || renderStop || renderResumeReset || renderSplit || renderLap) {
      return <InputGroup>
        {startElement}
        {stopElement}
        {resumeElement}
        {splitElement}
        {lapElement}
        {resetElement}
      </InputGroup>;
    } else {
      return <Navbar.Text>No actions available.</Navbar.Text>
    }
  }

  renderAdminControls() {
    const addGroupTitle = <i className='fad fa-ellipsis-v fa-1x'></i>,
      adminActionElements = <InputGroup>
      <Button variant="outline-secondary" onClick={this.cloneSelected.bind(this)}><i className='fad fa-clone fa-1x'></i></Button>

      <ButtonGroup className='mx-3'>
        <Button variant="outline-secondary" onClick={this.lockSelected.bind(this)}><i className='fad fa-lock fa-1x'></i></Button>
        <Button variant="outline-secondary" onClick={this.unlockSelected.bind(this)}><i className='fad fa-lock-open fa-1x'></i></Button>
      </ButtonGroup>
      <DropdownButton variant='outline-secondary' align='end' title={addGroupTitle}>
        <Dropdown.Item variant="outline-secondary" onClick={this.hideSelected.bind(this)}><i className='fad fa-eye-slash fa-1x'></i> Hide</Dropdown.Item>
        <Dropdown.Item variant="danger" onClick={this.deleteSelected.bind(this)}><i className='fad fa-trash fa-1x'></i> Delete</Dropdown.Item>
      </DropdownButton>
    </InputGroup>;
    return adminActionElements;
  }

  renderViewElement() {
    var viewInGridVariant = this.state.viewType == 'grid' ? 'primary' : 'outline-secondary',
    viewInListVariant = this.state.viewType == 'list' ? 'primary' : 'outline-secondary';

    return <ButtonGroup>
        <Button variant={viewInGridVariant} onClick={this.viewInGrid.bind(this)} title='Grid'><i className='fad fa-th-large fa-1x'></i></Button>
        <Button variant={viewInListVariant} onClick={this.viewInList.bind(this)} title='List'><i className='fad fa-th-list fa-1x'></i></Button>
    </ButtonGroup>;
  }

  renderBlankState() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-stopwatch fa-9x'></i>

      <p className='my-3'>No stopwatches created...yet.</p>

      <p><Button onClick={this.createNew.bind(this)}><i className='fad fa-plus fa-1x'></i> New Stopwatch</Button></p>
    </div>;
  }

  renderSearch() {
    search = this.state.search,
      unlockedVariant = search.lock.unlocked ? 'primary' : 'outline-secondary',
      lockedVariant = search.lock.locked ? 'primary' : 'outline-secondary',
      hiddenVariant = search.hidden ? 'primary': 'outline-secondary',
      hiddenIcon = search.hidden ? <i className='fad fa-eye-slash fa-1x'></i> : <i className='fad fa-eye fa-1x'></i>
    return <InputGroup>
        <InputGroup.Text id="new-stopwatch"><i className='fad fa-search'></i></InputGroup.Text>
        <FormControl type="search" placeholder="Search Stopwatches" onChange={this.searchChange.bind(this)} className="me-2" aria-label="Search Stopwatches" />
      <ButtonGroup>
        <Button variant={unlockedVariant} title='Unlock' onClick={this.toggleUnlockFilter.bind(this)}><i className='fad fa-lock-open fa-1x'></i></Button>
        <Button variant={lockedVariant} title='Lock' onClick={this.toggleLockFilter.bind(this)}><i className='fad fa-lock fa-1x'></i></Button>
      </ButtonGroup>
      <Button className='mx-2' variant={hiddenVariant} title='Hidden' onClick={this.toggleHiddenFilter.bind(this)}>{hiddenIcon}</Button>
    </InputGroup>;
  }


  renderGroupControls(visibleInstances) {
    const group = this.state.group,
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
    const selectAllElement = isGroupMode ? <Button variant={selectAllVariant} onClick={this.selectAll.bind(this)} title='Select All'><i className='fad fa-expand fa-1x'></i></Button> : '',
      deselectAllElement = isGroupMode ? <Button variant={deselectAllVariant} onClick={this.deselectAll.bind(this)} title='Deselect All'><i className='fad fa-compress fa-1x'></i></Button> : '';
    return <Nav>
      <ButtonGroup>
        {selectAllElement}
        {deselectAllElement}
        <Button variant={groupModeVariant} onClick={this.toggleGroupMode.bind(this)}><i className='fad fa-object-group'></i></Button>
      </ButtonGroup>
    </Nav>
  }

  sortInstances(instances) {
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

  renderEmptyResults() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-frown-open fa-9x'></i>

      <p className='my-3'>Sorry, no matching stopwatches.</p>
    </div>
  }

  render() {
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

    if (instances.length) {
      if (this.state.viewType == 'list') {
        stopwatchViewElement = <StopwatchListView instances={instances} groups={this.props.groups} updateInstances={this.props.updateInstances} cloneInstance={cloneInstanceFn} deleteInstance={deleteInstanceFn} groupMode={this.state.group.mode} selectInstance={this.toggleSelect.bind(this)} selected={this.state.group.selected} />;
      } else if (this.state.viewType == 'grid') {
        stopwatchViewElement = <StopwatchGridView instances={instances} groups={this.props.groups} updateInstances={this.props.updateInstances} cloneInstance={cloneInstanceFn} deleteInstance={deleteInstanceFn} groupMode={this.state.group.mode} selectInstance={this.toggleSelect.bind(this)} selected={this.state.group.selected} />;
      }
    } else {
      stopwatchViewElement = this.renderEmptyResults();
    }


    const addButton = this.props.addButton ? <Button className='mx-3' onClick={this.createNew.bind(this)} variant="success" title='New Stopwatch'><i className='fad fa-plus fa-1x'></i></Button> : '';

    var groupNav;
    if (this.props.select) {
      groupNav = this.renderGroupControls(instances);
    }

    const sortControls = this.renderSortControls(),
      viewNavbarElement = <Navbar bg="light" variant="light">
        <Nav className="me-auto">
          {viewControlsElement}
        </Nav>

        <Nav>{sortControls}</Nav>
      </Navbar>;
      var searchBatchNav = <Nav className="me-auto">
        <Navbar.Text>Tap on a stopwatch to select it</Navbar.Text>
      </Nav>;
      if (this.state.group.mode) {
        if (this.state.group.selected.length) {
          var adminControls = this.renderAdminControls(),
              runningControls = this.renderRunningControls();
          searchBatchNav = <React.Fragment>
            <Nav className="me-auto">
              {adminControls}
            </Nav>
            <Nav className="me-auto">
              {runningControls}
            </Nav>
          </React.Fragment>;
        }
      } else {
        var searchElement = this.renderSearch();
        searchBatchNav = <Nav className="me-auto">
          {searchElement}
          {addButton}
        </Nav>;
      }
      const searchNavbarElement = <Navbar bg="light" variant="light" sticky="top">
        {searchBatchNav}
        {groupNav}
    </Navbar>,
    className = this.props.className ? 'stopwatch-container ' + this.props.className : 'stopwatch-container';
    return <div className={className}>
      {viewNavbarElement}
      {searchNavbarElement}
      {stopwatchViewElement}
    </div>;
  }

}


class StopwatchMenuView extends StopwatchContainerView {

  constructor(props) {
    super(props);
    this.state.newName = '';
  }

  isMatch(instance) {
    const search = this.state.search,
        lock = search.lock,

        query = search.query,
        name = instance.name,
        isNameMatch = name.indexOf(query) > -1,

        hasLockPreference = lock.locked ^ lock.unlocked,
        lockMatch = lock.locked && instance.locked,
        unlockMatch = lock.unlocked && !instance.locked,
        hiddenMatch = search.hidden === !instance.visible,
        isLockMatch = !hasLockPreference || lockMatch || unlockMatch;
    return isNameMatch && isLockMatch && hiddenMatch;
  }

  updateNew(event) {
    this.setState({newName: event.target.value});
  }

  createNew(event) {
    if (event.keyCode === 13) {
      const stopwatch = new LapStopwatch(),
            stopwatchCount = this.props.instances.length;
      var name = this.state.newName;

      if (!name) {
        name = 'Stopwatch #' + stopwatchCount;
      }

      const activity = {
          type: 'Created',
          description: '',
          timestamp: stopwatch.metadata.createdAt
      },
      item = {name: name, stopwatch: stopwatch, locked: false, visible: true, id:stopwatchCount, activity: [activity], groups: []},
      self = this;

      stopwatchAdapter.add(STOPWATCHSTORE, item).then(function(events) {
        item.id = events[0].target.result;
        self.props.instances.push(item);
        self.props.updateInstances();
        self.setState({newName: ''});
      });
    }
  }

  renderBulkControls() {
    return <InputGroup className='my-3'>
      <Button variant="outline-secondary" onClick={this.cloneSelected.bind(this)}><i className='fad fa-clone fa-1x'></i></Button>

      <ButtonGroup className='mx-auto'>
      <Button variant="outline-secondary" onClick={this.showSelected.bind(this)}><i className='fad fa-eye fa-1x'></i></Button>
      <Button variant="outline-secondary" onClick={this.hideSelected.bind(this)}><i className='fad fa-eye-slash fa-1x'></i></Button>
      </ButtonGroup>

      <ButtonGroup className='mx-auto'>
        <Button variant="outline-secondary" onClick={this.lockSelected.bind(this)}><i className='fad fa-lock fa-1x'></i></Button>
        <Button variant="outline-secondary" onClick={this.unlockSelected.bind(this)}><i className='fad fa-lock-open fa-1x'></i></Button>
      </ButtonGroup>

      <Button variant="danger" onClick={this.deleteSelected.bind(this)}><i className='fad fa-trash fa-1x'></i></Button>
    </InputGroup>;
  }

  renderInstance(instance) {
    const id = instance.id,
      name = instance.name,
      lockElement = instance.locked ? <i className='fad fa-lock'></i> : <i className='fad fa-lock-open'></i>,
      visibleElement = instance.visible ? <i className='fad fa-eye'></i> : <i className='fad fa-eye-slash'></i>,
      isSelected = this.state.group.selected && this.state.group.selected.indexOf(instance) > -1,
      element = <Item active={isSelected} key={id} onClick={this.toggleSelect.bind(this, instance)} >
        {visibleElement} {lockElement} {name}
      </Item>;
    return element;
  }

  renderEmptyResults() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-frown-open fa-9x'></i>

      <p className='my-3'>Sorry, no matching stopwatches.</p>
    </div>
  }

  render() {
    var instances = this.props.instances.filter(this.isMatch.bind(this));

    this.sortInstances(instances);

    var listElements =[];
    for (var i = 0; i < instances.length; i++) {
      var element = this.renderInstance(instances[i]);
      listElements.push(element);
    }

    var stopwatchViewElement;
    if (this.props.instances.length && !instances.length) {
      stopwatchViewElement = this.renderEmptyResults();
    } else {
      stopwatchViewElement = <ListGroup className='mt-3'>
          {listElements}
        </ListGroup>;
    }
    const sortControls = this.props.instances.length ? this.renderSortControls() : '',
      searchElement = this.props.instances.length ? this.renderSearch() : '';

    var bulkControls;
    if (this.state.group.selected.length) {
      bulkControls = this.renderBulkControls();
    }

    var className = this.props.className ? 'stopwatch-menu-container ' + this.props.className : 'stopwatch-menu-container';
    return <div className={className}>
      <div className='text-align-center my-3'>
        {sortControls}
      </div>
      {searchElement}

      {bulkControls}
      {stopwatchViewElement}

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
    </div>;
  }
}
