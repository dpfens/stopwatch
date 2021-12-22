class GroupContainerView extends BaseContainerView {

  constructor(props) {
    super(props);
    this.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      membership: null
    };

    this.sortChronologicalAsc = this.sortChronologicalAsc.bind(this);
    this.sortChronologicalDesc = this.sortChronologicalDesc.bind(this);
    this.sortMembershipAsc = this.sortMembershipAsc.bind(this);
    this.sortMembershipDesc = this.sortMembershipDesc.bind(this);

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
    stopwatchAdapter.add(STOPWATCHSTORE, newItem).then(function(events) {
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
      stopwatchAdapter.update(GROUPSTORE, ...updatedGroups).then(function() {
        self.props.updateInstances();
      });
    });
  }

  deleteInstance(instance) {
    super.deleteInstance(instance);

    var self = this;
    stopwatchAdapter.delete(GROUPSTORE, instance.id).then(function() {
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
    stopwatchAdapter.update(STOPWATCHSTORE, ...groupStopwatches);
  }

  deleteStopwatchInstance(instance) {
    const index = this.props.stopwatches.indexOf(instance);
    var self = this;
    stopwatchAdapter.delete(STOPWATCHSTORE, instance.id).then(function() {
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
        stopwatchAdapter.update(GROUPSTORE, ...groupsToUpdate);
      }
    }
    self.props.updateInstances();
  }

  setSortChronologicalAsc() {
    var sort = {
      alphabetical: null,
      chronological: {
        ascending: true
      },
      membership: null
    };
    this.setState({sort: sort});
  }

  setSortChronologicalDesc() {
    var sort = {
      alphabetical: null,
      chronological: {
        ascending: false
      },
      membership: null
    };
    this.setState({sort: sort});
  }

  sortChronologicalAsc(instances) {
    instances.sort(function(a, b) {
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

  sortChronologicalDesc(instances) {
    this.sortChronologicalAsc(instances);
    instances.reverse();
  }

  setSortAlphabeticalAsc() {
    const sort = {
      alphabetical: {
        ascending: true
      },
      chronological: null,
      membership: null
    };
    this.setState({sort: sort});
  }

  setSortAlphabeticalDesc() {
    const sort = {
      alphabetical: {
        ascending: false
      },
      chronological: null,
      membership: null
    };
    this.setState({sort: sort});
  }

  sortMembershipAsc(instances) {
    instances.sort(function(a, b) {
      var aVal = a.members.length,
          bVal = b.members.length;
      return aVal - bVal;
    });
  }

  sortMembershipDesc(instances) {
    this.sortMembershipAsc(instances);
    instances.reverse();
  }

  setSortMembershipAsc() {
    const sort = {
      alphabetical: null,
      chronological: null,
      membership: {
        ascending: true
      }
    };
    this.setState({sort: sort});
  }

  setSortMembershipDesc() {
    const sort = {
      alphabetical: null,
      chronological: null,
      membership: {
        ascending: false
      }
    };
    this.setState({sort: sort});
  }

  renderSortControls() {

    const sort = this.state.sort,
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

    const alphabeticalButton = <Button variant={alphabeticalVariant} onClick={alphabeticalHandler.bind(this)} title='Alphabetical'><i className={alphabeticalIcon}></i></Button>,
          chronologicalButton = <Button variant={chronologicalVariant} onClick={chronologicalHandler.bind(this)} title='Chronological'><i className={chronologicalIcon}></i></Button>,
          membershipButton = <Button variant={membershipVariant} onClick={membershipHandler.bind(this)} title='Membership'><i className={membershipIcon}></i></Button>
          sortButtonGroup = <ButtonGroup>
            {chronologicalButton}
            {alphabeticalButton}
            {membershipButton}
          </ButtonGroup>;
    return sortButtonGroup;
  }

  renderStopwatchesByGroup(instances) {
    var ungroupedStopwatches = []
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
          var instance  = groupedStopwatches[j],
              stopwatchId = instance.id,
              isMember = group.members.indexOf(stopwatchId) > -1;
          if (isMember) {
            groupStopwatches.push(instance);
          }
      }
      if (groupStopwatches.length) {
        var stopwatchViewElement = <StopwatchContainerView className='mx-2' instances={groupStopwatches} groups={this.props.instances} updateInstances={this.props.updateStopwatches} cloneInstance={this.cloneStopwatchInstance.bind(this)} deleteInstance={this.deleteStopwatchInstance.bind(this)} select />
      } else {
        stopwatchViewElement = <div className='empty text-align-center my-5'>
          <i className='fad fa-stopwatch fa-9x'></i>
          <p className='my-3'>No stopwatches assigned...yet.</p>
        </div>;
      }

      var groupElement = <GroupItem instance={group} instances={this.props.instances} stopwatches={groupStopwatches} deleteInstance={this.deleteInstance.bind(this)} key={group.name} update={this.props.updateInstances} updateStopwatches={this.props.updateStopwatches} edit>
        {stopwatchViewElement}
      </GroupItem>;
      groupElements.push(groupElement);
    }

    // only include the Ungrouped group if the user is not actively searching
    if (ungroupedStopwatches.length && !this.state.search.query) {
      var group = {
        name: 'Ungrouped'
      },
      stopwatchViewElement = <StopwatchContainerView className='mx-2' instances={ungroupedStopwatches} groups={this.props.instances} updateInstances={this.props.updateStopwatches} cloneInstance={this.cloneStopwatchInstance.bind(this)} deleteInstance={this.deleteStopwatchInstance.bind(this)} select />
      groupElements.unshift(<GroupItem instance={group} groups={this.props.instances} stopwatches={ungroupedStopwatches} key={null} update={this.props.updateInstances} updateStopwatches={this.props.updateStopwatches}>{stopwatchViewElement}</GroupItem>);
    }
    return <Row>
      {groupElements}
    </Row>;
  }

  renderBlankState() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-ball-pile fa-9x'></i>

      <p className='my-3'>No groups created...yet.</p>

      <p>Groups can be created in the Groups tab of the menu.</p>
    </div>;
  }

  renderEmptyResults() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-frown-open fa-9x'></i>

      <p className='my-3'>Sorry, no matching groups.</p>
    </div>
  }

  render() {
    if (!this.props.instances.length) {
      return this.renderBlankState();
    }

    var unlockedVariant = this.state.search.lock.unlocked ? 'primary' : 'outline-secondary',
        lockedVariant = this.state.search.lock.locked ? 'primary' : 'outline-secondary',
        viewInGridVariant = this.state.viewType == 'grid' ? 'primary' : 'outline-secondary',
        viewInListVariant = this.state.viewType == 'list' ? 'primary' : 'outline-secondary',
        sortControls = this.renderSortControls();

    var navElement = <Navbar>
      <Nav className="me-auto">
        <InputGroup>
          <InputGroup.Text id="new-stopwatch"><i className='fad fa-search'></i></InputGroup.Text>
          <FormControl type="search" placeholder="Search Groups" onChange={this.searchChange.bind(this)} className="me-2" aria-label="Search Groups" />
        </InputGroup>
      </Nav>

      <Nav className="me-auto"></Nav>

      <Nav>
        {sortControls}
      </Nav>
    </Navbar>;
    const instances = this.props.instances.filter(this.isMatch.bind(this)),
            instanceCount = instances.length,
            sort = this.state.sort;
    var stopwatchViewElement,
        sortHandler;

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
    return <div className={className}>
      {navElement}
      {instanceViewElement}
    </div>;
  }
}


