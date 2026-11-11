# Epochron

A free, offline-capable, multi-stopwatch app for timing multiple people or events at once. Built for track and cross country coaches and anyone else who needs more than one timer without the enterprise price tag or advertising.

* **Live app:** https://stopwatch.dougfenstermacher.com/ 
* **About:** https://stopwatch.dougfenstermacher.com/about 


Phone stopwatches handle one timer well. Timing several runners, with different kinds of splits, quickly turns into a mess of unlabeled times. Epochron is built for that situation: multiple independent timers, clear organization, and no fighting with the tool while the race is happening.

## Features

- **Multiple independent timers:** run as many as you need, name them, and copy a running timer to start timing someone else mid-race.
- **Splits and laps:** record splits, laps, notes, and timestamps without stopping the main timer.
- **Groups:** organize timers by event, team, or session, with bulk start/stop/reset/lap/split controls.
- **Group timing modes:**
  - *Parallel:* independent timers with shared bulk controls
  - *Synchronized:* timers start and stop together
  - *Sequential:* one timer at a time, with "Next" handing off to the next leg (relays)
  - *Independent:* grouped for organization only
- **Archive and search:** archive old sessions and search your timing history.
- **Split predictions:** an analytics layer runs 15 strategies at once (rhythm detection in split gaps, activity inference from pace, round-number and lap-fraction tendencies, distance-unit detection) and surfaces the most credible predictions for upcoming splits.
- **Offline-first:** works with no internet or cell service.
- **Private by design:** no accounts, and timing data never leaves your device. Only anonymous feature-usage counts are collected.
- **Responsive:** phone, tablet, and laptop; touch or mouse; portrait or landscape.
- **Reliable:** timers keep running if you close the browser or leave the app, and state is saved automatically.

## Architecture

- **Framework:** Angular, using services and dependency injection for cross-app communication and signals for UI state.
- **Local-first storage:** all data lives in the browser's IndexedDB on the user's device. There is no backend.
- **Event-driven data model:** every action is stored as a discrete timestamped event, and state is derived from that history. This makes adding, removing, or editing splits safe, and lets new marker types fit into the existing structure.
- **Extensible analytics:** the analytics layer is strategy-based, so new analyses (trend detection, anomaly flagging, benchmarks) can be added without changing how data is collected or stored.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS) and npm
- [Angular CLI](https://angular.dev/tools/cli): `npm install -g @angular/cli`

### Install and run

```bash
npm install
ng serve
```

Open `http://localhost:4200/`. The app reloads automatically when you change source files.

### Build

```bash
ng build
```

Production build artifacts are written to `dist/`.

### Test

```bash
ng test   # unit tests (Karma)
ng e2e    # end-to-end tests (no framework configured by default)
```

### Scaffolding

```bash
ng generate component component-name
ng generate --help   # list all schematics
```

## Browser support

Any modern browser (Chrome, Safari, Firefox, Edge), tested on iPhone, Android, iPad, and laptop.

## Feedback and contributing

Bug reports, feature requests, and use cases are welcome via [GitHub Issues](https://github.com/dpfens/stopwatch/issues). I'm more interested in solving real problems than adding features nobody uses.

## Resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)