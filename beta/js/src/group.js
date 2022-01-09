class GroupItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      edit: false,
      newName: this.props.instance.name,
      errorMessage: ''
    };
  }

  edit() {
    this.setState({edit: true});
    this.props.update();
  }

  stopEditing() {
    if (!this.state.errorMessage) {
      this.setState({edit: false});
      const oldName = this.props.instance.name;

      this.props.instance.name = this.state.newName;
      const self = this;
      stopwatchAdapter.update(GROUPSTORE, this.props.instance).then(function(events) {
        self.props.update();
      });
    } else {
      this.setState({newName: this.props.instance.name, edit: false});
    }
  }

  handleNameChange(event) {
    const newValue = event.target.value;

    var errorMessage = '';
    if (newValue) {
      if (newValue.toLowerCase() === 'ungrouped') {
        errorMessage = `"ungrouped" is a reserved group name.  Please use another`;
      } else {
        for (var i = 0; i < this.props.instances.length; i++) {
          var item = this.props.instances[i];
          if (item.name === newValue && item !== this.props.instance) {
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

  render() {
    const instance = this.props.instance,
          stopwatches = this.props.stopwatches,
          editElement = this.props.edit ? <Button variant="outline-secondary" title='Edit' onClick={this.edit.bind(this, instance)}><i className="fad fa-edit fa-1x"></i></Button> : '',
          deleteElement = this.props.deleteInstance ? <Dropdown.Item variant="danger" onClick={() => this.props.deleteInstance(instance) }><i className='fad fa-trash fa-1x'></i> Delete</Dropdown.Item> : '',
          moreActionsIcon = <i className="fad fa-ellipsis-v"></i>;

    var dropdownElement = '';
    if (deleteElement) {
      dropdownElement = <DropdownButton variant='outline-secondary' align='end' title={moreActionsIcon}>
            {deleteElement}
        </DropdownButton>;
    }
    var className = this.state.edit ? 'mb-3 group-instance flippable flippable-v flipped' : 'mb-3 group-instance flippable flippable-h';
    if (this.props.className) {
      className += ' ' + this.props.className;
    }

    var errorElement;
    if (this.state.errorMessage) {
      errorElement = <Form.Control.Feedback type="invalid">{this.state.errorMessage}</Form.Control.Feedback>;
    }
    return <div className={className}>
      <div className='front'>
        <Row>
          <Col>
            <h3>{instance.name}</h3>
          </Col>
          <Col className='text-align-right'>

            <ButtonGroup>
              {editElement}
              {dropdownElement}
            </ButtonGroup>
          </Col>
        </Row>
        {this.props.children}
      </div>
      <div className='back'>
        <Container fluid>
          <Row>
            <Col>
              <div className='text-align-right'>
                <ButtonGroup >
                  <Button variant="outline-secondary" onClick={this.stopEditing.bind(this)}><i className="fad fa-times"></i></Button>
                </ButtonGroup>
              </div>

              <InputGroup className="mb-3">
                <InputGroup.Text id="name-stopwatch">Name</InputGroup.Text>
                  <FormControl
                  placeholder="Name"
                  aria-label="name stopwatch"
                  aria-describedby="name-stopwatch"
                  value={this.state.newName}
                  onChange={this.handleNameChange.bind(this)}
                  isInvalid={!!this.state.errorMessage}
                  />
                {errorElement}
              </InputGroup>
            </Col>
          </Row>
        </Container>
      </div>
    </div>;
  }
}
