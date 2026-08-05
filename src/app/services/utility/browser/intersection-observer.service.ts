import { Injectable, ElementRef, signal, computed, effect, inject, DestroyRef, Directive, EventEmitter, Output, Input } from '@angular/core';

// Using native Web API types
type IntersectionObserverCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void;

export interface ObserverOptions {
  root?: Element | Document | null;
  rootMargin?: string;
  threshold?: number | number[];
}

export interface ElementVisibility {
  isIntersecting: boolean;
  intersectionRatio: number;
  intersectionRect: DOMRectReadOnly;
  boundingClientRect: DOMRectReadOnly;
  rootBounds: DOMRectReadOnly | null;
  time: DOMHighResTimeStamp;
  isAbove: boolean;
  isBelow: boolean;
  isLeft: boolean;
  isRight: boolean;
  isFullyVisible: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IntersectionService {
  // Map to store visibility state for each observed element
  private readonly visibilityMap = signal<Map<Element, ElementVisibility>>(new Map());
  
  // Map to store observer instances for different configurations
  private readonly observers = new Map<string, IntersectionObserver>();
  
  // Map to track which observer is watching which element
  private readonly elementObserverMap = new Map<Element, IntersectionObserver>();
  
  // Get visibility signal for a specific element
  visibility(element: Element) {
    return computed(() => {
      const map = this.visibilityMap();
      return map.get(element) || null;
    });
  }
  
  // Check if element is visible
  isVisible(element: Element) {
    return computed(() => {
      const vis = this.visibility(element)();
      return vis?.isIntersecting ?? false;
    });
  }
  
  // Get intersection ratio for element
  intersectionRatio(element: Element) {
    return computed(() => {
      const vis = this.visibility(element)();
      return vis?.intersectionRatio ?? 0;
    });
  }
  
  // Check if element is fully visible
  isFullyVisible(element: Element) {
    return computed(() => {
      const vis = this.visibility(element)();
      return vis?.isFullyVisible ?? false;
    });
  }
  
  // Get all currently visible elements
  readonly visibleElements = computed(() => {
    const map = this.visibilityMap();
    return Array.from(map.entries())
      .filter(([_, visibility]) => visibility.isIntersecting)
      .map(([element, _]) => element);
  });
  
  // Count of visible elements
  readonly visibleCount = computed(() => this.visibleElements().length);
  
  // Observe an element
  observe(element: Element, options: ObserverOptions = {}): void {
    // Create unique key for observer configuration
    const key = this.getObserverKey(options);
    
    // Get or create observer for this configuration
    let observer = this.observers.get(key);
    if (!observer) {
      observer = this.createObserver(options);
      this.observers.set(key, observer);
    }
    
    // Stop any existing observation of this element
    this.unobserve(element);
    
    // Start observing
    observer.observe(element);
    this.elementObserverMap.set(element, observer);
  }
  
  // Stop observing an element
  unobserve(element: Element): void {
    const observer = this.elementObserverMap.get(element);
    if (observer) {
      observer.unobserve(element);
      this.elementObserverMap.delete(element);
      
      // Remove from visibility map
      this.visibilityMap.update(map => {
        const newMap = new Map(map);
        newMap.delete(element);
        return newMap;
      });
    }
  }
  
  // Observe multiple elements
  observeAll(elements: Element[], options: ObserverOptions = {}): void {
    elements.forEach(element => this.observe(element, options));
  }
  
  // Unobserve multiple elements
  unobserveAll(elements?: Element[]): void {
    if (elements) {
      elements.forEach(element => this.unobserve(element));
    } else {
      // Unobserve all if no elements specified
      Array.from(this.elementObserverMap.keys()).forEach(element => 
        this.unobserve(element)
      );
    }
  }
  
  // Disconnect all observers and clean up
  disconnectAll(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    this.elementObserverMap.clear();
    this.visibilityMap.set(new Map());
  }
  
  // Create observer with callback that updates signals
  private createObserver(options: ObserverOptions): IntersectionObserver {
    const callback: IntersectionObserverCallback = (entries) => {
      this.visibilityMap.update(map => {
        const newMap = new Map(map);
        
        entries.forEach(entry => {
          const visibility: ElementVisibility = {
            isIntersecting: entry.isIntersecting,
            intersectionRatio: entry.intersectionRatio,
            intersectionRect: entry.intersectionRect,
            boundingClientRect: entry.boundingClientRect,
            rootBounds: entry.rootBounds,
            time: entry.time,
            isAbove: entry.boundingClientRect.bottom < 0,
            isBelow: entry.boundingClientRect.top > (entry.rootBounds?.height ?? window.innerHeight),
            isLeft: entry.boundingClientRect.right < 0,
            isRight: entry.boundingClientRect.left > (entry.rootBounds?.width ?? window.innerWidth),
            isFullyVisible: entry.intersectionRatio >= 0.99
          };
          
          newMap.set(entry.target, visibility);
        });
        
        return newMap;
      });
    };
    
    return new IntersectionObserver(callback, options);
  }
  
  // Generate unique key for observer configuration
  private getObserverKey(options: ObserverOptions): string {
    const root = options.root || 'viewport';
    const rootMargin = options.rootMargin || '0px';
    const threshold = Array.isArray(options.threshold) 
      ? options.threshold.join(',') 
      : (options.threshold ?? 0);
    return `${root}-${rootMargin}-${threshold}`;
  }
}

// Directive for declarative intersection observation
@Directive({
  selector: '[observe]',
  standalone: true
})
export class ObserveDirective {
  private intersectionService = inject(IntersectionService);
  private elementRef = inject(ElementRef);
  private destroyRef = inject(DestroyRef);
  
