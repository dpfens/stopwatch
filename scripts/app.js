(function() {
    var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame,
        connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        window.dataLayer = window.dataLayer || [];

    if (connection != null) {
        function updateConnectionStatus() {}

        updateConnectionStatus();
        connection.addEventListener('change', updateConnectionStatus);
    }

    function LocalStorageAdapter(key) {
        this.key = key
    }

    LocalStorageAdapter.prototype.save = function(data) {
        var rawData = JSON.stringify(data);
        localStorage.setItem(this.key, rawData);
    }


    LocalStorageAdapter.prototype.load = function() {
        var rawData = localStorage.getItem(this.key);
        return JSON.parse(rawData);
    }


    function Archive(key) {
        LocalStorageAdapter.call(this, key);
        this.data = [];
    }

    function StopWatchArchive(key) {
        LocalStorageAdapter.call(this, key);
        this.data = [];
    }

    StopWatchArchive.prototype.push = function(stopwatch, settings) {
        var data = {
            stopwatch : stopwatch,
            settings: settings,
        };
        this.data.push(data);
    }


    StopWatchArchive.prototype.deserialize = function() {
        var data = [];
        for (var i = 0; i < this.data.length; i++) {
            var rawStopwatchData = this.data[i].stopwatch,
                stopwatchInstance = StopWatch.from(rawStopwatchData),
                settings = this.data[i].settings;
            data.push({
                stopwatch: stopwatchInstance,
                settings: settings
            });
        }
        return data;
    }

    function Settings(key, totalDuration, splitDuration, render, locale) {
        LocalStorageAdapter.call(this, key);
        this.totalDuration = totalDuration || {};
        this.totalDuration.fontSize = this.totalDuration.fontSize || { value: 0.8, unit: 'em' };
        this.splitDuration = splitDuration || {};
        this.splitDuration.fontSize = this.splitDuration.fontSize || { value: 0.4, unit: 'em' };
        this.render = render || {};
        this.render.showControls = this.render.showControls || true;
        this.render.showSplits = this.render.showSplits || false;
        this.locale = locale || 'en-us';
    }

    if (localStorage) {
        Archive.prototype.save = function() {
            LocalStorageAdapter.prototype.save.call(this, this.data);
        }

        Archive.prototype.load = function() {
            var data = LocalStorageAdapter.prototype.load.call(this);
            if (data == null) {
                data = [];
            }
            this.data = data;
        }


        StopWatchArchive.prototype.save = function() {
            LocalStorageAdapter.prototype.save.call(this, this.data);
        }

        StopWatchArchive.prototype.load = function() {
            var data = LocalStorageAdapter.prototype.load.call(this);
            if (data == null) {
                data = [];
            }
            this.data = data;
            this.data = this.deserialize();
        }

        Settings.prototype.save = function() {
            var data = {},
            properties = ['totalDuration', 'splitDuration', 'render', 'locale'];
            for (var i = 0; i < properties.length; i++) {
                var property = properties[i];
                data[property] = this[property];
            }
            LocalStorageAdapter.prototype.save.call(this, data);
        }

        Settings.prototype.load = function() {
            var data = LocalStorageAdapter.prototype.load.call(this),
                properties = ['totalDuration', 'splitDuration', 'render', 'locale'];
            if (data == null) {
                return;
            }
            for (var i = 0; i < properties.length; i++) {
                var property = properties[i];
                if (property in data) {
                    this[property] = data[property];
                }
            }
        }
    } else {
        Archive.prototype.save = function() {}
        Archive.prototype.load = function() { return [];}

        Settings.prototype.save = function() {}

        Settings.prototype.load = function() {
            var defaultFontSize = {
                value: 1.5,
                unit: 'em'
            };
            this.locale = 'en-us';
            this.totalDuration.fontSize = fontSize;
            this.splitDuration.fontSize = fontSize;
        }
    }

    function updateOnlineStatus(event) {
        var isOnline = navigator.onLine,
            icon = navigator.onLine ? "fa-signal" : "fa-signal-slash";

        status.className = condition;
        status.innerHTML = condition.toUpperCase();

        log.insertAdjacentHTML("beforeend", "Event: " + event.type + "; Status: " + condition);
    }

    window.addEventListener('load', function() {
        var statusElement = document.getElementById("status"),
            logElement = document.getElementById("log");

        function updateOnlineStatus(event) {
            var condition = navigator.onLine ? "online" : "offline";

            if (statusElement) {
                statusElement.className = condition;
                statusElement.innerHTML = condition.toUpperCase();
            }

            if (logElement) {
                log.insertAdjacentHTML("beforeend", "Event: " + event.type + "; Status: " + condition);
            }
        }

        window.addEventListener('online',  updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
    });

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
            <div v-if="value.years && value.years !== \'00\'" class="years digit-container">{{ value.years }}</div>\
            <div v-if="value.days && value.days !== \'00\'" class="days digit-container">{{ value.days }}</div>\
            <div v-if="value.hours && value.hours !== \'00\'" class="hours digit-container">{{ value.hours }}</div>\
            <div v-if="value.minutes !== \'00\'" class="minutes digit-container">{{ value.minutes }}</div>\
            <div class="seconds digit-container">{{ value.seconds }}</div>\
            <div class="milliseconds digit-container">{{ value.milliseconds }}</div>\
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
            <td>\
                <time :class="\'localization-\' + locale" v-bind:datetime="formatDateTime(split.breakdown)">\
                <span class="years" v-if="split.breakdown.years > 0">{{ formattedValue.years }}</span>\
                <span class="days" v-if="split.breakdown.years > 0 || split.breakdown.days > 0">{{ formattedValue.days }}</span>\
                <span class="hours" v-if="split.breakdown.years > 0 || split.breakdown.days > 0 || split.breakdown.hours > 0">{{ formattedValue.hours }}</span>\
                <span class="minutes" v-if="split.breakdown.years > 0 || split.breakdown.days > 0 || split.breakdown.hours > 0 || split.breakdown.minutes > 0">{{ formattedValue.minutes }}</span>\
                <span class="seconds">{{ formattedValue.seconds }}</span>\
                <span class="milliseconds">{{ formattedValue.milliseconds }}</span>\
                </time>\
            </td>\
            <td v-if="split.metadata.labels">\
                <span v-for="label in split.metadata.labels">{{ label }}</span>\
            </td>\
            <td v-if="mutable">\
                <button v-on:click="edit"><i class="fad fa-edit"></i><span>Edit</span></button>\
                <button v-on:click="removeSplit"><i class="fad fa-trash"></i><span>Delete</span></button>\
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
            <span class="years"><input type="tel" class="years" name="years" min="0" v-model.number="years" /></span>\
            <span class="days"><input type="tel" class="days" name="days" min="0" v-model.number="days" /></span>\
            <span class="hours"><input type="tel" class="hours" name="hours" min="0" v-model.number="hours" /></span>\
            <span class="minutes"><input type="tel" class="minutes" name="minutes" min="0" v-model.number="minutes" /></span>\
            <span class="seconds"><input type="tel" class="seconds" name="seconds" min="0" v-model.number="seconds" /></span>\
            <span class="milliseconds"><input type="text" class="milliseconds" name="milliseconds" v-model.number="milliseconds" /></span>\
            <div v-if="split.metadata.labels.length > 0">\
                <h3 >Labels</h3>\
                <select v-model="split.metadata.labels" multiple>\
                    <option v-for="label in split.metadata.labels" value="{{value}}">{{ name }}</option>\
                </select>\
            </div>\
            <button v-on:click.prevent="deleteSplit(index)"><i class="fad fa-trash"></i><span>Delete</span></button>\
            <button v-on:click.prevent="save"><i class="fad fa-save"></i><span>Save</span></button>\
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
                type: Object,
                default: Object.create(new StopWatch())
            },
            'display': String,
            'showControls': Boolean,
            'showSplits': Boolean,
            'splits': {
                type: Array,
                default: function () { return [] }
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
        methods: {
            save: function() {
                this.$parent.saveStopwatches();
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
                this.$parent.saveStopwatches();
                this.startAnimation();
            },
            stopStopwatch: function() {
                var totalDuration = this.stopwatch.stop(),
                    totalDurationBreakdown = this.stopwatch.breakdown(totalDuration),
                    splitDuration = this.stopwatch.splitDuration(this.stopwatch.stopValue),
                    splitDurationBreakdown = this.stopwatch.breakdown(splitDuration);
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Stop',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.$parent.saveStopwatches();
                this.stopAnimation();
                this.currentDuration = totalDurationBreakdown;
                if (totalDuration !== splitDuration) {
                    this.splitDuration = splitDurationBreakdown;
                }
            },
            resumeStopwatch: function() {
                this.stopwatch.resume();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Resume',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.$parent.saveStopwatches();
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
                this.$parent.saveStopwatches();
                var breakdown = this.stopwatch.breakdown(0);
                this.currentDuration = breakdown;
                this.splitDuration = breakdown;
                this.splits = [];
            },
            archiveStopwatch: function () {
                this.$parent.archiveStopwatch(this.index, this.stopwatch, this.localSettings);
            },
            recordSplit: function() {
                var splitCount = this.stopwatch.splits.length,
                    split = this.stopwatch.addSplit(),
                    breakdown = this.stopwatch.breakdown(split.value);
                    split.metadata.labels = [];
                    split.metadata.annotations = [];
                    split.breakdown = breakdown;
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Split',
                    'eventAction': 'Create',
                    'eventLabel': 'Stopwatch #' + this.index
                });
                this.$parent.saveStopwatches();
            },
            updateSplit: function(index, data) {
                this.stopwatch.update(index, data.value);
                this.$parent.saveStopwatches();
            },
            deleteSplit: function(index) {
                this.stopwatch.removeSplit(index);
                this.$parent.saveStopwatches();
            },
            formatDuration: formatDuration,
            clone: function(index) {
                var instance = this.$parent.stopwatches.data[index];
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
            <button class="float-right"  v-show="!showSettings" v-on:click="showSettings = true"><i class="fad fa-cogs"></i><span>Customize</span></button>\
            <button class="float-right" v-show="showSettings" v-on:click="showSettings = false"><i class="fad fa-times"></i><span>Close</span></button>\
            <div class="clear settings" v-if="showSettings">\
                <p><label for="name">Name:</label>\
                <input type="text" placeholder="name" name="name" v-model="localSettings.name" v-on:change="save" /></p>\
                <p><label>Primary: </label>\
                <input type="color" v-model="localSettings.primaryColor" v-on:change="save" /></p>\
                \
                <p><label>Secondary:</label>\
                <input type="color" v-model="localSettings.secondaryColor" v-on:change="save" /></p>\
            </div>\
            <div class="clear" v-else>\
                <h2>{{ localSettings.name }}</h2>\
                <div class="time-display" @click="toggleStopWatch">\
                    <textdisplay v-bind:locale="settings.locale" v-bind:value="formatDuration(currentDuration)" v-bind:fontsize="settings.totalDuration.fontSize"></textdisplay>\
                    <textdisplay v-show="stopwatch.splits.length > 0" class="split" v-bind:locale="settings.locale" v-bind:value="formatDuration(splitDuration)" v-bind:fontsize="settings.splitDuration.fontSize"></textdisplay>\
                </div>\
                <div class="controls" v-if="showControls && mutable">\
                    <button v-show="!stopwatch.isActive()" v-on:click="startStopWatch()"><i class="fad fa-play"></i><span>Start</span></button>\
                    <button v-show="stopwatch.isRunning()" v-on:click="stopStopwatch()"><i class="fad fa-hand-paper"></i><span>Stop</span></button>\
                    <button v-show="stopwatch.isRunning()" v-on:click="recordSplit()">Split</button>\
                    <button v-show="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="resumeStopwatch()"><i class="fad fa-redo"></i><span>Resume</span></button>\
                    <button v-show="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="resetStopwatch()"><i class="fad fa-undo"></i><span>Reset</span></button>\
                    <button v-show="!stopwatch.isRunning() && stopwatch.isActive()" v-on:click="archiveStopwatch()"><i class="fad fa-archive"></i><span>Archive</span></button>\
                </div>\
                <table class="splits" v-show="showSplits && stopwatch.splits.length > 0 && !edittingSplit">\
                    <thead>\
                        <tr>\
                            <th>Split</th>\
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

    var settings = new Settings('settings'),
        current = new StopWatchArchive('current'),
        archive = new StopWatchArchive('archive');
    settings.load();
    current.load();
    archive.load();

    var app = new Vue({
        el: 'div#app',
        data: {
            settings: settings,
            archive: archive,
            stopwatches: current,
            currentTab: 'stopwatch',
            edittingSplit: null,
            debug: false
        },
        methods: {
            saveSettings: function(event) {
                this.settings.save();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Settings',
                    'eventAction': 'Update',
                    'eventLabel': 'Global'
                });
            },
            addStopWatch: function() {
                var newStopwatch = new StopWatch(),
                    localSettings = {
                        name: '',
                        primaryColor: null,
                        secondaryColor: null
                    },
                    stopwatchCount = this.stopwatches.data.length;
                this.stopwatches.push(newStopwatch, localSettings);
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Create',
                    'eventLabel': 'Stopwatch #' + stopwatchCount
                });
                this.saveStopwatches();
            },
            saveStopwatches: function() {
                this.stopwatches.save();
            },
            removeStopWatch: function(index) {
                this.stopwatches.data.splice(index, 1);
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Delete',
                    'eventLabel': 'Stopwatch #' + index
                });
                this.saveStopwatches();
            },
            cloneStopwatch: function(index) {

                var instance = this.stopwatches.data[index],
                    newInstanceData = JSON.parse(JSON.stringify(instance)),
                    newStopwatch = StopWatch.from(newInstanceData.stopwatch),
                    newSettings = newInstanceData.settings;
                this.stopwatches.push(newStopwatch, newSettings);
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Clone',
                    'eventLabel': 'Stopwatch #' + index
                });
                this.saveStopwatches();
            },
            archiveStopwatch: function (index, stopwatch, localSettings) {
                this.archive.push(stopwatch, localSettings);
                this.archive.save();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Archive',
                    'eventLabel': 'Stopwatch #' + index
                });
                this.stopwatches.data.splice(index, 1);
                this.saveStopwatches();
            },
            unarchiveStopwatch: function(index) {
                var instance = this.archive.data[index],
                    stopwatch = instance.stopwatch,
                    settings = instance.settings;
                this.removeArchivedStopwatch(index);
                this.stopwatches.push(stopwatch, settings);
                this.saveStopwatches();
                dataLayer.push({
                    'event': 'stopwatchEvent',
                    'eventCategory': 'Stopwatch',
                    'eventAction': 'Unarchive',
                    'eventLabel': 'Stopwatch #' + index
                });
            },
            removeArchivedStopwatch: function(index) {
                this.archive.data.splice(index, 1);
                this.archive.save();
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
})();
