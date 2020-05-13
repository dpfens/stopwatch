function Display(element, config) {
  this.element = element;
  this.config = config || {};
  this.initialized = false;
  this.values = {};
}

Display.prototype.initialize = function() {}

Display.prototype.render = function(day, hour, minute, second, millisecond) {
    this.values = {
        'days': day,
        'hours': hour,
        'minutes': minute,
        'seconds': second,
        'milliseconds': millisecond
    };
}

Display.prototype.pad = function(value, places, character) {
    var character = character || '0';
    rawValueString = value.toString(),
    valueString = rawValueString.slice(0, places),
    valueLength = valueString.length;
    if (valueLength < places) {
        var newValue = '';
        for (var i = 0; i < places - valueLength; i++) {
            newValue += character;
        }
        return newValue + valueString;
    }
    return valueString;
}


function DigitalDisplay(element, config) {
  Display.call(this, element, config);
  this.config.digits = this.config.digits || {},
  this.config.digits.years = this.config.digits.years || 0,
  this.config.digits.months = this.config.digits.months || 0,
  this.config.digits.weeks = this.config.digits.weeks || 0,
  this.config.digits.days = this.config.digits.days || 0,
  this.config.digits.hours = this.config.digits.hours || 2,
  this.config.digits.minutes = this.config.digits.minutes || 2,
  this.config.digits.seconds = this.config.digits.seconds || 2,
  this.config.digits.milliseconds = this.config.digits.milliseconds || 2,
  this.config.elements = this.config.elements || {},
  this.config.elements.container = this.config.elements.container || 'div';
  this.config.localization = this.config.localization || 'en-us';
}


DigitalDisplay.prototype.initialize = function() {
  Display.prototype.initialize.call(this);
  this.element.classList.add('digital-display', 'localization-' + this.config.localization);
  var containerElementName =this.config.elements.container,
      digitElementContainers = {},
      digitElements = {};
  for (var digitName in this.config.digits) {
    var digitElementContainer = document.createElement(containerElementName),
        digitCount = this.config.digits[digitName];
        digitElementContainers[digitName] = digitElementContainer;
    // hide containers with 0 digits
    if(!this.config.digits[digitName]) {
        digitElementContainer.style.display = 'none';
    }
    digitElementContainer.classList.add(digitName, 'digit-container');
    this.element.appendChild(digitElementContainer);
  }
  this.containers = digitElementContainers;
}


DigitalDisplay.prototype._createDigit = function(parentElement, elementName, className) {
  var element = document.createElement(elementName);
  element.className = className;
  if(!element.classList.contains('digit')) {
    element.classList.add('digit');
  }
  parentElement.appendChild(element);
  return element;
}


DigitalDisplay.prototype.render = function(day, hour, minute, second, millisecond) {
    Display.prototype.render.call(this, day, hour, minute, second, millisecond);
}


function TextDisplay(element, config) {
  DigitalDisplay.call(this, element, config);
}


TextDisplay.prototype.initialize = function() {
  DigitalDisplay.prototype.initialize.call(this);
  if (!this.element.classList.contains('text-display')) {
      this.element.classList.add('text-display');
  }
  for(var digitName in this.containers) {
    var digits = this.config.digits[digitName],
    digitContainer = this.containers[digitName];
    for (var i = 0; i < digits; i++) {
      digitContainer.innerHTML += '0';
    }
  }
}


TextDisplay.prototype.render = function(day, hour, minute, second, millisecond) {
    var textContent = true;
    if (!this.containers['hours'].textContent) {
        textContent = false;
    }

    // logic to hide larger units that are not being used
    var units = ['days', 'hours', 'minutes'],
    values = [day, hour, minute],
    hide = true;
    for (var i = 0; i < units.length; i++) {
        var unit = units[i],
        value = values[i],
        currentValue = this.values[unit],
        container = this.containers[unit];
        if (value) {
            hide = false;
        }
        if (hide && !value && !currentValue && container.style.display !== 'none') {
            container.style.display = 'none';
        } else if (!hide || (value && container.style.display === 'none')) {
            container.style.display = 'inline-block';
        }
    }

    if (day !== this.values.days) {
        var daysDigits = this.config.digits.days,
            paddedDays = Display.prototype.pad.call(this, day, daysDigits);
        if (textContent) {
            this.containers['days'].textContent = paddedDays;
        } else {
            this.containers['days'].innerHTML = paddedDays;
        }
    }
    if (hour !== this.values.hours) {
        var hoursDigits = this.config.digits.hours,
        paddedHours = Display.prototype.pad.call(this, hour, hoursDigits);
        if (textContent) {
            this.containers['hours'].textContent = paddedHours;
        } else {
            this.containers['hours'].innerHTML = paddedHours;
        }
    }
    if (minute !== this.values.minutes) {
        var minutesDigits = this.config.digits.minutes,
            paddedMinutes = Display.prototype.pad.call(this, minute, minutesDigits);
        if (textContent) {
            this.containers['minutes'].textContent = paddedMinutes;
        } else {
            this.containers['minutes'].innerHTML = paddedMinutes;
        }
    }
    if (second !== this.values.seconds) {
        var secondsDigits = this.config.digits.seconds,
            paddedSeconds = Display.prototype.pad.call(this, second, secondsDigits);
        this.containers['seconds'].innerHTML = paddedSeconds;
    }
    if (millisecond !== this.values.milliseconds) {
        var millisecondsDigits = this.config.digits.milliseconds,
            paddedMilliseconds = Display.prototype.pad.call(this, millisecond, millisecondsDigits);
        if (textContent) {
            this.containers['milliseconds'].textContent = paddedMilliseconds;
        } else {
            this.containers['milliseconds'].innerHTML = paddedMilliseconds;
        }
    }
    DigitalDisplay.prototype.render.call(this, day, hour, minute, second, millisecond);
}


