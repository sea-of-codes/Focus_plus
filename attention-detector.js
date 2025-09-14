// WebAttentionDetector Class with Head Rotation Detection
class WebAttentionDetector {
    constructor() {
        this.focusThreshold = CONFIG.ATTENTION.FOCUS_THRESHOLD;
        this.smoothingWindow = CONFIG.ATTENTION.SMOOTHING_WINDOW;
        this.attentionHistory = [];
        this.canvas = null;
        this.ctx = null;
        
        // Head rotation parameters (stricter thresholds)
        this.maxYaw = CONFIG.ATTENTION.MAX_YAW_DEGREES;
        this.maxPitch = CONFIG.ATTENTION.MAX_PITCH_DEGREES;
        
        // Current head rotation values
        this.currentYaw = 0;
        this.currentPitch = 0;
        
        // Performance tracking
        this.lastProcessTime = 0;
        this.processingTimes = [];
        
        // Motion detection parameters
        this.previousFrame = null;
        this.motionThreshold = 30;
        
        // Enhanced focus area box (larger size)
        this.centerRegion = { 
            x: (1 - CONFIG.ATTENTION.FOCUS_BOX_SIZE) / 2, 
            y: (1 - CONFIG.ATTENTION.FOCUS_BOX_SIZE) / 2, 
            width: CONFIG.ATTENTION.FOCUS_BOX_SIZE, 
            height: CONFIG.ATTENTION.FOCUS_BOX_SIZE 
        };
    }

    initializeCanvas() {
        this.canvas = document.getElementById('cameraCanvas');
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    }

    // Enhanced attention score calculation with strict head rotation detection
    calculateAttentionScore(faceData) {
        let score = 1.0;
        let isLookingStraight = true;
        
        if (faceData.type === 'position') {
            const { x, y, yaw, pitch } = faceData;
            
            // Store current rotation values
            this.currentYaw = yaw || 0;
            this.currentPitch = pitch || 0;
            
            // Check if head rotation indicates distraction
            isLookingStraight = this.isLookingStraightAhead(this.currentYaw, this.currentPitch);
            
            if (!isLookingStraight) {
                // Head is rotated, mark as distracted
                score = 0.1; // Very low score for head rotation
            } else {
                // Head is straight, check position
                const centerX = 0.5;
                const centerY = 0.5;
                
                // Calculate distance from center
                const distanceFromCenter = Math.sqrt(
                    Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
                );
                
                // Normalize distance based on larger focus area
                const maxDistance = Math.sqrt(
                    Math.pow(this.centerRegion.width / 2, 2) + 
                    Math.pow(this.centerRegion.height / 2, 2)
                );
                
                const normalizedDistance = Math.min(distanceFromCenter / maxDistance, 1.0);
                
                // Apply exponential decay for distance penalty
                score = Math.exp(-normalizedDistance * 1.5);
            }
            
        } else if (faceData.type === 'motion') {
            const { motionLevel, isInCenter } = faceData;
            
            // Assume no rotation data available, use motion and position only
            const motionScore = Math.max(0, 1 - (motionLevel / 100));
            const centerBonus = isInCenter ? 0.3 : 0;
            
            score = Math.min(1.0, motionScore + centerBonus);
        }
        
        // Ensure score is within valid range
        return {
            score: Math.max(0.0, Math.min(1.0, score)),
            isLookingStraight: isLookingStraight,
            yaw: this.currentYaw,
            pitch: this.currentPitch
        };
    }

    // Check if person is looking straight ahead
    isLookingStraightAhead(yaw, pitch) {
        const yawTolerance = CONFIG.HEAD_ROTATION.STRAIGHT_YAW_TOLERANCE;
        const pitchTolerance = CONFIG.HEAD_ROTATION.STRAIGHT_PITCH_TOLERANCE;
        
        const isYawStraight = Math.abs(yaw) <= yawTolerance;
        const isPitchStraight = Math.abs(pitch) <= pitchTolerance;
        
        return isYawStraight && isPitchStraight;
    }

