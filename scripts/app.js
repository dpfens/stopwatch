(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        window.dataLayer = window.dataLayer || [];

    var databaseName = 'stopwatch',
        stopwatchStoreName = 'stopwatch',
        stopwatchAdapter;
    if ('indexedDB' in window) {
      class StopwatchStorageAdapter extends IndexedDBStorageAdapter {
          upgrade(event) {
              let db = event.target.result,
                  store = 'stopwatch',
                  options = {
                    keyPath: 'id',
                    autoIncrement: true
              };
              db.createObjectStore(store, options);
          }
      }

      var databaseVersion = 1;
      stopwatchAdapter = new StopwatchStorageAdapter(databaseName, databaseVersion);

    } else {
      stopwatchAdapter = new AsynchronousStorageAdapter(window.localStorage, databaseName);
    }

    var defaultDuration = {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0
    };

    Vue.component('textdisplay', {
        props: {
            'locale': String,
            'value': Object,
            'fontsize': Object
        },
        methods:{
            'formatDateTime': formatDateTime
        },
        template: '<time :class="\'display digital-display localization-\' + locale + \' text-display\'" v-bind:datetime="formatDateTime(value)" v-bind:style="{fontSize: fontsize.value + fontsize.unit }">\
            <span v-if="value.years && value.years !== \'00\'" class="years digit-container">{{ value.years }}</span><span v-if="value.days && value.days !== \'00\'" class="days digit-container">{{ value.days }}</span><span v-if="value.hours && value.hours !== \'00\'" class="hours digit-container">{{ value.hours }}</span><span v-if="value.minutes !== \'00\'" class="minutes digit-container">{{ value.minutes }}</span><span class="seconds digit-container">{{ value.seconds }}</span>\<span class="milliseconds digit-container">{{ value.milliseconds }}</span>\
        </time>'
    });

    Vue.component('splitdisplay', {
        props: {
            'index': Number,
            'mutable': Boolean,
            'split': Object,
            'locale': String
        },
        computed: {
            breakdown: function() {
                return StopWatch.prototype.breakdown.call(null, this.split.value);
            },
            formattedValue: function() {
                return formatDuration(this.breakdown);
            }
        },
        methods:{
            'formatDateTime': formatDateTime,
            'removeSplit': function() {
                this.$parent.deleteSplit(this.index);
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Split',
                    'eventAction': 'Delete',
                    'eventLabel': 'Stopwatch #' + this.$parent.index
                });
            },
            'edit': function() {
                this.$parent.edittingSplit = this.split;
                this.$parent.edittingSplitIndex = this.index;
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Split',
                    'eventAction': 'Edit',
                    'eventLabel': 'Stopwatch #' + this.$parent.index
                });
            }
        },

        template: '<tr>\
            <td>{{ index + 1 }}</td>\
            <td>{{ split.label }}</td>\
            <td>\
                <time :class="\'localization-\' + locale" v-bind:datetime="formatDateTime(split.breakdown)">\
                <span class="years" v-if="split.breakdown.years > 0">{{ formattedValue.years }}</span><span class="days" v-if="split.breakdown.years > 0 || split.breakdown.days > 0">{{ formattedValue.days }}</span><span class="hours" v-if="split.breakdown.years > 0 || split.breakdown.days > 0 || split.breakdown.hours > 0">{{ formattedValue.hours }}</span><span class="minutes" v-if="split.breakdown.years > 0 || split.breakdown.days > 0 || split.breakdown.hours > 0 || split.breakdown.minutes > 0">{{ formattedValue.minutes }}</span><span class="seconds">{{ formattedValue.seconds }}</span><span class="milliseconds">{{ formattedValue.milliseconds }}</span>\
                </time>\
            </td>\
            <td>\
                <span v-for="label in split.metadata.tags">{{ label }}</span>\
            </td>\
            <td v-if="mutable">\
                <button class="stacked" v-on:click="edit"><i class="fad fa-edit"></i><span>Edit</span></button>\
                <button class="stacked" v-on:click="removeSplit"><i class="fad fa-trash"></i><span>Delete</span></button>\
            </td>\
        </tr>'
    });

    Vue.component('splitform', {
        props: {
            index: Number,
            split: Object,
            labels: Array,
            locale: String
        },
        methods: {
            save: function() {
                var breakdown = {},
                data = JSON.parse(JSON.stringify(this.split));
                for (var key in this.split.breakdown) {
                    var value = this[key];
                    breakdown[key] = value;
                }
                data.value = toTimeStamp(breakdown);
                data.breakdown = breakdown;
                this.$parent.updateSplit(this.index, data);
                this.split.breakdown = breakdown;
                this.$parent.edittingSplit = null;
                this.$parent.edittingSplitIndex = null;

                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Split',
                    'eventAction': 'Update',
                    'eventLabel': 'StopWatch #' + this.$parent.index
                });
            },
            deleteSplit: function(index) {
                this.$parent.deleteSplit(index);
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Split',
                    'eventAction': 'Delete',
                    'eventLabel': 'Stopwatch #' + this.$parent.index
                });
            },
        },
        data: function() {
            var output = {};
            for (var key in this.split.breakdown) {
                var value = this.split.breakdown[key];
                output[key] = value;
            }
            return output;
        },
        template: '<form :class="\'localization-\' + locale + \' time-display\'">\
            <p><label>Label:</label><input type="text" v-model="split.label" /></p>\
            <p>Split: <span class="years"><input type="tel" class="years" name="years" min="0" v-model.number="years" /></span>\
            <span class="days"><input type="tel" class="days" name="days" min="0" v-model.number="days" /></span>\
            <span class="hours"><input type="tel" class="hours" name="hours" min="0" v-model.number="hours" /></span>\
            <span class="minutes"><input type="tel" class="minutes" name="minutes" min="0" v-model.number="minutes" /></span>\
            <span class="seconds"><input type="tel" class="seconds" name="seconds" min="0" v-model.number="seconds" /></span>\
            <span class="milliseconds"><input type="tel" class="milliseconds" name="milliseconds" v-model.number="milliseconds" /></span></p>\
            <div v-if="split.metadata.tags">\
                <h3 >Tags</h3>\
                <select v-model="split.metadata.tags" multiple>\
                    <option v-for="label in split.metadata.tags" value="{{value}}">{{ name }}</option>\
                </select>\
            </div>\
            <button class="stacked" v-on:click.prevent="deleteSplit(index)"><i class="fad fa-trash"></i><span>Delete</span></button>\
            <button class="stacked" v-on:click.prevent="save"><i class="fad fa-save"></i><span>Save</span></button>\
        </form>'
    });

    Vue.component('stopwatch', {
        props: {
            'index': {
                type: Number
            },
            'name': {
                type: String
            },
            'stopwatch': {
                type: Object
            },
            'display': String,
            'showControls': Boolean,
            'showSplits': Boolean,
            'splits': {
                type: Array
            },
            'primaryColor': String,
            'secondaryColor': String,
            'settings': Object,
            'localSettings': Object,
            'mutable': Boolean
        },
        data: function() {
            var display = 'textdisplay',
                showControls = this.showControls,
                primaryColor = this.primaryColor,
                secondaryColor = this.secondaryColor;
            if (this.stopwatch.isActive()) {
                startDurationValue = this.stopwatch.totalDuration(),
                startDuration = this.stopwatch.breakdown(startDurationValue),
                startSplitDurationValue = this.stopwatch.splitDuration(),
                startSplitDuration = this.stopwatch.breakdown(startSplitDurationValue);
            } else {
                startDuration = Object.create(defaultDuration),
                startSplitDuration = Object.create(defaultDuration)
            }
            return {
                index: this.index,
                display: display,
                showControls: showControls,
                primaryColor: primaryColor,
                secondaryColor: secondaryColor,
                currentDuration: startDuration,
                splitDuration: startSplitDuration,
                animationID : null,
                showSettings: false,
                edittingSplit: null,
            };
        },
        watch: {
          stopwatch: function(newStopwatch, oldStopwatch) {
            if (newStopwatch.isRunning() && !oldStopwatch.isRunning()){
              this.startAnimation();
            }
            else if (oldStopwatch.isRunning() && !newStopwatch.isRunning()) {
              this.stopAnimation();
            }

            if(!newStopwatch.isRunning()) {
              var totalDuration = newStopwatch.totalDuration(),
                  totalDurationBreakdown = newStopwatch.breakdown(totalDuration),
                  splitDuration = newStopwatch.splitDuration(newStopwatch.stopValue),
                  splitDurationBreakdown = newStopwatch.breakdown(splitDuration);
              this.currentDuration = totalDurationBreakdown;
              if (totalDuration !== splitDuration) {
                this.splitDuration = splitDurationBreakdown;
              }
            }

          }
        },
        methods: {
            save: function() {
              this.$parent.updateStopwatch(this.index);
            },
            toggleStopWatch: function(event) {
                var isRunning = this.stopwatch.isRunning(),
                    isActive = this.stopwatch.isActive();
                if (!this.mutable) {
                    return;
                }
                if(!isActive) {
                    this.startStopWatch();
                } else if (isActive && isRunning) {
                    this.stopStopwatch();
                } else if (isActive && !isRunning) {
                    this.resumeStopwatch();
                }
            },
            startAnimation: function() {
                var self = this;
                if(requestAnimationFrame) {
                    var renderer = function(timestamp) {
                        if (!self.stopwatch.isRunning()) {
                            return;
                        }
                        if(!self.showSettings && self.$parent.currentTab === 'stopwatch') {
                            var now = Date.now(),
                                totalDuration = self.stopwatch.totalDuration(now),
                                totalDurationBreakdown = self.stopwatch.breakdown(totalDuration),
                                splitDuration = self.stopwatch.splitDuration(now),
                                splitDurationBreakdown = self.stopwatch.breakdown(splitDuration);
                            self.currentDuration = totalDurationBreakdown;
                            if (totalDuration !== splitDuration) {
                                self.splitDuration = splitDurationBreakdown;
                            }
                        }
                        requestAnimationFrame(renderer);
                    }
                    this.animationID = requestAnimationFrame(renderer);
                } else {
                    var self = this,
                    renderer = function() {

                        if (!self.showSettings && self.$parent.currentTab === 'stopwatch') {
                            var totalDuration = self.stopwatch.totalDuration(),
                                totalDurationBreakdown = self.stopwatch.breakdown(totalDuration),
                                splitDuration = self.stopwatch.splitDuration(),
                                splitDurationBreakdown = self.stopwatch.breakdown(splitDuration);
                            self.currentDuration = totalDurationBreakdown;
                            if (totalDuration !== splitDuration) {
                                self.splitDuration = splitDurationBreakdown;
                            }
                        }
                    }
                    this.animationID = setInterval(renderer, 17);
                }
            },
            stopAnimation: function() {
                if (!this.animationID) {
                    return;
                }
                if (requestAnimationFrame) {
                    cancelAnimationFrame(this.animationID);
                } else {
                    clearInterval(this.animationID);
                }
            },
            startStopWatch: function() {
                this.stopwatch.start();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Start',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.save();
                this.startAnimation();
            },
            stopStopwatch: function() {
                this.stopwatch.stop(),
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Stop',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.save();
                this.stopAnimation();
            },
            resumeStopwatch: function() {
                this.stopwatch.resume();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Resume',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.save();
                this.startAnimation();
            },
            resetStopwatch: function() {
                this.stopwatch.reset();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Reset',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.save();
                var breakdown = this.stopwatch.breakdown(0);
                this.currentDuration = breakdown;
                this.splitDuration = breakdown;
                this.splits = [];
            },
            archiveStopwatch: function () {
                this.$parent.archiveStopwatch(this.index);
            },
            recordSplit: function() {
                var splitCount = this.stopwatch.splits.length,
                    split = this.stopwatch.addSplit(),
                    breakdown = this.stopwatch.breakdown(split.value),
                    splitNumber = splitCount + 1;
                    split.metadata.tags = [];
                    split.metadata.annotations = [];
                    split.breakdown = breakdown;
                    split.label = 'Split #' + splitNumber;
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Split',
                    'eventAction': 'Create',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.save();
            },
            updateSplit: function(index, data) {
                this.stopwatch.update(index, data.value);
                this.save();
            },
            deleteSplit: function(index) {
                this.stopwatch.removeSplit(index);
                this.save();
            },
            formatDuration: formatDuration,
            clone: function(index) {
                var instance = this.$parent.stopwatches[index];
                this.$parent.cloneStopwatch(instance);
            },
            deleteStopwatch: function(index) {
                this.$parent.removeStopWatch(index);
            }
        },
        created: function() {
            if (this.stopwatch.isRunning()) {
                this.startAnimation();
            }
        },
        template: '<div v-bind:style="{ color: localSettings.secondaryColor, background: localSettings.primaryColor }">\
            <slot></slot>\
            <div class="float-right controls"> \
              <button class="stacked" v-if="!showSettings" v-on:click="showSettings = true"><i class="fad fa-cogs"></i><span>Customize</span></button>\
              <button class="stacked" v-if="showSettings" v-on:click="showSettings = false"><i class="fad fa-times"></i><span>Close</span></button>\
            </div>\
            <form class="clear settings" v-if="showSettings">\
                <p><label for="name">Name:</label>\
                <input type="text" placeholder="name" name="name" v-model="localSettings.name" v-on:change="save" /></p>\
                <p><label>Primary Color: </label>\
                <input type="color" v-model="localSettings.primaryColor" v-on:change="save" /></p>\
                \
                <p><label>Secondary Color:</label>\
                <input type="color" v-model="localSettings.secondaryColor" v-on:change="save" /></p>\
            </form>\
            <div class="clear" v-else>\
                <h2 class="text-center">{{ localSettings.name }}</h2>\
                <div class="time-display" @click="toggleStopWatch">\
                    <textdisplay v-bind:locale="settings.locale" v-bind:value="formatDuration(currentDuration)" v-bind:fontsize="settings.totalDuration.fontSize"></textdisplay>\
                    <textdisplay v-show="stopwatch.splits.length > 0" class="split" v-bind:locale="settings.locale" v-bind:value="formatDuration(splitDuration)" v-bind:fontsize="settings.splitDuration.fontSize"></textdisplay>\
                </div>\
                <div class="controls" v-if="showControls && mutable">\
                    <button class="stacked" v-if="!stopwatch.isActive()" v-on:click="startStopWatch()"><i class="fad fa-play"></i><span>Start</span></button>\
                    <button class="stacked stop" v-if="stopwatch.isRunning()" v-on:click="stopStopwatch()"><i class="fad fa-hand-paper"></i><span>Stop</span></button>\
                    <button class="stacked split" v-if="stopwatch.isRunning()" v-on:click="recordSplit()">Split</button>\
                    <button class="stacked" v-if="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="resumeStopwatch()"><i class="fad fa-redo"></i><span>Resume</span></button>\
                    <button class="stacked" v-if="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="resetStopwatch()"><i class="fad fa-undo"></i><span>Reset</span></button>\
                    <button class="stacked" v-if="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="archiveStopwatch()"><i class="fad fa-archive"></i><span>Archive</span></button>\
                </div>\
                <table class="splits" v-show="showSplits && stopwatch.splits.length > 0 && !edittingSplit">\
                    <thead>\
                        <tr>\
                            <th>Split</th>\
                            <th>Label</th>\
                            <th>Value</th>\
                        </tr>\
                    </thead>\
                    <tbody>\
                        <tr is="splitdisplay" v-for="(item, index) in stopwatch.splits" v-bind:key="index" v-bind:index="index" v-bind:split="item" v-bind:mutable="mutable" v-bind:locale="settings.locale"></tr>\
                    <tbody>\
                </table>\
                <div v-if="edittingSplit" is="splitform" v-bind:split="edittingSplit" v-bind:index="edittingSplitIndex" v-bind:locale="settings.locale"></splitform>\
            </div>\
        </div>'
    });

    var defaultSettings = {
      totalDuration:
        {fontSize: {
          value:"0.6",
          unit:"em"
        }
      },
      splitDuration: {
        fontSize: {
          value: 0.4,
          unit:"em"
        }
      },
      render: {
        showControls:true,
        showSplits:true
      },
      locale:"en-us"
    },
    appSettings = localStorage.getItem('settings');
    if (appSettings) {
      appSettings = JSON.parse(appSettings);
    } else {
      appSettings = defaultSettings;
    }

    if ('BroadcastChannel' in window) {
        var settingsChannel = new BroadcastChannel('settings'),
            stopwatchChannel = new BroadcastChannel('stopwatch');

    } else {
      splitChannel = settingsChannel = stopwatchChannel = null;
    }

    var app = new Vue({
        el: 'div#app',
        data: {
            settings: defaultSettings,
            stopwatches: [],
            currentTab: 'stopwatch',
            edittingSplit: null,
            storage: {
              quota: 0.0,
              usage: 0.0
            },
            debug: false
        },
        mounted: function() {
          var self = this;
          if (settingsChannel) {
              settingsChannel.onmessage = function(event) {
                self.settings = event.data;
              }
          }

          if (stopwatchChannel) {
              stopwatchChannel.onmessage = function(event) {
                var index = event.data.index,
                    action = event.data.action,
                    item = event.data.item;

                item.stopwatch = StopWatch.from(item.stopwatch);
                if (action === 'create') {
                  self.stopwatches.push(item);
                } else if (action === 'delete') {
                  self.stopwatches.splice(index, 1);
                } else {
                  self.$set(self.stopwatches, index, item);
                }

              }
          }
        },
        methods: {
            saveSettings: function(event) {
                localStorage.setItem('settings', JSON.stringify(this.settings));
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Settings',
                    'eventAction': 'Update',
                    'eventLabel': 'Global'
                });
                if(settingsChannel) {
                  settingsChannel.postMessage(this.settings);
                }
            },
            _addStopWatch: function() {
                var newStopwatch = new StopWatch(),
                    localSettings = {
                        name: '',
                        primaryColor: null,
                        secondaryColor: null
                    },
                    obj = {stopwatch: newStopwatch, settings: localSettings};
                return stopwatchAdapter.add(stopwatchStoreName, obj);
            },
            addStopWatch: function() {
                var addStopwatchPromise = this._addStopWatch(),
                    self = this;
                addStopwatchPromise.then(function(events) {
                  for (var i = 0; i < events.length; i++) {
                    var event = events[i],
                        id = event.target.result;
                    stopwatchAdapter.get(stopwatchStoreName, id)
                    .then(function (getEvents) {
                      var getEvent = getEvents[0],
                          data = getEvent.target.result;
                          data.stopwatch = StopWatch.from(data.stopwatch);
                          self.stopwatches.push(data);

                          dataLayer.push({
                              'event': 'stopwatchEvent',
                              'eventCategory': 'Stopwatch',
                              'eventAction': 'Create',
                              'eventLabel': 'Stopwatch #' + data.id
                          });

                          if (stopwatchChannel) {
                            var data = {
                              'action': 'create',
                              'item': data,
                              'index': self.stopwatches.length - 1
                            }
                            stopwatchChannel.postMessage(data);
                          }
                    });

                  }
                });
            },
            _removeStopWatch: function(index) {
              var instance = this.stopwatches[index];
              this.stopwatches.splice(index, 1);
              return stopwatchAdapter.delete(stopwatchStoreName, instance.id);
            },
            removeStopWatch: function(index) {
              var instance = this.stopwatches[index];
              this._removeStopWatch(index).then(function() {
                  dataLayer.push({
                      'event': 'stopwatchEvent',
                      'eventCategory': 'Stopwatch',
                      'eventAction': 'Delete',
                      'eventLabel': 'Stopwatch #' + instance.id
                  });
                  if (stopwatchChannel) {
                    var data = {
                      'action': 'delete',
                      'item': instance,
                      'index': index
                    };
                    stopwatchChannel.postMessage(data);
                  }
              });
            },
            _cloneStopwatch: function(index) {
                var instance = this.stopwatches[index],
                    newInstanceData = JSON.parse(JSON.stringify(instance)),
                    newStopwatch = StopWatch.from(newInstanceData.stopwatch),
                    newSettings = newInstanceData.settings,
                    obj = {stopwatch: newStopwatch, settings: newSettings};
                return stopwatchAdapter.add(stopwatchStoreName, obj);
            },
            cloneStopwatch: function(index) {
                var self = this;
                this._cloneStopwatch(index)
                .then(function(events) {
                  for (var i = 0 ; i < events.length; i++) {
                    var event = events[i],
                        id = event.target.result;
                    stopwatchAdapter.get(stopwatchStoreName, id)
                    .then(function(getEvents) {
                      var getEvent = getEvents[0],
                          data = getEvent.target.result;
                          data.stopwatch = StopWatch.from(data.stopwatch);
                      self.stopwatches.push(data);
                    });
                  }

                  dataLayer.push({
                      'event': 'stopwatchEvent',
                      'eventCategory': 'Stopwatch',
                      'eventAction': 'Clone',
                      'eventLabel': 'Stopwatch #' + index
                  });
                });
            },
            updateStopwatch: function(index) {
                var data = this.stopwatches[index];
                stopwatchAdapter.update(stopwatchStoreName, data);
                if (stopwatchChannel) {
                  var data = {
                    'action': 'update',
                    'item': data,
                    'index': index
                  };
                  stopwatchChannel.postMessage(data);
                }
            },
            archiveStopwatch: function (index) {
                var instance = this.stopwatches[index];
                instance.isArchived = true;
                stopwatchAdapter.update(stopwatchStoreName, instance)
                .then(function () {
                  dataLayer.push({
                      'event': 'stopwatchEvent',
                      'eventCategory': 'Stopwatch',
                      'eventAction': 'Archive',
                      'eventLabel': 'Stopwatch #' + index
                  });

                  if (stopwatchChannel) {
                    var data = {
                      'action': 'update',
                      'item': instance,
                      'index': index
                    };
                    stopwatchChannel.postMessage(data);
                  }
                });
            },
            unarchiveStopwatch: function(index) {
              var instance = this.stopwatches[index];
              instance.isArchived = false;
              stopwatchAdapter.update(stopwatchStoreName, instance)
              .then(function() {
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Unarchive',
                    'eventLabel': 'Stopwatch #' + index
                });
                if (stopwatchChannel) {
                  var data = {
                    'action': 'update',
                    'item': instance,
                    'index': index
                  };
                  stopwatchChannel.postMessage(data);
                }
              });
            },
            formatDuration: formatDuration
        }
    });

    Vue.component('lcddisplay', {
        data: function () {
            return {
                count: 0
            }
        },
        template: '<time>\
            <td>{{ row }}</td>\
            <td>\
                <span class="digit-container" v-if="day > 0"></span>\
                <span class="digit-container" v-if="hour > 0"></span>\
                <span class="digit-container" v-if="minute > 0"></span>\
                <span class="digit-container" v-if="second > 0"></span>\
                <span class="digit-container" v-if="millisecond > 0"></span>\
            </td>\
        </tr>'
    });

    function formatDateTime(value) {
        var output = 'P',
        years = parseInt(value.years),
        days = parseInt(value.days),
        hours = parseInt(value.hours),
        minutes = parseInt(value.minutes),
        seconds = parseInt(value.seconds),
        milliseconds = parseInt(value.milliseconds)
        if(years) {
            output += parseInt(years) + 'Y';
        }
        if(days) {
            output += parseInt(days) + 'D';

        }
        if(hours || minutes || seconds || milliseconds) {
            output += 'T';
        }
        if(hours) {
            output += parseInt(hours) + 'H';
        }
        if(minutes) {
            output += parseInt(minutes) + 'M';
        }
        output += seconds + '.' + milliseconds + 'S';
        return output;
    }

    function formatDuration(value) {
        var output = {};
        for (var key in value) {
            var rawValue = value[key],
            formattedValue = rawValue.toString();
            if (rawValue < 10) {
                formattedValue = '0' + rawValue;
            }
            output[key] = formattedValue;
        }
        var milliseconds = value.milliseconds;
        if (milliseconds >= 10 && milliseconds < 100) {
            output['milliseconds'] = '0' + milliseconds;
        } else if (milliseconds < 10) {
            output['milliseconds'] = '00' + milliseconds;
        } else {
            output['milliseconds'] = milliseconds.toString();
        }
        return output;
    }

    function toTimeStamp(breakdown) {
        var output = breakdown.milliseconds;
        output += breakdown.seconds * 1000;
        output += breakdown.minutes * 60000;
        output += breakdown.hours * 3600000;
        output += breakdown.days * 86400000;
        output += breakdown.years * 31536000000;
        return output;
    }

    stopwatchAdapter.getAll(stopwatchStoreName)
    .then(function(instances) {
      for(var i = 0; i < instances.length; i++) {
        instances[i].stopwatch = StopWatch.from(instances[i].stopwatch);
      }
      app.stopwatches = instances;
    });

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function(estimation) {
        app.storage = estimation;
      });
    }

    if (navigator.share) {
      var shareElement = document.querySelector('a#toggle-share');
      shareElement.addEventListener('click', function(event) {
        event.preventDefault();
        var shareData = {
          'url': window.location.href,
          'title': document.title,
          'text': 'A better, offline-capable multi-stopwatch'
        }
        navigator.share(shareData).then(function(event) {});
      });
      shareElement.hidden = false;
    }
})();
