// Kalman Filter Class - Jumpy markers ko smooth karne ke liye
export class KalmanFilter {
    constructor(processNoise = 0.005, measurementNoise = 0.03) {
        this.q = processNoise; 
        this.r = measurementNoise; 
        this.x = null; 
        this.p = 1;    
        this.k = 0;    
    }

    filter(newValue) {
        if (this.x === null) {
            this.x = newValue;
            return newValue;
        }
        this.p = this.p + this.q;
        this.k = this.p / (this.p + this.r);
        this.x = this.x + this.k * (newValue - this.x);
        this.p = (1 - this.k) * this.p;
        return this.x;
    }
}