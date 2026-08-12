/**
 * Gyroscope Manager - Handles device orientation for mobile parallax
 * Provides gyro-based camera movement as fallback to mouse position on mobile
 */

export class GyroscopeManager extends EventTarget {
    public alpha: number = 0; // Z rotation (0-360)
    public beta: number = 0;  // X rotation (-180 to 180)
    public gamma: number = 0; // Y rotation (-90 to 90)

    public isAvailable: boolean = false;
    public isEnabled: boolean = false;

    private hasSignal: boolean = false;
    private neutralBeta: number | null = null;
    private neutralGamma: number | null = null;

    private permissionGranted: boolean = false;

    public get requiresPermission(): boolean {
        if (typeof window === 'undefined') return false;
        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;
        return !!(
            (orientationEvent && typeof orientationEvent.requestPermission === 'function') ||
            (motionEvent && typeof motionEvent.requestPermission === 'function')
        );
    }

    public get isActive(): boolean {
        return this.isEnabled && this.hasSignal;
    }

    constructor() {
        super();
        this.checkAvailability();
    }

    private checkAvailability() {
        if (typeof window === 'undefined') return;
        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent || win.webkitDeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;

        // Check if device orientation is available
        this.isAvailable = !!(
            win.DeviceOrientationEvent ||
            win.webkitDeviceOrientationEvent ||
            win.DeviceMotionEvent
        );

        // iOS 13+ requires user permission
        if (
            (orientationEvent && typeof orientationEvent.requestPermission === 'function') ||
            (motionEvent && typeof motionEvent.requestPermission === 'function')
        ) {
            this.isAvailable = true;
        }

        if (this.isAvailable) {
            this.tryEnable();
        }
    }

    public async requestPermission() {
        if (!this.isAvailable) return false;

        if (this.isEnabled && this.hasSignal) {
            return true;
        }

        if (this.isEnabled && !this.hasSignal) {
            this.disable();
            this.resetCalibration();
        }

        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent || win.webkitDeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;

        try {
            const requesters: any[] = [];

            if (orientationEvent && typeof orientationEvent.requestPermission === 'function') {
                requesters.push(orientationEvent);
            }
            if (motionEvent && typeof motionEvent.requestPermission === 'function') {
                requesters.push(motionEvent);
            }

            if (requesters.length > 0) {
                let granted = false;
                for (const requester of requesters) {
                    const permission = await requester.requestPermission();
                    if (permission === 'granted') {
                        granted = true;
                    }
                }

                if (granted) {
                    this.permissionGranted = true;
                    this.resetCalibration();
                    this.enable();
                    return true;
                }
            } else {
                // Non-iOS devices, permission auto-granted
                this.permissionGranted = true;
                this.resetCalibration();
                this.enable();
                return true;
            }
        } catch (error) {
            console.warn('Gyroscope permission denied or unavailable:', error);
        }
        return false;
    }

    private tryEnable() {
        if (typeof window === 'undefined') return;
        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent || win.webkitDeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;
        // For non-iOS or already-granted permission
        const orientationNeedsPermission = orientationEvent && typeof orientationEvent.requestPermission === 'function';
        const motionNeedsPermission = motionEvent && typeof motionEvent.requestPermission === 'function';
        if (!orientationNeedsPermission && !motionNeedsPermission) {
            this.enable();
        }
    }

    private enable() {
        if (typeof window === 'undefined') return;

        this.isEnabled = true;
        window.addEventListener('deviceorientation', this.handleDeviceOrientation, false);
        window.addEventListener('deviceorientationabsolute', this.handleDeviceOrientation as EventListener, false);
        window.addEventListener('devicemotion', this.handleDeviceMotion as EventListener, false);
    }

    public disable() {
        if (typeof window === 'undefined') return;

        this.isEnabled = false;
        window.removeEventListener('deviceorientation', this.handleDeviceOrientation, false);
        window.removeEventListener('deviceorientationabsolute', this.handleDeviceOrientation as EventListener, false);
        window.removeEventListener('devicemotion', this.handleDeviceMotion as EventListener, false);
    }

    private handleDeviceOrientation = (event: any) => {
        const alpha = typeof event.alpha === 'number' ? event.alpha : null;
        const beta = typeof event.beta === 'number' ? event.beta : null;
        const gamma = typeof event.gamma === 'number' ? event.gamma : null;

        if (beta === null || gamma === null) {
            return;
        }

        this.alpha = alpha ?? 0;
        this.beta = beta;
        this.gamma = gamma;
        this.hasSignal = true;

        if (this.neutralBeta === null || this.neutralGamma === null) {
            this.neutralBeta = beta;
            this.neutralGamma = gamma;
        }

        this.dispatchEvent(new CustomEvent('orientationUpdate', {
            detail: { alpha: this.alpha, beta: this.beta, gamma: this.gamma }
        }));
    };

    private handleDeviceMotion = (event: any) => {
        const accel = event.accelerationIncludingGravity;
        if (!accel) return;

        const ax = typeof accel.x === 'number' ? accel.x : null;
        const ay = typeof accel.y === 'number' ? accel.y : null;

        if (ax === null || ay === null) {
            return;
        }

        // Convert acceleration (m/s^2) into an approximate orientation-like signal.
        const gammaFromMotion = Math.max(-45, Math.min(45, (ax / 9.81) * 45));
        const betaFromMotion = Math.max(-45, Math.min(45, (ay / 9.81) * 45));

        this.gamma = gammaFromMotion;
        this.beta = betaFromMotion;
        this.hasSignal = true;

        if (this.neutralBeta === null || this.neutralGamma === null) {
            this.neutralBeta = this.beta;
            this.neutralGamma = this.gamma;
        }

        this.dispatchEvent(new CustomEvent('orientationUpdate', {
            detail: { alpha: this.alpha, beta: this.beta, gamma: this.gamma }
        }));
    };

    /**
     * Get normalized pointer-like values from gyro for camera movement
     * Returns values similar to pointer.x and pointer.y (-1 to 1 range)
     */
    public getPointerFromOrientation(): { x: number; y: number } {
        if (!this.hasSignal) {
            return { x: 0, y: 0 };
        }

        const neutralBeta = this.neutralBeta ?? 0;
        const neutralGamma = this.neutralGamma ?? 0;

        // Use deltas from neutral orientation to avoid saturation in portrait mode.
        const deltaBeta = this.beta - neutralBeta;
        const deltaGamma = this.gamma - neutralGamma;

        // 30 degrees of tilt maps to +/-1 for a responsive but controllable range.
        const x = deltaGamma / 30;
        const y = deltaBeta / 30;

        return {
            x: Math.max(-1, Math.min(1, x)),
            y: Math.max(-1, Math.min(1, y))
        };
    }

    public resetCalibration() {
        this.neutralBeta = null;
        this.neutralGamma = null;
        this.hasSignal = false;
    }

    /**
     * Destroy the manager and clean up listeners
     */
    public destroy() {
        this.disable();
    }
}

export const gyroscopeManager = new GyroscopeManager();