class GroupMenuView extends BaseMenuView {

  constructor(props) {
    super(props);
    this.state.sort = {
      chronological: {
        ascending: true
      },
      alphabetical: null,
      membership: null
    };
  }

  renderSortControls() {
    const sort = this.state.sort,
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

    const alphabeticalButton = <Button variant={alphabeticalVariant} onClick={alphabeticalHandler.bind(this)} title='Alphabetical'><i className={alphabeticalIcon}></i></Button>,
          chronologicalButton = <Button variant={chronologicalVariant} onClick={chronologicalHandler.bind(this)} title='Chronological'><i className={chronologicalIcon}></i></Button>,
          membershipButton = <Button variant={membershipVariant} onClick={membershipHandler.bind(this)} title='Membership'><i className={membershipIcon}></i></Button>
          sortButtonGroup = <ButtonGroup>
            {chronologicalButton}
            {alphabeticalButton}
            {membershipButton}
          </ButtonGroup>;
    return sortButtonGroup;
  }

  renderSearch() {
    return <InputGroup>
        <InputGroup.Text id="new-stopwatch"><i className='fad fa-search'></i></InputGroup.Text>
        <FormControl type="search" placeholder="Search Groups" onChange={this.searchChange.bind(this)} className="me-2" aria-label="Search Groups" />
        </InputGroup>;
  }

  renderEmptyResults() {
    return <div className='empty text-align-center my-5'>
      <i className='fad fa-frown-open fa-9x'></i>

      <p className='my-3'>Sorry, no matching groups.</p>
    </div>
  }

