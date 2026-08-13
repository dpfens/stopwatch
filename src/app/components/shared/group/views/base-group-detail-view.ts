import { AfterViewInit, Component, computed, inject, input, PLATFORM_ID, Signal, ViewChild, ChangeDetectionStrategy, effect, viewChild } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContextualStopwatchEntity, GroupEvaluationBehavior, GroupTimingBehavior, GroupTraitPreset, IStopwatchStateController, StopwatchGroup, UniqueIdentifier } from '../../../../models/sequence/interfaces';
import { GroupPresets, ONE_MINUTE, PresetConfig, Time } from '../../../../utilities/constants';
import { TZDate } from '../../../../models/date';
import { TimeService } from '../../../../services/time/time.service';
import { GroupService } from '../../../../services/group/group.service';
import { Router } from '@angular/router';
import { StopwatchBulkOperationsService } from '../../../../services/stopwatch/bulk-operation/stopwatch-bulk-operation-service.service';
import { StopwatchService } from '../../../../services/stopwatch/stopwatch.service';
import { StopwatchStateController } from '../../../../controllers/stopwatch/stopwatch-state-controller';
import { ApplicationAnalyticsService } from '../../../../services/analytics/application-analytics.service';

import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, interval, Subject, switchMap } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, ElementRef } from '@angular/core';
import { TimeMinimizationObjective } from '../../../../models/sequence/objective';
import { CachedStopwatchStateController } from '../../../../controllers/stopwatch/cached-stopwatch-state-controller';


interface StopwatchTrendData {
  sw: ContextualStopwatchEntity;
  /** 
   * Normalized pace trend signal in [-1, 1].
   * Positive = accelerating (more unit/time), Negative = decelerating.
   * null = insufficient data (fewer than 2 events with units).
   */
  signal: number | null;
  /** The two rates used to compute the signal, for tooltip/debug display */
  rates: [number, number] | null; // [previous, latest] in unit/ms
}


@Component({
  selector: 'base-group-detail-view',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ''
})
export class BaseGroupDetailViewComponent {
  private readonly platformId = inject(PLATFORM_ID);
  protected readonly destroyRef = inject(DestroyRef);
  protected readonly service = inject(GroupService);
  protected readonly stopwatchService = inject(StopwatchService);
  private readonly bulkOpsService = inject(StopwatchBulkOperationsService);
  protected readonly snackbar = inject(MatSnackBar);
  protected readonly time = inject(TimeService);
  protected readonly router = inject(Router);
  protected readonly analyticsService = inject(ApplicationAnalyticsService);
  Math = Math;

  id = input.required<UniqueIdentifier>();
  instance = computed(() =>
    this.service.instances().find(inst => inst.id === this.id())
  );

  MILLISECOND_THRESHOLD = ONE_MINUTE;
  protected readonly aggregateRef = viewChild<ElementRef>('evaluationPanel');

  getInstance(): StopwatchGroup {
      const inst = this.instance();
      if (!inst) {
        throw new Error(`Group ${this.id()} not found`);
      }
      return inst;
  }

  // Single signal for the entire instance
  loading = this.service.isLoading;
  error = this.service.error;

  private readonly controllerMap = computed(() => {
    const map = new Map<string, IStopwatchStateController>();
    for (const sw of this.getInstance().members) {
      map.set(sw.id, new CachedStopwatchStateController(sw.state));
    }
    return map;
  });

  private getController(id: string): IStopwatchStateController {
    const controller = this.controllerMap().get(id);
    if (!controller) throw new Error(`No controller for stopwatch ${id}`);
    return controller;
  }

  preset = computed(() => {
    const presets: GroupTraitPreset[] = Object.keys(GroupPresets) as GroupTraitPreset[];
    const matchingPreset = presets.find(preset => {
      const traits: PresetConfig = GroupPresets[preset];
      return this.getInstance().traits.timing == traits.timing 
        && this.getInstance().traits.evaluation.sort().join(',') === traits.evaluation.sort().join(',')
    });
    return matchingPreset ?? 'Custom';
  });

  timingBehavior: Signal<GroupTimingBehavior> = computed(() => {
    return this.getInstance().traits.timing;
  });

