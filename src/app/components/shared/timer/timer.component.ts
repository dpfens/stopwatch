import { Component, input, computed, effect, inject, signal, ElementRef, NgZone, ChangeDetectionStrategy } from '@angular/core';
import { TimeService } from '../../../services/time/time.service';
import { BrowserStateService } from '../../../services/utility/browser/browser-page.service';
import { IntersectionService, ObserverOptions } from '../../../services/utility/browser/intersection-observer.service';

const TIMER_OBSERVER_OPTIONS: ObserverOptions = { threshold: 0, rootMargin: '50% 0px' };

@Component({
  selector: 'simple-timer',
  standalone: true,
  template: `{{ displayTime() }}`,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: []
})
export class SimpleTimerComponent {
  private readonly timeService = inject(TimeService);
  private readonly browserState = inject(BrowserStateService);
  private readonly elementRef = inject(ElementRef);
  private readonly intersection = inject(IntersectionService);

  getDuration = input.required<() => number>();
  isRunning = input<boolean>(false);
  includeMs = input<boolean>(true);
  
  // Internal state
  private currentDuration = signal(0);
  private intervalId?: number;
  private animationFrameId?: number;
  private readonly isIntersecting = this.intersection.isVisible(this.elementRef.nativeElement);


  private static nextId = 0;
  private readonly instanceId = SimpleTimerComponent.nextId++;
  
  // Display the formatted time
  displayTime = computed(() => {
    const ms = this.currentDuration();
    
    try {
      const duration = this.timeService.toDurationObject(ms);
      if (this.includeMs()) {
        return this.timeService.msDurationFormatter().format(duration);
      }
      return this.timeService.durationFormatter().format(duration);
    } catch (error) {
      console.error('Error formatting duration:', error, 'ms:', ms);
      return '00:00:00';
    }
  });

  private canRun = computed(() =>
    this.browserState.visibility.isVisible() &&
    this.isIntersecting()
  );

constructor() {
  effect(() => {
    this.includeMs(); // restart the loop if precision mode changes
    if (this.canRun()) {
      this.startTimer();
    } else {
      this.stopTimer();
      this.updateDuration();
    }
  });
}

  ngAfterViewInit(): void {
    this.updateDuration();
    this.intersection.observe(this.elementRef.nativeElement, TIMER_OBSERVER_OPTIONS);
  }

  private startTimer(): void {
    this.stopTimer();
    this.updateDuration();
    if (this.includeMs()) {
      const animate = () => {
        if (!this.canRun()) {
          this.animationFrameId = undefined;
          return;
        }
        this.updateDuration();
        this.animationFrameId = requestAnimationFrame(animate);
      };
      this.animationFrameId = requestAnimationFrame(animate);
    } else {
      this.intervalId = window.setInterval(() => {
        if (!this.canRun()) {
          this.stopTimer();
          return;
        }
        this.updateDuration();
      }, 100);
    }
  }

  private stopTimer(): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = undefined;
    }
  }

  private updateDuration(): void {
    try {
      const getDurationFn = this.getDuration();
      if (typeof getDurationFn !== 'function') {
        console.error('getDuration is not a function:', getDurationFn);
        return;
      }
      
      const duration = getDurationFn();
      
      if (typeof duration !== 'number' || isNaN(duration)) {
        console.error('Invalid duration returned:', duration);
        return;
      }
      this.currentDuration.set(Math.max(0, duration));
    } catch (error) {
      console.error('Error in updateDuration:', error);
    }
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.intersection.unobserve(this.elementRef.nativeElement);
  }
}