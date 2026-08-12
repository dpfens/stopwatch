import { Component, input, computed, effect, inject, signal, ElementRef, NgZone } from '@angular/core';
import { TimeService } from '../../../services/time/time.service';
import { BrowserStateService } from '../../../services/utility/browser/browser-page.service';

@Component({
  selector: 'simple-timer',
  standalone: true,
  template: `{{ displayTime() }}`,
  styles: []
})
export class SimpleTimerComponent {
  private readonly timeService = inject(TimeService);
  private readonly browserState = inject(BrowserStateService);
  private readonly elementRef = inject(ElementRef);
  private readonly ngZone = inject(NgZone);

  getDuration = input.required<() => number>();
  isRunning = input<boolean>(false);
  includeMs = input<boolean>(true);
  
  // Internal state
  private currentDuration = signal(0);
  private intervalId?: number;
  private animationFrameId?: number;
  private shouldBeRunning = signal(false);
  private isIntersecting = signal(false);
  private intersectionObserver?: IntersectionObserver;
  
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
    this.shouldBeRunning() &&
    this.browserState.visibility.isVisible() &&
    this.isIntersecting()
  );

constructor() {
  effect(() => {
    this.shouldBeRunning.set(this.isRunning());
  });

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
    this.setupIntersectionObserver();
  }

  private startTimer(): void {
    this.stopTimer();

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

  private setupIntersectionObserver(): void {
    // Create observer with root margin to start slightly before element enters viewport
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        this.ngZone.run(() => {
          entries.forEach((entry) => this.isIntersecting.set(entry.isIntersecting));
        });
      },
      {
        threshold: 0, // Trigger as soon as any part is visible
        rootMargin: '50px' // Start observing 50px before entering viewport
      }
    );

    this.intersectionObserver.observe(this.elementRef.nativeElement);
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
    
    // Clean up intersection observer
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
      this.intersectionObserver = undefined;
    }
  }
}