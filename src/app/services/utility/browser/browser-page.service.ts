import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, merge, animationFrameScheduler, auditTime, throttleTime, map, startWith, distinctUntilChanged, pairwise, EMPTY } from 'rxjs';

/**
 * Service for tracking document visibility and page lifecycle
 */
@Injectable({
  providedIn: 'root'
})
export class PageVisibilityService {
  // Document visibility state using native DocumentVisibilityState type
  readonly visibilityState = toSignal(
    fromEvent(document, 'visibilitychange').pipe(
      startWith(null),
      map(() => document.visibilityState),
      distinctUntilChanged()
    ),
    { initialValue: document.visibilityState }
  );

  readonly isVisible = computed(() => this.visibilityState() === 'visible');
  readonly isHidden = computed(() => this.visibilityState() === 'hidden');

  // Page focus tracking
  private readonly focusEvents$ = merge(
    fromEvent(window, 'focus').pipe(map(() => true)),
    fromEvent(window, 'blur').pipe(map(() => false))
  );

  readonly hasFocus = toSignal(
    this.focusEvents$.pipe(
      startWith(document.hasFocus()),
      distinctUntilChanged()
    ),
    { initialValue: document.hasFocus() }
  );

  // Track time page has been visible/hidden
  readonly visibleTime = signal(0);
  readonly hiddenTime = signal(0);
  private lastVisibilityChange = Date.now();
  private visibilityTimer?: number;

  // Page lifecycle events (if supported)
  readonly lifecycleState = toSignal(
    typeof document !== 'undefined' && 'onfreeze' in document
      ? merge(
          fromEvent(document, 'freeze').pipe(map(() => 'frozen' as const)),
          fromEvent(document, 'resume').pipe(map(() => 'active' as const)),
          fromEvent(window, 'pagehide').pipe(map(() => 'terminated' as const)),
          fromEvent(window, 'pageshow').pipe(map(() => 'active' as const))
        ).pipe(startWith('active' as const))
      : EMPTY,
    { initialValue: 'active' as 'active' | 'frozen' | 'terminated' }
  );

  // Detect if page was loaded from back/forward cache
  readonly wasRestoredFromBFCache = toSignal(
    fromEvent<PageTransitionEvent>(window, 'pageshow').pipe(
      map(e => e.persisted),
      startWith(false)
    ),
    { initialValue: false }
  );

  constructor() {
    // Track visibility time
    this.visibilityTimer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.lastVisibilityChange;
      
      if (this.isVisible()) {
        this.visibleTime.update(v => v + elapsed);
      } else {
        this.hiddenTime.update(v => v + elapsed);
      }
      
      this.lastVisibilityChange = now;
    }, 1000);

    // Log visibility changes
    effect(() => {
      const state = this.visibilityState();
    });
  }

  ngOnDestroy() {
    if (this.visibilityTimer) {
      clearInterval(this.visibilityTimer);
    }
  }
}

/**
 * Service for tracking scroll position and behavior
 */
@Injectable({
  providedIn: 'root'
})
export class ScrollStateService {
  // Current scroll position
  readonly scrollPosition = toSignal(
    fromEvent(window, 'scroll', { passive: true }).pipe(
      startWith(null),
      throttleTime(0, animationFrameScheduler),
      map(() => ({
        x: window.scrollX,
        y: window.scrollY
      })),
      distinctUntilChanged((a, b) => a.x === b.x && a.y === b.y)
    ),
    { initialValue: { x: window.scrollX, y: window.scrollY } }
  );

  readonly scrollX = computed(() => this.scrollPosition().x);
  readonly scrollY = computed(() => this.scrollPosition().y);

  // Scroll direction tracking
  readonly scrollDirection = toSignal(
    fromEvent(window, 'scroll', { passive: true }).pipe(
      throttleTime(0, animationFrameScheduler),
      map(() => window.scrollY),
      pairwise(),
      map(([prev, curr]) => {
        if (curr > prev) return 'down' as const;
        if (curr < prev) return 'up' as const;
        return 'none' as const;
      }),
      distinctUntilChanged()
    ),
    { initialValue: 'none' as 'up' | 'down' | 'none' }
  );

  readonly isScrollingUp = computed(() => this.scrollDirection() === 'up');
  readonly isScrollingDown = computed(() => this.scrollDirection() === 'down');

