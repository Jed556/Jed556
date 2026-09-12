/**
 * Gyroscope Manager - Handles device orientation for mobile parallax
 * Provides gyro-based camera movement as fallback to mouse position on mobile
 * Includes low-pass filtering, deadband rejection, and dynamic recentering
 */

export class GyroscopeManager extends EventTarget {
    public alpha: number = 0; // Z rotation (0-360)
    public beta: number = 0;  // X rotation (-180 to 180)
    public gamma: number = 0; // Y rotation (-90 to 90)

    public isAvailable: boolean = false;
    public isEnabled: boolean = false;

    private hasSignal: boolean = false;
    private hasOrientationData: boolean = false;
    private neutralBeta: number | null = null;
    private neutralGamma: number | null = null;

    // Smoothed output values to eliminate MEMS sensor noise and hand micro-tremors
    private smoothedX: number = 0;
    private smoothedY: number = 0;

    // Tuning constants
    private readonly DEADZONE_DEGREES: number = 0.8;      // Ignore micro-jitters under 0.8 degrees
    private readonly MAX_TILT_DEGREES: number = 25.0;     // Max tilt mapped to +/-1
    private readonly SMOOTHING_FACTOR: number = 0.12;     // Low-pass filter (lower = smoother, higher = raw)
    private readonly DRIFT_RECENTERING_RATE: number = 0.002; // Subtle drift to adapt to posture shifts

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

        if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            console.warn('[Gyroscope] Warning: Device orientation events require a secure context (HTTPS). Over local network HTTP (e.g. 192.168.x.x), mobile browsers block orientation sensors.');
        }

        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent || win.webkitDeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;

        // Check if device orientation or motion is available in window
        this.isAvailable = !!(
            orientationEvent ||
            motionEvent
        );

        if (this.isAvailable) {
            this.tryEnable();
        }
    }

    public async requestPermission(): Promise<boolean> {
        if (!this.isAvailable) return false;

        if (this.isEnabled && this.hasSignal) {
            return true;
        }

        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent || win.webkitDeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;

        try {
            // iOS 13+ requires user permission from a user gesture (click or touchend)
            if (orientationEvent && typeof orientationEvent.requestPermission === 'function') {
                const permission = await orientationEvent.requestPermission();
                if (permission === 'granted') {
                    this.enable();
                    return true;
                }
                return false;
            } else if (motionEvent && typeof motionEvent.requestPermission === 'function') {
                const permission = await motionEvent.requestPermission();
                if (permission === 'granted') {
                    this.enable();
                    return true;
                }
                return false;
            } else {
                // Non-iOS devices (Android, etc.): permission is granted by default
                this.enable();
                return true;
            }
        } catch (error) {
            console.warn('[Gyroscope] Permission error or unavailable:', error);
            return false;
        }
    }

    private tryEnable() {
        if (typeof window === 'undefined') return;
        const win = window as any;
        const orientationEvent = win.DeviceOrientationEvent || win.webkitDeviceOrientationEvent;
        const motionEvent = win.DeviceMotionEvent;
        
        // For non-iOS or browsers where requestPermission is not required
        const orientationNeedsPermission = orientationEvent && typeof orientationEvent.requestPermission === 'function';
        const motionNeedsPermission = motionEvent && typeof motionEvent.requestPermission === 'function';
        
        if (!orientationNeedsPermission && !motionNeedsPermission) {
            this.enable();
        }
    }

    public enable() {
        if (typeof window === 'undefined') return;
        if (this.isEnabled) return;

        this.isEnabled = true;
        window.addEventListener('deviceorientation', this.handleDeviceOrientation, false);
        window.addEventListener('deviceorientationabsolute', this.handleDeviceOrientation as EventListener, false);
        window.addEventListener('devicemotion', this.handleDeviceMotion as EventListener, false);
    }

    public disable() {
        if (typeof window === 'undefined') return;
        if (!this.isEnabled) return;

        this.isEnabled = false;
        this.hasOrientationData = false;
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

        this.hasOrientationData = true;
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
        // If deviceorientation is already providing real orientation angles, do not let motion overwrite it
        if (this.hasOrientationData) {
            return;
        }

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
     * Returns smooth values between -1 and 1 without micro-shake
     */
    public getPointerFromOrientation(): { x: number; y: number } {
        if (!this.hasSignal) {
            return { x: 0, y: 0 };
        }

        if (this.neutralBeta === null) this.neutralBeta = this.beta;
        if (this.neutralGamma === null) this.neutralGamma = this.gamma;

        // 1. Subtle adaptive recentering to prevent bias over time as user changes posture
        this.neutralBeta += (this.beta - this.neutralBeta) * this.DRIFT_RECENTERING_RATE;
        this.neutralGamma += (this.gamma - this.neutralGamma) * this.DRIFT_RECENTERING_RATE;

        // 2. Compute delta from neutral orientation
        const deltaBeta = this.beta - this.neutralBeta;
        const deltaGamma = this.gamma - this.neutralGamma;

        // 3. Deadzone filter: ignore micro-tremors below DEADZONE_DEGREES (e.g. hand jitter < 0.8°)
        const absBeta = Math.abs(deltaBeta);
        const absGamma = Math.abs(deltaGamma);

        const effectiveBeta = absBeta > this.DEADZONE_DEGREES
            ? Math.sign(deltaBeta) * (absBeta - this.DEADZONE_DEGREES)
            : 0;

        const effectiveGamma = absGamma > this.DEADZONE_DEGREES
            ? Math.sign(deltaGamma) * (absGamma - this.DEADZONE_DEGREES)
            : 0;

        // 4. Normalize to range [-1, 1]
        const maxRange = this.MAX_TILT_DEGREES - this.DEADZONE_DEGREES;
        const normY = Math.max(-1, Math.min(1, effectiveBeta / maxRange));
        const normX = Math.max(-1, Math.min(1, effectiveGamma / maxRange));

        // 5. S-Curve response (power 1.3): smooth, calm near center, responsive on deliberate tilt
        const targetY = Math.sign(normY) * Math.pow(Math.abs(normY), 1.3);
        const targetX = Math.sign(normX) * Math.pow(Math.abs(normX), 1.3);

        // 6. Exponential Moving Average (Low-Pass Filter): removes MEMS high-frequency sensor noise
        this.smoothedX += (targetX - this.smoothedX) * this.SMOOTHING_FACTOR;
        this.smoothedY += (targetY - this.smoothedY) * this.SMOOTHING_FACTOR;

        return {
            x: this.smoothedX,
            y: this.smoothedY
        };
    }

    public resetCalibration() {
        this.neutralBeta = null;
        this.neutralGamma = null;
        this.smoothedX = 0;
        this.smoothedY = 0;
        this.hasSignal = false;
        this.hasOrientationData = false;
    }

    /**
     * Destroy the manager and clean up listeners
     */
    public destroy() {
        this.disable();
    }
}

export const gyroscopeManager = new GyroscopeManager();