  evaluationBehaviors: Signal<GroupEvaluationBehavior[]> = computed(() => {
    return this.getInstance().traits.evaluation;
  });

  /** Emits `true` when the watched element enters the viewport, `false` when it leaves. */
  private readonly visible$     = new Subject<boolean>();

  constructor() {
    // Reactively (re)attach the IntersectionObserver whenever `#evaluationPanel`
    // mounts. Unlike a `ngAfterViewInit`-only approach, this also picks up the
    // element the *first* time it appears even if it's behind a conditional
    // (`@if`/`*ngIf`) that's false during the component's initial render, and
    // it re-attaches if the element is torn down and recreated later.
    effect((onCleanup) => {
      const ref = this.aggregateRef();
      if (!ref) return;
 
      const cleanup = this.observeVisibility(ref.nativeElement);
      onCleanup(cleanup);
    });
 
    this.destroyRef.onDestroy(() => this.visible$.complete());
  }

  /**
   * Call this from the child component's template or ngAfterViewInit, passing
   * the element that wraps the live aggregate section, e.g.:
   *
   *   ngAfterViewInit() {
   *     this.observeVisibility(this.aggregateRef.nativeElement);
   *   }
   */
  protected observeVisibility(el: Element): () => void {
    if (!isPlatformBrowser(this.platformId)) return () => {};
 
    const observer = new IntersectionObserver(
      ([entry]) => this.visible$.next(entry.isIntersecting),
      { threshold: 0 }   // fires as soon as any pixel enters/leaves
    );
 
    observer.observe(el);
 
    return () => observer.disconnect();
  }

  readonly hasCumulative    = computed(() => this.hasEvaluationBehavior('cumulative'));
  readonly hasComparative   = computed(() => this.hasEvaluationBehavior('comparative'));
  readonly hasProportional  = computed(() => this.hasEvaluationBehavior('proportional'));
  readonly hasTrending      = computed(() => this.hasEvaluationBehavior('trending'));

  /**
   * Ticks at 1 Hz only while the observed element is in the viewport.
   * Stays silent (EMPTY) on SSR or before observeVisibility() is called.
   */
  protected readonly tick = toSignal(
    isPlatformBrowser(this.platformId)
      ? this.visible$.pipe(
          switchMap(visible => (visible ? interval(1000) : EMPTY))
        )
      : EMPTY,
    { initialValue: 0 }
  );

  readonly rankedWithGaps = computed(() => {
    this.tick();

    const members = this.getInstance().members;

    const snapshot = members.map(sw => {
      const controller = new StopwatchStateController(sw.state);
      return { sw, controller, elapsed: controller.getElapsedTime() };
    });

    const sharedObjective = members.find(sw => sw.objective)?.objective
      ?? new TimeMinimizationObjective();

    const ranked = snapshot.sort((a, b) =>
      // compare() returns positive if `a` is better — negate so "better" sorts first
      -sharedObjective.compare(a.sw.state, b.sw.state)
    );

    const leader = ranked.find(e => e.controller.isActive());
    const leaderTime = leader?.elapsed ?? 0;
    const total = ranked.reduce((s, e) => s + e.elapsed, 0);

    return ranked.map((entry, i) => ({
      id: entry.sw.id,
      sw: entry.sw,
      controller: entry.controller,
      gapToLeader: i === 0 ? 0 : entry.elapsed - leaderTime,
      pct: total > 0 ? (entry.elapsed / total) * 100 : 0,
    }));
  });

  // Replaces trendingData — recomputes only on new events, no tick dependency
  readonly trendById = computed(() => {
    const map = new Map<string, { signal: number | null; rates: [number, number] | null }>();
    for (const entry of this.trendingData()) {
      map.set(entry.sw.id, { signal: entry.signal, rates: entry.rates });
    }
    return map;
  });

