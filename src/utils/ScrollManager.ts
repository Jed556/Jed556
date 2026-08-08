export type ViewingState = 'ready' | 'viewing' | 'passed';

const PULL_THRESHOLD = 0.3; // 20% pull threshold before locking in

class ScrollManager extends EventTarget {
  public currentSection: number = 0;
  public totalSections: number = 5;
  public scrollValue: number = 0;
  
  // New features for dynamic internal scrolling for any section
  public internalScrollLimits: Record<number, number> = {};
  public internalScrollValue: number = 0;
  private targetInternalScrollValue: number = 0;
  
  public scrollVelocity: number = 0;
  public rawScrollDelta: number = 0;

  private targetScrollValue: number = 0;
  private touchStartY: number = 0;
  private isAnimating: boolean = false;
  private lastTime: number = 0;
  private lockedDirection: number = 0;
  private currentStiffness: number = 8.0;
  
  // Time-based jump state
  private jumpTarget: number | null = null;
  private jumpStartValue: number = 0;
  private jumpStartTime: number = 0;
  private jumpDuration: number = 0;

  constructor() {
    super();
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#')) {
        const sectionNum = parseInt(hash.substring(1), 10);
        if (!isNaN(sectionNum) && sectionNum >= 1 && sectionNum <= this.totalSections) {
          const index = sectionNum - 1;
          this.currentSection = index;
          this.scrollValue = index;
          this.targetScrollValue = index;
        }
      }

