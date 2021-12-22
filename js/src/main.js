const Container = ReactBootstrap.Container,
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


class App extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      groups: [],
      stopwatches: [],
      showMenu: false,
      showActivityTab: false,
      activity: [],
    };
    this.closeMenu = this.closeMenu.bind(this);
    this.openMenu = this.openMenu.bind(this);

    this.closeActivityTab = this.closeActivityTab.bind(this);
    this.openActivityTab = this.openActivityTab.bind(this);
    this.updateStopwatches = this.updateStopwatches.bind(this);
  }

  openMenu() {
    this.setState({showMenu: true});
  }

  closeMenu() {
    this.setState({showMenu: false});
  }

  openActivityTab() {
    this.setState({showActivityTab: true})
  }

  closeActivityTab() {
    this.setState({showActivityTab: false});
  }

  updateStopwatches() {
    this.setState({stopwatches: this.state.stopwatches});
  }

  updateGroups() {
    this.setState({groups: this.state.groups});
  }

  deleteStopwatch(instance) {
    const index = this.state.stopwatches.indexOf(instance);
    this.state.stopwatches.splice(index, 1);

    var groupsToUpdate = []
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
    groupUpdatePromise = stopwatchAdapter.update(GROUPSTORE, ...groupsToUpdate);
    Promise.all([deletePromise, groupUpdatePromise]).then(function() {
      if (instance.groups.length) {
        self.setState({stopwatches: self.state.stopwatches, groups: self.state.groups});
      } else {
        self.setState({stopwatches: self.state.stopwatches});
      }
    });
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


      stopwatchAdapter.update(GROUPSTORE, ...updatedGroups).then(function(event) {
        self.setState({groups: self.state.groups, stopwatches: self.state.stopwatches});
      });
    });
  }

  aggregateActivityLog() {
    var stopwatches = this.state.stopwatches,
        aggregateActivities = [];
    for (var i = 0; i < stopwatches.length; i++) {
      var instance = stopwatches[i],
          name = instance.name;
      for (var j = 0; j < instance.activity.length; j++) {
        var activity = instance.activity[j],
            newActivity = {instance: name};
        for (var key in activity) {
          newActivity[key] = activity[key];
        }
        aggregateActivities.push(newActivity);
      }
    }

    return aggregateActivities;
  }

  render() {

    const aggregateActivities = this.aggregateActivityLog(),
          activityListElement = <ActivityContainerView instances={aggregateActivities} />,
          groupTabTitle = <React.Fragment><span>Groups</span> <Badge pill>{this.state.groups.length}</Badge></React.Fragment>,
          groupViewElement = <GroupContainerView instances={this.state.groups} stopwatches={this.state.stopwatches} updateInstances={this.updateGroups.bind(this)} updateStopwatches={this.updateStopwatches.bind(this)} />,
          stopwatchTabTitle = <React.Fragment><span>Stopwatches</span> <Badge pill>{this.state.stopwatches.length}</Badge></React.Fragment>,
          stopwatchViewElement = <StopwatchContainerView instances={this.state.stopwatches} groups={this.state.groups} updateInstances={this.updateStopwatches.bind(this)} deleteInstance={this.deleteStopwatch.bind(this)} addButton clone delete select/>;
    return (<ThemeContext.Provider value={themes.light}>
      <Container fluid>
        <Navbar bg="light" variant="light" expand="sm">
            <Button variant="light" onClick={this.openMenu} className="me-2"><i className='fad fa-bars fa-lg'></i></Button>
            <Navbar.Brand href="#home">Multi-Stopwatch</Navbar.Brand>
            <Nav className='me-auto'></Nav>
            <Nav>
              <ButtonGroup>
                <Button variant="outline-secondary" onClick={this.openActivityTab} ><i className="fad fa-clipboard-list fa-lg"></i></Button>
              </ButtonGroup>
            </Nav>
        </Navbar>

        <Tabs defaultActiveKey="stopwatches" id="uncontrolled-tab-example" className="mb-3">
          <Tab eventKey="groups" title={groupTabTitle}>
            {groupViewElement}
          </Tab>
          <Tab eventKey="stopwatches" title={stopwatchTabTitle}>
            {stopwatchViewElement}
          </Tab>
        </Tabs>

      </Container>

      <Offcanvas show={this.state.showMenu} onHide={this.closeMenu} placement='start'>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>

          <Tabs defaultActiveKey="stopwatches" className="mb-3">
            <Tab eventKey="groups" title={groupTabTitle}>
              <GroupMenuView instances={this.state.groups} stopwatches={this.state.stopwtches} />
            </Tab>
            <Tab eventKey="stopwatches" title={stopwatchTabTitle}>
              <StopwatchMenuView instances={this.state.stopwatches} groups={this.state.groups} updateInstances={this.updateStopwatches.bind(this)} deleteInstance={this.deleteStopwatch.bind(this)} clone delete select/>
            </Tab>
          </Tabs>

        </Offcanvas.Body>
      </Offcanvas>

      <Offcanvas show={this.state.showActivityTab} onHide={this.closeActivityTab} placement='end'>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>All Activity</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {activityListElement}
        </Offcanvas.Body>
      </Offcanvas>
    </ThemeContext.Provider>)
  }

  componentDidMount() {
    var self = this,
    stopwatchPromise = stopwatchAdapter.getAll(STOPWATCHSTORE),
        groupPromise = stopwatchAdapter.getAll(GROUPSTORE);
    Promise.all([stopwatchPromise, groupPromise]).then(function(results) {
      var stopwatches = results[0],
          groups = results[1];

      for (var i = 0; i < stopwatches.length; i++) {
        stopwatches[i] = stopwatchFromObject(stopwatches[i]);
      }
      self.setState({stopwatches: stopwatches, groups: groups});
    });
  }
}

var stopwatches = [];

ReactDOM.render(
    <App stopwatches={stopwatches} />,
  document.getElementById('app')
);