function LCDDisplay(element, config) {
    DigitalDisplay.call(this, element, config);
}


LCDDisplay.prototype.initialize = function() {
    DigitalDisplay.prototype.initialize.call(this);
    //this.config.digits.milliseconds = 3;
    this.element.classList.add('lcd-display');
    for (var key in this.containers) {
        var container = this.containers[key];
        digitCount = this.config.digits[key];
        for(var i = 0; i < digitCount; i++) {
            digitElement = DigitalDisplay.prototype._createDigit.call(this, container, 'div', 'zero');
            this._addMembers(digitElement);
        }
    }
}


LCDDisplay.prototype._addMembers = function (element) {
    var members = 8;
    for (var i = 1; i < members; i++) {
      var member = document.createElement('span'),
          className = 'd' + i.toString();
      member.classList.add(className);
      element.appendChild(member);
  }
};


LCDDisplay.prototype.render = function(day, hour, minute, second, millisecond) {
    if (day !== this.values.days) {
        this.render_section(this.containers['days'], day);
    }
    if (hour !== this.values.hours) {
        this.render_section(this.containers['hours'], hour);
    }

    if (minute !== this.values.minutes) {
        this.render_section(this.containers['minutes'], minute);
    }

    if (second !== this.values.seconds) {
        this.render_section(this.containers['seconds'], second);
    }
    if (millisecond !== this.values.milliseconds) {
        this.render_section(this.containers['milliseconds'], millisecond);
    }
    DigitalDisplay.prototype.render.call(this, day, hour, minute, second, millisecond);
}


LCDDisplay.prototype.render_section = function(element, value) {
    var digitElements = element.querySelectorAll('div.digit'),
        classLookup = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
        BASE = 10,
        lastDigitIndex = digitElements.length - 1;
    for (var i = 0; i < digitElements.length; i++) {
      var base = Math.pow(BASE, lastDigitIndex - i),
          renderValue = Math.floor(value / base % 10),
          className = classLookup[renderValue],
          digitElement = digitElements[i];

      if(digitElement.classList.contains(className)) {
        continue;
      }
      digitElement.classList.add(className);

      for (var j = 0; j < classLookup.length; j++) {
        if (j === renderValue) { continue; }
        var previousClassName = classLookup[j];
        digitElement.classList.remove(previousClassName);
      }
    }
}


LCDDisplay.prototype.render_section = function(element, value) {
    var digitElements = element.querySelectorAll('div.digit'),
        classLookup = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'],
        valueString = Display.prototype.pad.call(this, value, digitElements.length);
    for (var i = 0; i < digitElements.length; i++) {
      var renderValue = parseInt(valueString[i]),
      digitIndex = i,
      digitElement = digitElements[i],
      className = classLookup[renderValue];

      if(digitElement.classList.contains(className)) {
        continue;
      }
      digitElement.classList.add(className);

      for (var j = 0; j < classLookup.length; j++) {
        if (j === renderValue) { continue; }
        var previousClassName = classLookup[j];
        digitElement.classList.remove(previousClassName);
      }
    }
}


function AnalogDisplay(element) {
  Display.call(this, element);
}


AnalogDisplay.prototype.initialize = function() {
  Display.prototype.initialize.call(this);
}


AnalogDisplay.prototype.draw = function() {

}


AnalogDisplay.prototype.render = function(day, hour, minute, second, millisecond) {
    // draw clock
    Display.prototype.render.call(this, day, hour, minute, second, millisecond);
}