  readonly trendingData = computed((): StopwatchTrendData[] => {
    return this.getInstance().members.map(sw => {
      const controller = this.getController(sw.id);
      
      const measurableEvents = controller.getEvents()
        .filter(e => e.unit != null)
        .sort((a, b) => a.timestamp.timestamp - b.timestamp.timestamp);

      if (measurableEvents.length < 2) return { sw, signal: null, rates: null };

      const prev = measurableEvents.at(-2)!;
      const curr = measurableEvents.at(-1)!;
      const elapsed = controller.getElapsedTimeBetweenEvents(prev.id, curr.id); // ← cached

      if (elapsed <= 0) return { sw, signal: null, rates: null };

      const beforePrev = measurableEvents.at(-3) ?? null;
      const prevElapsed = beforePrev
        ? controller.getElapsedTimeBetweenEvents(beforePrev.id, prev.id) // ← cached
        : null;

      const currRate = curr.unit!.value / elapsed;
      const prevRate = (beforePrev && prevElapsed && prevElapsed > 0)
        ? prev.unit!.value / prevElapsed
        : null;

      if (prevRate === null) return { sw, signal: null, rates: null };

      const maxRate = Math.max(currRate, prevRate);
      const signal = maxRate > 0 ? (currRate - prevRate) / maxRate : 0;

      return {
        sw,
        signal: Math.max(-1, Math.min(1, signal)),
        rates: [prevRate, currRate]
      };
    });
  });

  getTrendFillStyle(signal: number): { left: string; width: string } {
    const abs = Math.abs(signal);
    const halfWidth = (abs / 2) * 100;
    return {
      left: signal < 0 ? `${(0.5 + signal / 2) * 100}%` : '50%',
      width: `${halfWidth}%`
    };
  }

  readonly aggregateStats = computed(() => {
    const members = this.getInstance().members;

    const paces = members.map(sw => {
      const c = this.getController(sw.id);
      const elapsed = c.getElapsedTime();
      const totalUnits = c.getEvents()
        .filter(e => e.unit != null)
        .reduce((sum, e) => sum + e.unit!.value, 0);
      return elapsed > 0 && totalUnits > 0 ? elapsed / totalUnits : null;
    }).filter((p): p is number => p !== null);

    const totalUnits = members.flatMap(sw =>
      this.getController(sw.id).getEvents()
        .filter(e => e.unit != null)
        .map(e => e.unit!.value)
    ).reduce((s, u) => s + u, 0);

    const mean = paces.length
      ? paces.reduce((s, p) => s + p, 0) / paces.length
      : null;
    const median = paces.length
      ? [...paces].sort((a, b) => a - b)[Math.floor(paces.length / 2)]
      : null;
    const stdDev = mean !== null && paces.length > 1
      ? Math.sqrt(paces.reduce((s, p) => s + (p - mean) ** 2, 0) / paces.length)
      : null;

    return { totalUnits, mean, median, stdDev, sampleSize: paces.length };
  });

  isTimingBehavior(timingBehavior: GroupTimingBehavior| GroupTimingBehavior[]): boolean {
    const selectedBehavior = this.getInstance().traits.timing;
    if (Array.isArray(timingBehavior)) {
      return timingBehavior.some(behavior => behavior === selectedBehavior);
    }
    return selectedBehavior === timingBehavior;
  }

  hasEvaluationBehavior(evaluationBehavior: GroupEvaluationBehavior | GroupEvaluationBehavior[]): boolean {
    const evaluations = this.getInstance().traits.evaluation;
    if (Array.isArray(evaluationBehavior)) {
      return evaluationBehavior.every(behavior => evaluations.includes(behavior));
    }
    return evaluations.includes(evaluationBehavior);
  }

  // Replace the plain function with a computed signal
  readonly cumulativeTotalCalc = () => {
    const controllers = this.getInstance().members.map(sw => new StopwatchStateController(sw.state));
    return controllers.reduce((acc, controller) => acc + controller.getElapsedTime(), 0);
  };

  async clone() {
    const instance = this.getInstance();
    const clonedInstance = this.service.clone(instance);
    await this.service.create(clonedInstance);
    await Promise.all(
      instance.members.map(stopwatch => this.service.addMember(clonedInstance.id, stopwatch.id))
    );
    this.analyticsService.trackGroupFork(instance.id, clonedInstance.id, clonedInstance.members.length);
  }

