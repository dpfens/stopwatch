import { Component, input, computed, effect, inject, signal, ElementRef } from '@angular/core';
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

  constructor() {
    // Track running state changes
    effect(() => {
      const running = this.isRunning();
      this.shouldBeRunning.set(running);
      if (running) {
        this.startTimerIfVisible();
      } else {
        this.stopTimer();
        this.updateDuration(); // Update once when stopped
      }
      
      this.includeMs();
    });

    // Handle browser tab visibility changes
    effect(() => {
      const isVisible = this.browserState.visibility.isVisible();
      if (isVisible && this.shouldBeRunning()) {
        this.startTimerIfVisible();
      } else if (!isVisible) {
        this.stopTimer();
      }
    });

    effect(() => {
      const hasFocus = this.browserState.visibility.hasFocus();
      if (hasFocus && this.browserState.visibility.isVisible() && this.shouldBeRunning()) {
        this.startTimerIfVisible();
      }
    });

    // Handle intersection visibility changes
    effect(() => {
      const isInView = this.isIntersecting();
      if (isInView && this.shouldBeRunning() && this.browserState.visibility.isVisible()) {
        this.startTimerIfVisible();
      } else if (!isInView) {
        this.stopTimer();
      }
    });
  }

  ngAfterViewInit(): void {
    this.updateDuration();
    this.setupIntersectionObserver();
  }

  private setupIntersectionObserver(): void {
    // Create observer with root margin to start slightly before element enters viewport
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.isIntersecting.set(entry.isIntersecting);
        });
      },
      {
        threshold: 0, // Trigger as soon as any part is visible
        rootMargin: '50px' // Start observing 50px before entering viewport
      }
    );

    this.intersectionObserver.observe(this.elementRef.nativeElement);
  }

  private startTimerIfVisible(): void {
    // Check all visibility conditions
    if (!this.browserState.visibility.isVisible() || 
        !this.shouldBeRunning() || 
        !this.isIntersecting()) {
      return;
    }

    this.stopTimer();
    
    if (this.includeMs()) {
      this.startAnimationFrameTimer();
    } else {
      this.intervalId = window.setInterval(() => {
        if (this.shouldBeRunning() && 
            this.browserState.visibility.isVisible() && 
            this.isIntersecting()) {
          this.updateDuration();
        } else {
          this.stopTimer();
        }
      }, 100);
    }
  }

  private startAnimationFrameTimer(): void {
    const animate = () => {
      if (this.shouldBeRunning() && 
          this.browserState.visibility.isVisible() && 
          this.isIntersecting()) {
        this.updateDuration();
        this.animationFrameId = requestAnimationFrame(animate);
      } else {
        this.animationFrameId = undefined;
      }
    };

    if (this.browserState.visibility.isVisible() && this.isIntersecting()) {
      this.animationFrameId = requestAnimationFrame(animate);
    }
  }

  private stopTimer(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.animationFrameId) {
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