  // Scroll percentage
  readonly scrollPercentage = computed(() => {
    const pos = this.scrollPosition();
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    ) - window.innerHeight;
    
    if (height <= 0) return 0;
    return Math.round((pos.y / height) * 100);
  });

  // Detect if at top/bottom
  readonly isAtTop = computed(() => this.scrollY() === 0);
  readonly isAtBottom = computed(() => {
    const scrollHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    return this.scrollY() + window.innerHeight >= scrollHeight - 1;
  });

  // Track scroll velocity
  readonly scrollVelocity = toSignal(
    fromEvent(window, 'scroll', { passive: true }).pipe(
      auditTime(100),
      pairwise(),
      map(([prev, curr]) => {
        const timeDelta = 100; // ms
        const prevY = (prev.target as Window).scrollY;
        const currY = (curr.target as Window).scrollY;
        return Math.abs(currY - prevY) / timeDelta; // pixels per ms
      }),
      distinctUntilChanged()
    ),
    { initialValue: 0 }
  );

  readonly isScrolling = computed(() => this.scrollVelocity() > 0);

  // Smooth scroll to position
  scrollTo(options: ScrollToOptions) {
    window.scrollTo({
      behavior: 'smooth',
      ...options
    });
  }

  scrollToTop() {
    this.scrollTo({ top: 0 });
  }

  scrollToBottom() {
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    this.scrollTo({ top: height });
  }
}


/**
 * Service for tracking fullscreen state
 */
@Injectable({
  providedIn: 'root'
})
export class FullscreenService {
  // Using native Document type's fullscreen properties
  readonly isFullscreen = toSignal(
    merge(
      fromEvent(document, 'fullscreenchange'),
      fromEvent(document, 'webkitfullscreenchange'),
      fromEvent(document, 'mozfullscreenchange'),
      fromEvent(document, 'MSFullscreenChange')
    ).pipe(
      startWith(null),
      map(() => !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )),
      distinctUntilChanged()
    ),
    { initialValue: !!document.fullscreenElement }
  );

  readonly fullscreenElement = toSignal(
    merge(
      fromEvent(document, 'fullscreenchange'),
      fromEvent(document, 'webkitfullscreenchange'),
      fromEvent(document, 'mozfullscreenchange'),
      fromEvent(document, 'MSFullscreenChange')
    ).pipe(
      startWith(null),
      map((): Element | null => 
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement ||
        null
      ),
      distinctUntilChanged()
    ),
    { initialValue: document.fullscreenElement }
  );

  readonly isFullscreenAvailable = computed(() => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  });

  /**
   * Request fullscreen for an element
   */
  async requestFullscreen(element: Element): Promise<void> {
    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to request fullscreen:', error);
      throw error;
    }
  }

  /**
   * Exit fullscreen
   */
  async exitFullscreen(): Promise<void> {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      throw error;
    }
  }

  /**
   * Toggle fullscreen for an element
   */
  async toggleFullscreen(element: Element): Promise<void> {
    if (this.isFullscreen()) {
      await this.exitFullscreen();
    } else {
      await this.requestFullscreen(element);
    }
  }
}


/**
 * Service for tracking user idle state
 */
@Injectable({
  providedIn: 'root'
})
export class IdleDetectionService {
  private readonly IDLE_THRESHOLD = 60000; // 1 minute default
  private idleTimer?: number;
  private lastActivity = Date.now();
  
  readonly isIdle = signal(false);
  readonly idleTime = signal(0);
  readonly lastActivityTime = signal(Date.now());

  // Activity events to track
  private readonly activityEvents = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ] as const;

  // Track if using native Idle Detection API (if available)
  readonly hasNativeIdleDetection = 'IdleDetector' in window;
  private idleDetector?: any; // IdleDetector type not yet in TypeScript

  constructor() {
    this.setupActivityTracking();
    
    // Use native Idle Detection API if available and permitted
    if (this.hasNativeIdleDetection) {
      this.setupNativeIdleDetection();
    }
  }

  private setupActivityTracking() {
    // Track activity
    const activity$ = merge(
      ...this.activityEvents.map(event => 
        fromEvent(document, event, { passive: true })
      )
    ).pipe(
      throttleTime(1000) // Throttle to reduce processing
    );

    activity$.subscribe(() => {
      this.onActivity();
    });

    // Check idle state periodically
    this.idleTimer = window.setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.lastActivity;
      
      this.idleTime.set(timeSinceActivity);
      
      if (timeSinceActivity >= this.IDLE_THRESHOLD && !this.isIdle()) {
        this.isIdle.set(true);
      }
    }, 1000);
  }

  private async setupNativeIdleDetection() {
    try {
      // Check if we have permission
      const { state } = await (navigator as any).permissions.query({
        name: 'idle-detection'
      });

      if (state === 'granted') {
        const { IdleDetector } = window as any;
        this.idleDetector = new IdleDetector();
        
        this.idleDetector.addEventListener('change', () => {
          const { userState, screenState } = this.idleDetector;
          this.isIdle.set(userState === 'idle' || screenState === 'locked');
        });

        await this.idleDetector.start({
          threshold: this.IDLE_THRESHOLD,
          signal: new AbortController().signal
        });
      }
    } catch (err) {
      console.log('Native Idle Detection not available:', err);
    }
  }

  private onActivity() {
    const now = Date.now();
    this.lastActivity = now;
    this.lastActivityTime.set(now);
    
    if (this.isIdle()) {
      this.isIdle.set(false);
      this.idleTime.set(0);
    }
  }

  setIdleThreshold(ms: number) {
    (this as any).IDLE_THRESHOLD = ms;
  }

  ngOnDestroy() {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
    }
    
    if (this.idleDetector) {
      this.idleDetector.abort?.();
    }
  }
}