  async delete(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const instance = this.getInstance();
    await this.service.delete(instance.id);
    this.snackbar.open(`Deleted group "${instance.annotation.title || instance.id}"`, 'Close');
    this.analyticsService.trackGroupDelete(instance.id, instance.members.length);
    // navigate away from group URL to prevent re-loading attempt
    this.router.navigate(['/group']);
    setTimeout(() => this.snackbar.dismiss(), Time.FIVE_SECONDS);
  }

  relativeTime(date: TZDate): string {
    const durationMs = date.durationFrom(TZDate.now());
    const relativeTimeInfo = this.time.getRelativeTimeInfo(durationMs);
    return this.time.relativeTimeFormatter().format(relativeTimeInfo.value, relativeTimeInfo.unit);
  }

  // Computed command availability based on group members
  readonly canStartAny = computed(() => {
    return this.bulkOpsService.canStartAny(this.getInstance().members);
  });

  readonly canStartAll = computed(() => {
    return this.bulkOpsService.canStartAll(this.getInstance().members);
  });

  // Stop actions
  readonly canStopAny = computed(() => {
    return this.bulkOpsService.canStopAny(this.getInstance().members);
  });

  readonly canStopAll = computed(() => {
    return this.bulkOpsService.canStopAll(this.getInstance().members);
  });

  // Resume actions
  readonly canResumeAny = computed(() => {
    return this.bulkOpsService.canResumeAny(this.getInstance().members);
  });

  readonly canResumeAll = computed(() => {
    return this.bulkOpsService.canResumeAll(this.getInstance().members);
  });

  // Reset actions
  readonly canResetAny = computed(() => {
    return this.bulkOpsService.canResetAny(this.getInstance().members);
  });

  readonly canResetAll = computed(() => {
    return this.bulkOpsService.canResetAll(this.getInstance().members);
  });

  // Split actions
  readonly canSplitAny = computed(() => {
    return this.bulkOpsService.canSplitAny(this.getInstance().members);
  });

  readonly canSplitAll = computed(() => {
    return this.bulkOpsService.canSplitAll(this.getInstance().members);
  });

  // Lap actions
  readonly canLapAny = computed(() => {
    return this.bulkOpsService.canLapAny(this.getInstance().members);
  });

  readonly canLapAll = computed(() => {
    return this.bulkOpsService.canLapAll(this.getInstance().members);
  });

  /**
   * Globally applicable group actions
   */
  async startAll() {
    await this.bulkOpsService.startAll(this.getInstance().members);
  }

  async resumeAll() {
    await this.bulkOpsService.resumeAll(this.getInstance().members);
  }

  async stopAll() {
    await this.bulkOpsService.stopAll(this.getInstance().members);
  }

  async resetAll() {
    await this.bulkOpsService.resetAll(this.getInstance().members);
  }

  async splitAll() {
    await this.bulkOpsService.splitAll(this.getInstance().members);
  }

  async lapAll() {
    await this.bulkOpsService.lapAll(this.getInstance().members);
  }

  /**
   * Actions unique to the "Sequential" timing behavior
   */
  async startNext() {
    const now = new Date();
    const stopwatches = this.getInstance().members;
    const runningStopwatch = stopwatches.findLast(sw => new StopwatchStateController(sw.state).isRunning());
    const inactiveStopwatch = stopwatches.find(sw => !(new StopwatchStateController(sw.state).isActive()));
    if (runningStopwatch) {
      await this.stop(runningStopwatch, now);
    }
    if (inactiveStopwatch) {
        await this.start(inactiveStopwatch, now);
    }
  }


  async start(stopwatch: ContextualStopwatchEntity, timestamp: Date) {
    const controller = new StopwatchStateController(stopwatch.state);
    controller.start(timestamp);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.stopwatchService.update({...stopwatch, metadata, state: controller.getState()});
    this.analyticsService.trackStopwatchStart(stopwatch.id, !!stopwatch.metadata.clone?.source);
  }

  async stop(stopwatch: ContextualStopwatchEntity, timestamp: Date) {
    const controller = new StopwatchStateController(stopwatch.state);
    controller.stop(timestamp);
    const metadata = {...this.getInstance().metadata};
    metadata.lastModification = {
      timestamp: TZDate.now()
    };
    await this.stopwatchService.update({...stopwatch, metadata, state: controller.getState()});
    this.analyticsService.trackStopwatchStop(stopwatch.id);
  }
}