    // Enhanced face detection with head rotation estimation
    detectFacePosition(videoElement, canvas, ctx) {
        try {
            // Draw current frame to canvas
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Enhanced face detection with rotation
            const faceRegion = this.findFaceRegionWithRotation(imageData, canvas);
            
            if (faceRegion) {
                // Calculate relative position (0-1 range)
                const relativeX = faceRegion.centerX / canvas.width;
                const relativeY = faceRegion.centerY / canvas.height;
                
                return {
                    type: 'position',
                    x: relativeX,
                    y: relativeY,
                    confidence: faceRegion.confidence,
                    yaw: faceRegion.yaw || 0,
                    pitch: faceRegion.pitch || 0
                };
            } else {
                // Fallback to motion detection
                return this.detectMotionLevel(imageData, canvas);
            }
        } catch (error) {
            console.warn('Face detection error:', error);
            return { type: 'motion', motionLevel: 0, isInCenter: true };
        }
    }

    // Enhanced face region detection with rotation estimation
    findFaceRegionWithRotation(imageData, canvas) {
        const { data, width, height } = imageData;
        let maxConfidence = 0;
        let bestRegion = null;
        
        // Scan image in blocks for efficiency
        const blockSize = 25; // Slightly larger blocks for better detection
        
        for (let y = 0; y < height - blockSize; y += blockSize) {
            for (let x = 0; x < width - blockSize; x += blockSize) {
                const analysis = this.analyzeFaceBlockWithRotation(data, x, y, blockSize, width, canvas);
                
                if (analysis.confidence > maxConfidence && analysis.confidence > 0.3) {
                    maxConfidence = analysis.confidence;
                    bestRegion = {
                        centerX: x + blockSize / 2,
                        centerY: y + blockSize / 2,
                        confidence: analysis.confidence,
                        yaw: analysis.yaw,
                        pitch: analysis.pitch
                    };
                }
            }
        }
        
        return bestRegion;
    }

    // Analyze block with rotation estimation
    analyzeFaceBlockWithRotation(data, startX, startY, blockSize, width, canvas) {
        let skinPixels = 0;
        let totalPixels = 0;
        let brightness = 0;
        let edgePixels = 0;
        
        // Arrays to store pixel intensities for rotation analysis
        const topRow = [];
        const bottomRow = [];
        const leftCol = [];
        const rightCol = [];
        
        for (let y = startY; y < startY + blockSize; y++) {
            for (let x = startX; x < startX + blockSize; x++) {
                const i = (y * width + x) * 4;
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                
                // Simple skin tone detection
                if (this.isSkinTone(r, g, b)) {
                    skinPixels++;
                }
                
                const pixelBrightness = (r + g + b) / 3;
                brightness += pixelBrightness;
                
                // Collect edge pixels for rotation analysis
                if (y === startY) topRow.push(pixelBrightness);
                if (y === startY + blockSize - 1) bottomRow.push(pixelBrightness);
                if (x === startX) leftCol.push(pixelBrightness);
                if (x === startX + blockSize - 1) rightCol.push(pixelBrightness);
                
                // Simple edge detection
                if (this.isEdgePixel(data, x, y, width)) {
                    edgePixels++;
                }
                
                totalPixels++;
            }
        }
        
        const skinRatio = skinPixels / totalPixels;
        const avgBrightness = brightness / totalPixels;
        const edgeRatio = edgePixels / totalPixels;
        
        // Combine multiple factors for confidence
        let confidence = skinRatio * 0.5 + edgeRatio * 0.3;
        
        // Prefer regions with moderate brightness
        if (avgBrightness > 50 && avgBrightness < 200) {
            confidence += 0.2;
        }
        
        // Estimate rotation based on asymmetry
        const rotation = this.estimateRotationFromBlock(topRow, bottomRow, leftCol, rightCol);
        
        return {
            confidence: confidence,
            yaw: rotation.yaw,
            pitch: rotation.pitch
        };
    }

    // Simple rotation estimation based on brightness asymmetry
    estimateRotationFromBlock(topRow, bottomRow, leftCol, rightCol) {
        const topAvg = topRow.reduce((a, b) => a + b, 0) / topRow.length;
        const bottomAvg = bottomRow.reduce((a, b) => a + b, 0) / bottomRow.length;
        const leftAvg = leftCol.reduce((a, b) => a + b, 0) / leftCol.length;
        const rightAvg = rightCol.reduce((a, b) => a + b, 0) / rightCol.length;
        
        // Estimate pitch from top-bottom brightness difference
        const pitchIndicator = (topAvg - bottomAvg) / Math.max(topAvg, bottomAvg, 1);
        const estimatedPitch = pitchIndicator * 30; // Scale to degrees
        
        // Estimate yaw from left-right brightness difference
        const yawIndicator = (rightAvg - leftAvg) / Math.max(leftAvg, rightAvg, 1);
        const estimatedYaw = yawIndicator * 40; // Scale to degrees
        
        return {
            yaw: Math.max(-50, Math.min(50, estimatedYaw)),
            pitch: Math.max(-30, Math.min(30, estimatedPitch))
        };
    }