/**
 * Service for clipboard state and operations
 */
@Injectable({
  providedIn: 'root'
})
export class ClipboardStateService {
  // Track clipboard availability
  readonly isClipboardAvailable = 'clipboard' in navigator;
  readonly canReadClipboard = signal(false);
  readonly canWriteClipboard = signal(false);
  
  // Last clipboard operation status
  readonly lastOperation = signal<{
    type: 'read' | 'write' | null;
    success: boolean;
    timestamp: number;
  }>({ type: null, success: false, timestamp: 0 });

  constructor() {
    this.checkPermissions();
  }

  private async checkPermissions() {
    if (!this.isClipboardAvailable) return;

    try {
      // Check write permission
      const writePermission = await (navigator as any).permissions.query({
        name: 'clipboard-write'
      });
      this.canWriteClipboard.set(writePermission.state === 'granted');

      // Check read permission
      const readPermission = await (navigator as any).permissions.query({
        name: 'clipboard-read'
      });
      this.canReadClipboard.set(readPermission.state === 'granted');
    } catch (err) {
      // Permissions API might not support clipboard
      this.canWriteClipboard.set(true); // Usually allowed
      this.canReadClipboard.set(false); // Usually requires permission
    }
  }

  async writeText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      this.lastOperation.set({
        type: 'write',
        success: true,
        timestamp: Date.now()
      });
      return true;
    } catch (err) {
      this.lastOperation.set({
        type: 'write',
        success: false,
        timestamp: Date.now()
      });
      return false;
    }
  }

  async readText(): Promise<string | null> {
    try {
      const text = await navigator.clipboard.readText();
      this.lastOperation.set({
        type: 'read',
        success: true,
        timestamp: Date.now()
      });
      return text;
    } catch (err) {
      this.lastOperation.set({
        type: 'read',
        success: false,
        timestamp: Date.now()
      });
      return null;
    }
  }
}

/**
 * Master service that combines all browser state
 */
@Injectable({
  providedIn: 'root'
})
export class BrowserStateService {
  readonly visibility = inject(PageVisibilityService);
  readonly scroll = inject(ScrollStateService);
  readonly fullscreen = inject(FullscreenService);
  readonly idle = inject(IdleDetectionService);
  readonly clipboard = inject(ClipboardStateService);

  // Comprehensive browser state
  readonly state = computed(() => ({
    // Visibility
    isVisible: this.visibility.isVisible(),
    hasFocus: this.visibility.hasFocus(),
    visibilityState: this.visibility.visibilityState(),
    
    // Scroll
    scrollPosition: this.scroll.scrollPosition(),
    scrollDirection: this.scroll.scrollDirection(),
    scrollPercentage: this.scroll.scrollPercentage(),
    isAtTop: this.scroll.isAtTop(),
    isAtBottom: this.scroll.isAtBottom(),
    
    // Fullscreen
    isFullscreen: this.fullscreen.isFullscreen(),
    
    // Idle
    isIdle: this.idle.isIdle(),
    idleTime: this.idle.idleTime(),
    
    // Meta
    timestamp: Date.now()
  }));

  // User engagement level based on multiple factors
  readonly engagementLevel = computed(() => {
    if (!this.visibility.isVisible() || this.idle.isIdle()) {
      return 'none';
    }
    if (!this.visibility.hasFocus()) {
      return 'passive';
    }
    if (this.scroll.isScrolling()) {
      return 'active';
    }
    return 'engaged';
  });
}