      window.addEventListener('wheel', this.handleWheel, { passive: false });
      window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
      window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
      window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }
  }
  
  public setInternalScrollLimit(section: number, limit: number) {
    this.internalScrollLimits[section] = limit;
  }

  private handleWheel = (e: WheelEvent) => {
    // Add to target scroll value based on wheel delta
    const delta = e.deltaY * 0.0015;
    this.applyScrollDelta(delta);
    
    // When wheel stops, we need to snap. We can debounce a "stop" event.
    this.debounceSnap();
  };

  private handleTouchStart = (e: TouchEvent) => {
    this.touchStartY = e.touches[0].clientY;
  };

  private handleTouchMove = (e: TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const deltaY = this.touchStartY - touchY;
    this.touchStartY = touchY;
    
    const delta = deltaY * 0.002;
    this.applyScrollDelta(delta);
  };

  private handleTouchEnd = () => {
    this.snapToNearestSection();
  };

  private applyScrollDelta(delta: number) {
    this.currentStiffness = 8.0;
    this.jumpTarget = null; // Cancel any active jump when user manually scrolls
    
    // Accumulate raw scroll delta for effects like camera shake
    this.rawScrollDelta = delta;

    // If we just snapped to a new section, ignore further scrolls in that same direction
    // to prevent rapid skipping or jitter, but allow them to scroll backwards.
    if (this.lockedDirection === 1 && delta > 0) return;
    if (this.lockedDirection === -1 && delta < 0) return;

    const internalLimit = this.internalScrollLimits[this.currentSection] || 0;
    
    if (internalLimit > 0) {
      // Try to apply delta to internal scroll first
      const newInternalTarget = this.targetInternalScrollValue + delta;
      
      if (newInternalTarget < 0) {
        // Spill over upwards
        const spill = newInternalTarget;
        this.targetInternalScrollValue = 0;
        this.targetScrollValue += spill;
      } else if (newInternalTarget > internalLimit) {
        // Spill over downwards
        const spill = newInternalTarget - internalLimit;
        this.targetInternalScrollValue = internalLimit;
        this.targetScrollValue += spill;
      } else {
        // Fully consumed by internal scroll
        this.targetInternalScrollValue = newInternalTarget;
      }
    } else {
      // Normal global scroll
      this.targetScrollValue += delta;
    }
    
    // Clamp the target global value between 0 and totalSections - 1
    this.targetScrollValue = Math.max(0, Math.min(this.totalSections - 1, this.targetScrollValue));
    
    // Instantly commit if global threshold is crossed mid-scroll
    const diff = this.targetScrollValue - this.currentSection;
    if (Math.abs(diff) > PULL_THRESHOLD) {
      const prevSection = this.currentSection;
      
      if (diff > 0 && this.currentSection < this.totalSections - 1) {
        this.currentSection += 1;
        this.lockedDirection = 1;
      } else if (diff < 0 && this.currentSection > 0) {
        this.currentSection -= 1;
        this.lockedDirection = -1;
      }
      this.targetScrollValue = this.currentSection;
      
      // If we switched sections, initialize the internal scroll target for the new section
      if (this.currentSection !== prevSection) {
        const newLimit = this.internalScrollLimits[this.currentSection] || 0;
        if (diff > 0) {
          // Arrived from top, start internal scroll at 0
          this.targetInternalScrollValue = 0;
          this.internalScrollValue = 0;
        } else {
          // Arrived from bottom, start internal scroll at end
          this.targetInternalScrollValue = newLimit;
          this.internalScrollValue = newLimit;
        }
      }
    }
    
    this.startAnimationLoop();
  }

  private scrollStopTimeout: number | null = null;
  private debounceSnap() {
    if (this.scrollStopTimeout) {
      window.clearTimeout(this.scrollStopTimeout);
    }
    this.scrollStopTimeout = window.setTimeout(() => {
      // If they stopped wheeling and didn't cross the threshold, spring back to center
      this.targetScrollValue = this.currentSection;
      this.startAnimationLoop();
    }, 150) as unknown as number;
  }
  
  private snapToNearestSection() {
    this.targetScrollValue = this.currentSection;
    this.startAnimationLoop();
  }

  private startAnimationLoop() {
    if (!this.isAnimating) {
      this.isAnimating = true;
      this.lastTime = performance.now();
      requestAnimationFrame(this.updateLoop);
    }
  }

  private updateLoop = (time: number) => {
    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    const diff = this.targetScrollValue - this.scrollValue;

    if (this.jumpTarget !== null) {
      // Time-based easeInOut jump
      const elapsed = time - this.jumpStartTime;
      const t = Math.min(elapsed / this.jumpDuration, 1.0);
      
      // easeInOutCubic for a beautiful, non-linear smooth acceleration and deceleration
      const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      
      this.scrollValue = this.jumpStartValue + (this.jumpTarget - this.jumpStartValue) * easeT;
      this.targetScrollValue = this.scrollValue; // Keep target in sync
      
      if (t >= 1.0) {
        this.jumpTarget = null; // Jump finished
        this.targetScrollValue = Math.round(this.scrollValue);
      }
    } else {
      // Normal physics-based scroll lerp
      this.scrollVelocity = diff * (deltaTime * this.currentStiffness);
      this.scrollValue += this.scrollVelocity; 
    }
    
    // Decay raw scroll delta
    if (Math.abs(this.rawScrollDelta) > 0.0001) {
      this.rawScrollDelta *= Math.pow(0.1, deltaTime * 10);
    } else {
      this.rawScrollDelta = 0;
    }
    
    // Smoothly lerp internal scroll
    const internalDiff = this.targetInternalScrollValue - this.internalScrollValue;
    this.internalScrollValue += internalDiff * (deltaTime * 8.0);

    // Update current integer section based on nearest whole number to actual scroll
    const nearestSection = Math.round(this.scrollValue);
    if (nearestSection !== this.currentSection && Math.abs(diff) < 0.1) {
       // We only update the public currentSection once we've securely settled near it
       if (nearestSection === Math.round(this.targetScrollValue)) {
         this.currentSection = nearestSection;
       }
    }

    this.dispatchEvent(new CustomEvent('scrollUpdate', { 
      detail: { 
        currentSection: this.currentSection,
        scrollValue: this.scrollValue,
        internalScrollValue: this.internalScrollValue,
        scrollVelocity: this.scrollVelocity
      } 
    }));

    const isPhysicalScrollSettled = this.jumpTarget === null && Math.abs(diff) <= 0.001 && Math.abs(internalDiff) <= 0.001;

    // Release the scroll lock as soon as the physical scroll settles, 
    // even if the camera shake (rawScrollDelta) is still fading out.
    if (isPhysicalScrollSettled) {
      this.lockedDirection = 0;
    }

    // Continue loop if not settled
    if (!isPhysicalScrollSettled || Math.abs(this.rawScrollDelta) > 0.0001) {
      requestAnimationFrame(this.updateLoop);
    } else {
      this.scrollValue = this.targetScrollValue;
      this.internalScrollValue = this.targetInternalScrollValue;
      this.scrollVelocity = 0;
      this.isAnimating = false;
      this.lockedDirection = 0;
      this.dispatchEvent(new CustomEvent('scrollUpdate', { 
        detail: { 
          currentSection: this.currentSection,
          scrollValue: this.scrollValue,
          internalScrollValue: this.internalScrollValue,
          scrollVelocity: this.scrollVelocity
        } 
      }));
    }
  };

  public setSection(index: number) {
    if (this.currentSection === index) {
      // Smoothly scroll back to the top of the current section if it has internal scroll
      if (this.targetInternalScrollValue !== 0) {
        this.targetInternalScrollValue = 0;
        this.startAnimationLoop();
      }
      return;
    }
    
    const distance = Math.abs(index - this.scrollValue);
    
    // Setup time-based tween for jumping
    this.jumpTarget = index;
    this.jumpStartValue = this.scrollValue;
    this.jumpStartTime = performance.now();
    // Base duration of 800ms, plus 300ms for each additional section. 
    // This ensures it never flies too fast, while giving enough time to appreciate the easing.
    this.jumpDuration = 800 + (distance - 1) * 300;
    
    this.currentSection = index;
    this.targetScrollValue = index;
    
    // Smoothly reset internal scroll when jumping to a section via nav dot
    this.targetInternalScrollValue = 0;
    this.lockedDirection = 0;
    
    this.startAnimationLoop();
  }

  public getViewingState(sectionIndex: number): ViewingState {
    if (this.currentSection < sectionIndex) return 'ready';
    if (this.currentSection === sectionIndex) return 'viewing';
    return 'passed';
  }
}

export const scrollManager = new ScrollManager();