  deleteInstance(instance) {
    super.deleteInstance(instance);

    var self = this;
    stopwatchAdapter.delete(GROUPSTORE, instance.id).then(function() {
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
    stopwatchAdapter.update(STOPWATCHSTORE, ...groupStopwatches);
  }

  updateNew(event) {
    const newValue = event.target.value;

    var errorMessage = '';
    if (newValue) {
      if (newValue.toLowerCase() === 'ungrouped') {
        errorMessage = `"ungrouped" is a reserved group name.  Please use another`;
      } else {
        for (var i = 0; i < this.props.instances.length; i++) {
          var item = this.props.instances[i];
          if (item.name === newValue) {
            errorMessage = `Group "${newValue}" already exists. Enter a unique name`;
            break;
          }
        }
      }
    } else {
      errorMessage = 'Group must have a name';
    }
    this.setState({newName: newValue, errorMessage: errorMessage});
  }

  createNew(event) {
    if (this.state.errorMessage) {
      return;
    }

    if (!this.state.newName) {
      this.setState({errorMessage: 'Group must have a name'});
    }
    else if (event.keyCode === 13) {
      var name = this.state.newName;

      // check if any groups exist with the specified name
      for (var i = 0; i < this.props.instances.length; i++) {
        var item = this.props.instances[i];
        if (item.name === name) {
          return;
        }
      }


      const metadata = {createdAt: new Date(), lastModified: new Date()},
            item = {name: name, members: [], locked: false, visible: true, metadata: metadata},
            self = this;

      stopwatchAdapter.add(GROUPSTORE, item).then(function(events) {
        item.id = events[0].target.result;
        self.props.instances.push(item);
        self.setState({instances: self.props.instances, newName: ''});
      });
    }
  }

  setSortChronologicalAsc() {
    var sort = {
      alphabetical: null,
      chronological: {
        ascending: true
      },
      membership: null
    };
    this.setState({sort: sort});
  }

  setSortChronologicalDesc() {
    var sort = {
      alphabetical: null,
      chronological: {
        ascending: false
      },
      membership: null
    };
    this.setState({sort: sort});
  }

  sortChronologicalAsc(instances) {
    instances.sort(function(a, b) {
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

  sortChronologicalDesc(instances) {
    this.sortChronologicalAsc(instances);
    instances.reverse();
  }

  setSortAlphabeticalAsc() {
    const sort = {
      alphabetical: {
        ascending: true
      },
      chronological: null,
      membership: null
    };
    this.setState({sort: sort});
  }

  setSortAlphabeticalDesc() {
    const sort = {
      alphabetical: {
        ascending: false
      },
      chronological: null,
      membership: null
    };
    this.setState({sort: sort});
  }

  sortMembershipAsc(instances) {
    instances.sort(function(a, b) {
      var aVal = a.members.length,
          bVal = b.members.length;
      return aVal - bVal;
    });
  }

  sortMembershipDesc(instances) {
    this.sortMembershipAsc(instances);
    instances.reverse();
  }

  setSortMembershipAsc() {
    const sort = {
      alphabetical: null,
      chronological: null,
      membership: {
        ascending: true
      }
    };
    this.setState({sort: sort});
  }

  setSortMembershipDesc() {
    const sort = {
      alphabetical: null,
      chronological: null,
      membership: {
        ascending: false
      }
    };
    this.setState({sort: sort});
  }

  renderInstance(instance) {
    const id = instance.id,
      name = instance.name,
      isSelected = this.state.group.selected && this.state.group.selected.indexOf(instance) > -1,
      element = <Item active={isSelected} key={id} onClick={this.toggleSelect.bind(this, instance)} className="d-flex justify-content-between align-items-start">
        <div className="ms-2 me-auto">
          {name}
        </div>
        <Badge variant="primary" pill>{instance.members.length}</Badge>
      </Item>;
    return element;
  }

  renderCreateNew() {
    var errorElement;
    if (this.state.errorMessage) {
      errorElement = <Form.Control.Feedback type="invalid">{this.state.errorMessage}</Form.Control.Feedback>;
    }
    return <React.Fragment>
      <InputGroup className="mb-3" hasValidation>
        <InputGroup.Text id="new-group"><i className='fad fa-plus'></i></InputGroup.Text>
        <FormControl
        placeholder="Group Name"
        aria-label="new group"
        aria-describedby="new-group"
        value={this.state.newName}
        onKeyDown={this.createNew.bind(this)}
        onChange={this.updateNew.bind(this)}
        minLength='1'
        isInvalid={!!this.state.errorMessage}
        />
        {errorElement}
      </InputGroup>
      </React.Fragment>
  }

}
