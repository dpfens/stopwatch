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

    document.oncontextmenu = function(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }

    Vue.directive('longpress', {
        bind: function (el, binding, vNode) {
            // Make sure expression provided is a function
            if (typeof binding.value !== 'function') {
                // Fetch name of component
                const compName = vNode.context.name
                // pass warning to console
                let warn = `[longpress:] provided expression '${binding.expression}' is not a function, but has to be`
                if (compName) { warn += `Found in component '${compName}' ` }

                console.warn(warn);
            }
            el.oncontextmenu = function() {return false;};

            // Define variable
            let pressTimer = null

            // Define funtion handlers
            // Create timeout ( run function after 1s )
            let start = (e) => {

                if (e.type === 'click' && e.button !== 0) {
                    return;
                }

                if (pressTimer === null) {
                    pressTimer = setTimeout(() => {
                        // Run function
                        handler()
                    }, 1000)
                }
            }

            // Cancel Timeout
            let cancel = (e) => {
                // Check if timer has a value or not
                if (pressTimer !== null) {
                    clearTimeout(pressTimer)
                    pressTimer = null
                }
            }
            // Run Function
            const handler = (e) => {
                binding.value(e)
            }

            // Add Event listeners
            el.addEventListener("mousedown", start);
            el.addEventListener("touchstart", start);
            // Cancel timeouts if this events happen
            el.addEventListener("click", cancel);
            el.addEventListener("mouseout", cancel);
            el.addEventListener("touchend", cancel);
            el.addEventListener("touchcancel", cancel);
        }
    });

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
                data.label = this.split.label;
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
            <div class="controls">\
              <button class="stacked" v-on:click.prevent="deleteSplit(index)"><i class="fad fa-trash"></i><span>Delete</span></button>\
              <button class="stacked" v-on:click.prevent="save"><i class="fad fa-save"></i><span>Save</span></button>\
            </div>\
        </form>'
    });

    Vue.component('splitdisplay', {
        props: {
            'index': Number,
            'mutable': Boolean,
            'split': Object,
            'locale': String,
            'lapunit': String
        },
        computed: {
            breakdown: function() {
                return SplitStopwatch.breakdown(this.split.value);
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

        template: '<div :class="{\'lap\': split.distance && split.distanceUnit, \'split\': !split.distance && !split.distanceUnit }">\
            <div class="time">\
                <time :class="\'localization-\' + locale" v-bind:datetime="formatDateTime(split.breakdown)">\
                <span class="years" v-if="split.breakdown.years > 0">{{ formattedValue.years }}</span><span class="days" v-if="split.breakdown.years > 0 || split.breakdown.days > 0">{{ formattedValue.days }}</span><span class="hours" v-if="split.breakdown.years > 0 || split.breakdown.days > 0 || split.breakdown.hours > 0">{{ formattedValue.hours }}</span><span class="minutes" v-if="split.breakdown.years > 0 || split.breakdown.days > 0 || split.breakdown.hours > 0 || split.breakdown.minutes > 0">{{ formattedValue.minutes }}</span><span class="seconds">{{ formattedValue.seconds }}</span><span class="milliseconds">{{ formattedValue.milliseconds }}</span>\
                </time>\
            </div>\
            <div v-if="split.distance && lapunit" class="lap-distance">{{ split.distance }}{{ lapunit }}</div>\
            <div class="label"><span>{{ split.label }}</span></div>\
            <div v-if="split.metadata.tags.length">\
                <span v-for="label in split.metadata.tags">{{ label }}</span>\
            </div>\
            <div v-if="mutable" class="controls">\
                <button class="stacked" v-on:click="edit"><i class="fad fa-edit"></i><span>Edit</span></button>\
                <button class="stacked" v-on:click="removeSplit"><i class="fad fa-trash"></i><span>Delete</span></button>\
            </div>\
        </div>'
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
                startDuration = SplitStopwatch.breakdown(startDurationValue),
                startSplitDurationValue = this.stopwatch.splitDuration(),
                startSplitDuration = SplitStopwatch.breakdown(startSplitDurationValue);
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
          stopwatch: {
            deep: true,
            handler: function(newStopwatch) {
              this.save();
              if (newStopwatch.isRunning() && !this.animationID){
                this.startAnimation();
              }
              else if (this.animationID && !newStopwatch.isRunning()) {
                this.stopAnimation();
              }

              if(!newStopwatch.isRunning()) {
                var totalDuration = newStopwatch.totalDuration(),
                    totalDurationBreakdown = SplitStopwatch.breakdown(totalDuration),
                    splitDuration = newStopwatch.splitDuration(newStopwatch.stopValue),
                    splitDurationBreakdown = SplitStopwatch.breakdown(splitDuration);
                this.currentDuration = totalDurationBreakdown;
                if (totalDuration !== splitDuration) {
                  this.splitDuration = splitDurationBreakdown;
                }
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
                                totalDurationBreakdown = SplitStopwatch.breakdown(totalDuration),
                                splitDuration = self.stopwatch.splitDuration(now),
                                splitDurationBreakdown = SplitStopwatch.breakdown(splitDuration);
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
                                totalDurationBreakdown = SplitStopwatch.breakdown(totalDuration),
                                splitDuration = self.stopwatch.splitDuration(),
                                splitDurationBreakdown = SplitStopwatch.breakdown(splitDuration);
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
                this.animationID = null;
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
                var breakdown = SplitStopwatch.breakdown(0);
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
                    breakdown = SplitStopwatch.breakdown(split.value),
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
                this.stopwatch.updateSplit(index, data.value);
                this.save();
            },
            deleteSplit: function(index) {
                this.stopwatch.removeSplit(index);
                if(this.stopwatch.splits.length >= index) {
                  this.stopwatch.splits[index].breakdown = BasicStopwatch.breakdown(this.stopwatch.splits[index].value);
                }
                this.save();
            },
            recordLap: function() {
                var timestamp = Date.now(),
                    lap = this.stopwatch.addLap(timestamp),
                    breakdown = SplitStopwatch.breakdown(lap.value);
                    lap.metadata.tags = [];
                    lap.metadata.annotations = [];
                    lap.breakdown = breakdown;
                    lap.label = 'Lap #' + this.stopwatch.lapCount;

                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Lap',
                    'eventAction': 'Create',
                    'eventLabel': 'Stopwatch #' + this.index
                });
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
                <p><label>Lap:</label>\
                  <input v-model="stopwatch.lapDistance" type="number" min="0" />\
                  <select v-model="stopwatch.lapUnit">\
                    <optgroup label="Metric">\
                      <option value="m">Meters</option>\
                      <option value="km">Kilometers</option>\
                    </optgroup>\
                    <optgroup label="Imperial">\
                      <option value="mi">Miles</option>\
                    </optgroup>\
                  </select>\
                </p>\
                <p class="v-align-top"><label for="notes">Notes:</label>\
                <textarea name="notes" v-model="localSettings.notes" v-on:change="save" cols="18" rows="4" /></p>\
                <p><label>Background Color: </label>\
                <input type="color" v-model="localSettings.primaryColor" v-on:change="save" /></p>\
                <p><label>Text Color:</label>\
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
                    <button class="stacked right-gap" v-if="stopwatch.isRunning()" v-on:click="stopStopwatch()"><i class="fad fa-hand-paper"></i><span>Stop</span></button>\
                    <button class="stacked left-gap" v-if="stopwatch.isRunning()" v-on:click="recordSplit()">Split</button>\
                    <button class="stacked" v-if="stopwatch.isRunning() && stopwatch.lapDistance && stopwatch.lapUnit" v-on:click="recordLap()">Lap</button>\
                    <button class="stacked" v-if="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="resumeStopwatch()"><i class="fad fa-redo"></i><span>Resume</span></button>\
                    <button class="stacked" v-if="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="resetStopwatch()"><i class="fad fa-undo"></i><span>Reset</span></button>\
                    <button class="stacked" v-if="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="archiveStopwatch()"><i class="fad fa-box"></i><span>Archive</span></button>\
                </div>\
                <div :class="{\'splits-table\': true, \'splits-only-table\': !stopwatch.lapDistance || !stopwatch.lapUnit, \'lap-table\': stopwatch.lapDistance && stopwatch.lapUnit}" v-show="showSplits && stopwatch.splits.length > 0 && !edittingSplit">\
                    <div is="splitdisplay" v-for="(item, index) in stopwatch.splits" v-bind:key="index" v-bind:index="index" v-bind:split="item" v-bind:lapunit="stopwatch.lapUnit" v-bind:mutable="mutable" v-bind:locale="settings.locale"></div>\
                </div>\
                <div v-if="edittingSplit" is="splitform" v-bind:split="edittingSplit" v-bind:index="edittingSplitIndex" v-bind:locale="settings.locale"></div>\
                <div class="metadata">\
                  <p v-if="!mutable && stopwatch.metadata.createdAt">Created At: <time>{{ stopwatch.metadata.createdAt.toLocaleDateString() }} {{ stopwatch.metadata.createdAt.toLocaleTimeString() }}</time></p>\
                  <p v-if="!mutable && stopwatch.metadata.lastModified">Last Modified: <time>{{ stopwatch.metadata.lastModified.toLocaleDateString() }} {{ stopwatch.metadata.lastModified.toLocaleTimeString() }}</time></p>\
                </div>\
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

    var wakeLock = null;
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(function(wakeLock) {
        wakeLock = wakeLock;
      });

      document.addEventListener('visibilitychange', async () => {
        if (wakeLock !== null && document.visibilityState === 'visible') {
          navigator.wakeLock.request('screen').then(function(wakeLock) {
            wakeLock = wakeLock;
          });
        }
      });
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
            aggregate: false,
            selectedIndices: [],
            searchQuery: '',
            lowerBound: null,
            upperBound: null,
            debug: false,
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

                item.stopwatch = Object.setPrototypeOf(item.stopwatch, LapStopwatch.prototype);
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
        computed: {
          searchResults: function() {
            var archivedStopwatches = this.stopwatches.filter(function(item) { return item.isArchived; }),
                lowerBound, upperBound;
            if (this.lowerBound) {
              lowerBound = new Date(this.lowerBound);
            }
            if (this.upperBound) {
              upperBound = new Date(this.upperBound);
            }
            if (!this.searchQuery.trim() && !lowerBound && !upperBound) {
              return archivedStopwatches;
            }
            var results = [];
            for (var i = 0; i < archivedStopwatches.length; i++) {
              var instance = archivedStopwatches[i],
                  stopwatch = instance.stopwatch,
                  name = instance.settings.name,
                  isNameMatch = !this.searchQuery.trim() || name.indexOf(this.searchQuery) > -1,
                  metadata = stopwatch.metadata,
                  isLowerBoundMatch = !lowerBound || (metadata.createdAt > lowerBound || (metadata.lastModified && metadata.lastModified > lowerBound)),
                  isUpperBoundMatch = !upperBound || (metadata.createdAt < upperBound || (metadata.lastModified && metadata.lastModified < upperBound));
              if (isNameMatch && isLowerBoundMatch && isUpperBoundMatch) {
                results.push(instance);
              }
            }
            return results;
          },
          maxLowerBound: function() {
            if (!this.upperBound) {
              return '';
            }
            var upperBound = new Date(this.upperBound);
            return upperBound.toISOString().slice(0, -8);
          },
          minUpperBound: function() {
            if (!this.lowerBound) {
              return '';
            }
            var lowerBound = new Date(this.lowerBound);
            return lowerBound.toISOString().slice(0, -8);
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
                var newStopwatch = new LapStopwatch(),
                    localSettings = {
                        name: '',
                        primaryColor: null,
                        secondaryColor: null
                    },
                    obj = {stopwatch: newStopwatch, settings: localSettings, isArchived: false};
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
                          Object.setPrototypeOf(data.stopwatch, LapStopwatch.prototype);
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
                    newSettings = newInstanceData.settings,
                    obj = {settings: newSettings, isArchived: false},
                    newStopwatch = Object.setPrototypeOf(newInstanceData.stopwatch, LapStopwatch.prototype);
                for (var i = 0; i < newStopwatch.splits.length; i++) {
                    if(newStopwatch.splits[i].distance && newStopwatch.splits[i].distanceUnit) {
                        Object.setPrototypeOf(newStopwatch.splits[i], Lap.prototype);
                    }  else {
                        Object.setPrototypeOf(newStopwatch.splits[i], Split.prototype);
                    }
                }

                newStopwatch.metadata.createdAt = new Date();
                newStopwatch.metadata.lastModified = null;
                newStopwatch.metadata.startedAt = instance.stopwatch.metadata.startedAt;
                newStopwatch.metadata.stoppedAt = instance.stopwatch.metadata.stoppedAt;

                for (var i = 0; i < newStopwatch.splits.length; i++) {
                  newStopwatch.splits[i].metadata.createdAt = instance.stopwatch.splits[i].metadata.createdAt;
                  newStopwatch.splits[i].metadata.lastModified = instance.stopwatch.splits[i].metadata.lastModified;
                }

                if(newStopwatch.laps) {
                  for (var i = 0; i < newStopwatch.laps.length; i++) {
                    newStopwatch.laps[i].metadata.createdAt = instance.stopwatch.laps[i].metadata.createdAt;
                    newStopwatch.laps[i].metadata.lastModified = instance.stopwatch.laps[i].metadata.lastModified;
                  }
                }

                obj.stopwatch = newStopwatch;
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
                          Object.setPrototypeOf(data.stopwatch, LapStopwatch.prototype);
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
            toggleSelectMode: function() {
              this.aggregate = true;
              if ('vibrate' in navigator) {
                navigator.vibrate(100);
              }
            },
            addStopwatchToGroup: function(index) {
              if (!this.aggregate) {
                this.aggregate = true;
              }
              var existingIndex = this.selectedIndices.indexOf(index);
              if (existingIndex > -1) {
                this.selectedIndices.splice(existingIndex, 1);
              } else {
                this.selectedIndices.push(index);
              }
            },
            selectStopwatch: function(index) {
              if(!this.aggregate) {
                return;
              }
              this.addStopwatchToGroup(index);
            },
            canSelectAll: function(){
              var unarchivedStopwatchCount = 0;
              for (var i = 0; i < this.stopwatches.length; i++) {
                if(!this.stopwatches[i].isArchived) {
                  unarchivedStopwatchCount++;
                }
              }
              return unarchivedStopwatchCount - this.selectedIndices.length > 0;
            },
            unarchivedStopwatches: function() {
              var unarchivedStopwatchCount = 0;
              for (var i = 0; i < this.stopwatches.length; i++) {
                if(!this.stopwatches[i].isArchived) {
                  unarchivedStopwatchCount++;
                }
              }
              return unarchivedStopwatchCount;
            },
            selectAll: function() {
              for (var i = 0; i < this.stopwatches.length; i++) {
                if (!this.stopwatches[i].isArchived) {
                  if (this.selectedIndices.indexOf(i) === -1) {
                    this.selectedIndices.push(i);
                  }
                }
              }
            },
            canStartAll: function(){
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i],
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (stopwatch.isActive()) {
                  return false;
                }
              }
              return true;
            },
            startAll: function() {
              var now = Date.now();
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i];
                this.stopwatches[selectedIndex].stopwatch.start(now);
                this.updateStopwatch(selectedIndex);
              }
            },
            canStopAll: function(){
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i],
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (!stopwatch.isRunning()) {
                  return false;
                }
              }
              return true;
            },
            stopAll: function() {
              var now = Date.now();
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i];
                if (this.stopwatches[selectedIndex].stopwatch.isRunning()) {
                    this.stopwatches[selectedIndex].stopwatch.stop(now);
                    this.updateStopwatch(selectedIndex);
                }
              }
            },
            canResumeAll: function(){
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i],
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (!(stopwatch.isActive() && !stopwatch.isRunning())) {
                  return false;
                }
              }
              return true;
            },
            resumeAll: function() {
              var now = Date.now();
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i],
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (!stopwatch.isRunning() && stopwatch.isActive()) {
                    this.stopwatches[selectedIndex].stopwatch.resume(now);
                    this.updateStopwatch(selectedIndex);
                }
              }
            },
            canResetAll: function(){
              return true;
            },
            resetAll: function() {
              var now = Date.now();
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i],
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (stopwatch.isActive()) {
                    this.stopwatches[selectedIndex].stopwatch.reset(now);
                    this.updateStopwatch(selectedIndex);
                }
              }
            },
            canArchiveAll: function(){
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i],
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (!(stopwatch.isActive() && !stopwatch.isRunning())) {
                  return false;
                }
              }
              return true;
            },
            archiveAll: function() {
              for (var i = 0; i < this.selectedIndices.length; i++) {
                var selectedIndex = this.selectedIndices[i];
                    stopwatch = this.stopwatches[selectedIndex].stopwatch;
                if (stopwatch.isActive() && !stopwatch.isRunning()) {
                    this.archiveStopwatch(selectedIndex);
                }
              }
              this.selectedIndices = [];
            },
            exportJSONData: function() {
              downloadObjectAsJson(this.stopwatches, 'stopwatches.json')
            },
            formatDuration: formatDuration
        }
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

    function downloadObjectAsJson(exportObj, exportName){
      var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
      var downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.hidden = true;
      downloadAnchorNode.setAttribute("href",     dataStr);
      downloadAnchorNode.setAttribute("download", exportName);
      document.body.appendChild(downloadAnchorNode); // required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }

    stopwatchAdapter.getAll(stopwatchStoreName)
    .then(function(instances) {
      for(var i = 0; i < instances.length; i++) {
        Object.setPrototypeOf(instances[i].stopwatch, LapStopwatch.prototype);
        for (var j = 0; j < instances[i].stopwatch.splits.length; j++) {
          if(instances[i].stopwatch.splits[j].distance && instances[i].stopwatch.splits[j].distanceUnit) {
            Object.setPrototypeOf(instances[i].stopwatch.splits[j], Lap.prototype);
          }  else {
            Object.setPrototypeOf(instances[i].stopwatch.splits[j], Split.prototype);
          }
        }
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