    // Enhanced skin tone detection
    isSkinTone(r, g, b) {
        // Basic skin tone ranges (works for various skin tones)
        const rg = r - g;
        const rb = r - b;
        
        return (r > 95 && g > 40 && b > 20 &&
                Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
                Math.abs(rg) > 15 && r > g && r > b) ||
               (r > 220 && g > 210 && b > 170 &&
                Math.abs(rg) <= 15 && r > b && g > b);
    }

    // Simple edge detection
    isEdgePixel(data, x, y, width) {
        if (x <= 0 || y <= 0 || x >= width - 1) return false;
        
        const i = (y * width + x) * 4;
        const intensity = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        // Check neighboring pixels
        const neighbors = [
            (data[((y-1) * width + x) * 4] + data[((y-1) * width + x) * 4 + 1] + data[((y-1) * width + x) * 4 + 2]) / 3,
            (data[(y * width + (x+1)) * 4] + data[(y * width + (x+1)) * 4 + 1] + data[(y * width + (x+1)) * 4 + 2]) / 3,
            (data[((y+1) * width + x) * 4] + data[((y+1) * width + x) * 4 + 1] + data[((y+1) * width + x) * 4 + 2]) / 3,
            (data[(y * width + (x-1)) * 4] + data[(y * width + (x-1)) * 4 + 1] + data[(y * width + (x-1)) * 4 + 2]) / 3
        ];
        
        const maxDiff = Math.max(...neighbors.map(n => Math.abs(intensity - n)));
        return maxDiff > 25;
    }

    // Enhanced motion detection
    detectMotionLevel(imageData, canvas) {
        const { data, width, height } = imageData;
        
        if (!this.previousFrame) {
            this.previousFrame = new Uint8ClampedArray(data);
            return { type: 'motion', motionLevel: 0, isInCenter: true };
        }
        
        let motionPixels = 0;
        let centerMotionPixels = 0;
        const totalPixels = width * height;
        
        // Define center region based on larger focus area
        const centerX = Math.floor(width * this.centerRegion.x);
        const centerY = Math.floor(height * this.centerRegion.y);
        const centerWidth = Math.floor(width * this.centerRegion.width);
        const centerHeight = Math.floor(height * this.centerRegion.height);
        
        // Compare with previous frame
        for (let i = 0; i < data.length; i += 4) {
            const pixelIndex = i / 4;
            const x = pixelIndex % width;
            const y = Math.floor(pixelIndex / width);
            
            // Calculate grayscale difference
            const currentGray = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const previousGray = (this.previousFrame[i] + this.previousFrame[i + 1] + this.previousFrame[i + 2]) / 3;
            const diff = Math.abs(currentGray - previousGray);
            
            if (diff > this.motionThreshold) {
                motionPixels++;
                
                // Check if motion is in center region
                if (x >= centerX && x < centerX + centerWidth &&
                    y >= centerY && y < centerY + centerHeight) {
                    centerMotionPixels++;
                }
            }
        }
        
        // Update previous frame
        this.previousFrame = new Uint8ClampedArray(data);
        
        const motionLevel = (motionPixels / totalPixels) * 100;
        const isInCenter = centerMotionPixels > motionPixels * 0.3;
        
        return {
            type: 'motion',
            motionLevel: motionLevel,
            isInCenter: isInCenter
        };
    }

    // Enhanced smoothing with rotation awareness
    smoothPredictions(attentionData) {
        const currentScore = attentionData.score;
        
        // Add current score to history
        this.attentionHistory.push(currentScore);
        
        // Maintain sliding window
        if (this.attentionHistory.length > this.smoothingWindow) {
            this.attentionHistory.shift();
        }
        
        // Calculate weighted average with exponential decay
        const weights = this.attentionHistory.map((_, i) => 
            Math.exp((i - this.attentionHistory.length + 1) / this.attentionHistory.length)
        );
        
        const weightSum = weights.reduce((a, b) => a + b, 0);
        const weightedSum = this.attentionHistory.reduce((sum, score, i) => 
            sum + score * weights[i], 0
        );
        
        const smoothedScore = weightedSum / weightSum;
        
        return {
            score: smoothedScore,
            isLookingStraight: attentionData.isLookingStraight,
            yaw: attentionData.yaw,
            pitch: attentionData.pitch
        };
    }