  @Input() observeOptions: ObserverOptions = {};
  @Input() observeAutoUnobserve = true;
  
  @Output() visibilityChange = new EventEmitter<ElementVisibility>();
  @Output() enterViewport = new EventEmitter<void>();
  @Output() exitViewport = new EventEmitter<void>();
  
  private wasVisible = false;
  
  ngOnInit() {
    const element = this.elementRef.nativeElement;
    
    // Start observing
    this.intersectionService.observe(element, this.observeOptions);
    
    // Emit visibility changes
    effect(() => {
      const visibility = this.intersectionService.visibility(element)();
      if (visibility) {
        this.visibilityChange.emit(visibility);
        
        // Emit enter/exit events
        if (visibility.isIntersecting && !this.wasVisible) {
          this.enterViewport.emit();
          this.wasVisible = true;
        } else if (!visibility.isIntersecting && this.wasVisible) {
          this.exitViewport.emit();
          this.wasVisible = false;
        }
      }
    });
    
    // Clean up on destroy
    if (this.observeAutoUnobserve) {
      this.destroyRef.onDestroy(() => {
        this.intersectionService.unobserve(element);
      });
    }
  }
}

// Service for common viewport-based patterns
@Injectable({
  providedIn: 'root'
})
export class ViewportService {
  private intersectionService = inject(IntersectionService);
  
  // Track elements that have ever been visible (for animations)
  private readonly hasBeenVisible = signal<Set<Element>>(new Set());
  
  // Track elements currently being lazy loaded
  private readonly loadingElements = signal<Set<Element>>(new Set());
  
  // Observe for lazy loading with custom threshold
  observeForLazyLoad(
    element: Element,
    callback: () => void | Promise<void>,
    options: ObserverOptions = { rootMargin: '50px' }
  ): void {
    this.intersectionService.observe(element, options);
    
    // Create effect that fires callback when visible
    const cleanupEffect = effect(async () => {
      const isVisible = this.intersectionService.isVisible(element)();
      const alreadySeen = this.hasBeenVisible().has(element);
      
      if (isVisible && !alreadySeen) {
        // Mark as seen
        this.hasBeenVisible.update(set => new Set(set).add(element));
        
        // Mark as loading
        this.loadingElements.update(set => new Set(set).add(element));
        
        // Execute callback
        try {
          await callback();
        } finally {
          // Remove from loading
          this.loadingElements.update(set => {
            const newSet = new Set(set);
            newSet.delete(element);
            return newSet;
          });
          
          // Optionally unobserve after loading
          this.intersectionService.unobserve(element);
          
          // Clean up effect
          cleanupEffect.destroy();
        }
      }
    });
  }
  
  // Observe for infinite scroll
  observeForInfiniteScroll(
    sentinel: Element,
    callback: () => void | Promise<void>,
    options: ObserverOptions = { rootMargin: '100px' }
  ): void {
    this.intersectionService.observe(sentinel, options);
    
    effect(async () => {
      const isVisible = this.intersectionService.isVisible(sentinel)();
      
      if (isVisible) {
        await callback();
      }
    });
  }
  
  // Track scroll direction based on element visibility
  getScrollDirection(elements: Element[]) {
    const previousPositions = signal<Map<Element, DOMRect>>(new Map());
    
    return computed(() => {
      const positions = new Map<Element, DOMRect>();
      let direction: 'up' | 'down' | 'none' = 'none';
      
      elements.forEach(element => {
        const visibility = this.intersectionService.visibility(element)();
        if (visibility) {
          const currentRect = visibility.boundingClientRect;
          const previousRect = previousPositions().get(element);
          
          if (previousRect) {
            if (currentRect.top < previousRect.top) {
              direction = 'up';
            } else if (currentRect.top > previousRect.top) {
              direction = 'down';
            }
          }
          
          positions.set(element, currentRect);
        }
      });
      
      previousPositions.set(positions);
      return direction;
    });
  }
  
  // Check if element has been visible at least once
  hasEverBeenVisible(element: Element) {
    return computed(() => this.hasBeenVisible().has(element));
  }
  
  // Check if element is currently loading
  isLoading(element: Element) {
    return computed(() => this.loadingElements().has(element));
  }
}