    // Check if focused based on score and head rotation
    isFocused(attentionData) {
        const scoreBasedFocus = attentionData.score >= this.focusThreshold;
        const headRotationFocus = attentionData.isLookingStraight;
        
        // Both conditions must be true for focused state
        return scoreBasedFocus && headRotationFocus;
    }

    // Adaptive threshold adjustment based on user behavior
    adjustThreshold(sessionData) {
        if (sessionData.totalFrames < 100) return;
        
        const focusRatio = sessionData.focusedFrames / sessionData.totalFrames;
        
        if (focusRatio > 0.9) {
            this.focusThreshold = Math.min(0.7, this.focusThreshold + 0.02);
        } else if (focusRatio < 0.1) {
            this.focusThreshold = Math.max(0.4, this.focusThreshold - 0.02);
        }
    }

    // Get performance metrics with rotation data
    getPerformanceMetrics() {
        const avgProcessingTime = this.processingTimes.length > 0 ?
            this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length : 0;
        
        // Calculate additional metrics
        const maxFocusStreak = this.calculateMaxFocusStreak();
        const detectionRate = this.calculateDetectionRate();
        const sessionQualityScore = this.calculateSessionQuality();
        
        return {
            averageProcessingTime: avgProcessingTime,
            currentThreshold: this.focusThreshold,
            historyLength: this.attentionHistory.length,
            currentYaw: this.currentYaw,
            currentPitch: this.currentPitch,
            focusBoxSize: this.centerRegion.width,
            maxFocusStreak: maxFocusStreak,
            detectionRate: detectionRate,
            sessionQualityScore: sessionQualityScore,
            trackingConfidence: this.calculateTrackingConfidence()
        };
    }

    // Calculate maximum focus streak
    calculateMaxFocusStreak() {
        let maxStreak = 0;
        let currentStreak = 0;
        
        for (let i = 0; i < this.attentionHistory.length; i++) {
            if (this.attentionHistory[i] >= this.focusThreshold) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 0;
            }
        }
        
        return maxStreak;
    }

    // Calculate detection rate
    calculateDetectionRate() {
        if (this.attentionHistory.length === 0) return 0;
        const focusedFrames = this.attentionHistory.filter(score => score >= this.focusThreshold).length;
        return (focusedFrames / this.attentionHistory.length) * 100;
    }

    // Calculate session quality score
    calculateSessionQuality() {
        if (this.attentionHistory.length === 0) return 0;
        const avgScore = this.attentionHistory.reduce((a, b) => a + b, 0) / this.attentionHistory.length;
        return avgScore;
    }

    // Calculate tracking confidence
    calculateTrackingConfidence() {
        if (this.attentionHistory.length === 0) return 0;
        const variance = this.calculateVariance(this.attentionHistory);
        return Math.max(0, 1 - variance);
    }

    // Calculate variance for confidence
    calculateVariance(scores) {
        if (scores.length === 0) return 0;
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
        return variance;
    }

    // Reset detector state
    reset() {
        this.attentionHistory = [];
        this.processingTimes = [];
        this.focusThreshold = CONFIG.ATTENTION.FOCUS_THRESHOLD;
        this.previousFrame = null;
        this.currentYaw = 0;
        this.currentPitch = 0;
    }

    // Update calibration parameters
    updateCalibration(maxYaw = 25.0, maxPitch = 20.0) {
        this.maxYaw = maxYaw;
        this.maxPitch = maxPitch;
    }

    // Get rotation status text
    getRotationStatus(yaw, pitch) {
        const yawAbs = Math.abs(yaw);
        const pitchAbs = Math.abs(pitch);
        
        if (this.isLookingStraightAhead(yaw, pitch)) {
            return "Looking Straight";
        }
        
        let direction = "";
        if (yawAbs > CONFIG.HEAD_ROTATION.DISTRACTION_YAW_THRESHOLD) {
            direction += yaw > 0 ? "Right " : "Left ";
        }
        if (pitchAbs > CONFIG.HEAD_ROTATION.DISTRACTION_PITCH_THRESHOLD) {
            direction += pitch > 0 ? "Down" : "Up";
        }
        
        return direction.trim() || "Slightly Off-Center";
    }
}