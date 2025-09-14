let detectionRunning = false;
let detectionInterval = null;
let videoStream = null;

// Initialize Camera with WebRTC
async function initCamera() {
    if (detectionRunning) return true;

    const videoElement = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const placeholder = document.getElementById('cameraPlaceholder');

    // Check for media devices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert(CONFIG.MESSAGES.BROWSER_NOT_SUPPORTED);
        return false;
    }

    try {
        // Show UI elements
        placeholder.style.display = 'none';
        videoElement.style.display = 'block';
        canvas.style.display = 'block';
        canvas.width = CONFIG.MEDIAPIPE.CAMERA_OPTIONS.width;
        canvas.height = CONFIG.MEDIAPIPE.CAMERA_OPTIONS.height;

        // Initialize attention detector
        if (!attentionDetector) {
            attentionDetector = new WebAttentionDetector();
        }
        attentionDetector.initializeCanvas();

        // Get user media with enhanced constraints
        const constraints = {
            video: {
                width: { ideal: CONFIG.MEDIAPIPE.CAMERA_OPTIONS.width },
                height: { ideal: CONFIG.MEDIAPIPE.CAMERA_OPTIONS.height },
                facingMode: CONFIG.MEDIAPIPE.CAMERA_OPTIONS.facingMode,
                frameRate: { ideal: 15 }
            },
            audio: false
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = videoStream;

        // Wait for video to load
        await new Promise((resolve) => {
            videoElement.onloadedmetadata = () => {
                resolve();
            };
        });

        // Reset session stats
        resetSessionStats();

        // Start detection loop
        startDetectionLoop();
        detectionRunning = true;
        
        console.log('Camera initialized successfully with enhanced detection');
        return true;

    } catch (err) {
        console.error('Failed to initialize camera:', err);
        
        // Reset UI on failure
        placeholder.style.display = 'flex';
        videoElement.style.display = 'none';
        canvas.style.display = 'none';
        
        // Show user-friendly error
        let errorMessage = CONFIG.MESSAGES.CAMERA_DENIED;
        if (err.name === 'NotAllowedError') {
            errorMessage = CONFIG.MESSAGES.CAMERA_DENIED;
        } else if (err.name === 'NotFoundError') {
            errorMessage = CONFIG.MESSAGES.CAMERA_NOT_FOUND;
        } else if (err.name === 'NotReadableError') {
            errorMessage = CONFIG.MESSAGES.CAMERA_BUSY;
        }
        
        alert(errorMessage);
        return false;
    }
}

// Start the enhanced detection loop
function startDetectionLoop() {
    const videoElement = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    // Process frames at configured FPS for performance
    const intervalMs = 1000 / CONFIG.ATTENTION.PROCESSING_FPS;
    
    detectionInterval = setInterval(() => {
        if (!detectionRunning || videoElement.paused || videoElement.ended) {
            return;
        }
        
        try {
            processFrame(videoElement, canvas, ctx);
        } catch (error) {
            console.warn('Frame processing error:', error);
        }
    }, intervalMs);
}

// Enhanced frame processing with head rotation detection
function processFrame(videoElement, canvas, ctx) {
    if (!attentionDetector) return;
    
    // Detect face with enhanced rotation detection
    const faceData = attentionDetector.detectFacePosition(videoElement, canvas, ctx);
    
    if (faceData.confidence === undefined || faceData.confidence > 0.1) {
        // Calculate attention score with rotation awareness
        const attentionData = attentionDetector.calculateAttentionScore(faceData);
        const smoothedData = attentionDetector.smoothPredictions(attentionData);
        const isFocused = attentionDetector.isFocused(smoothedData);
        
        // Update session statistics
        updateSessionStats(isFocused ? 'focused' : 'distracted');
        
        // Update UI with synchronized data
        updateAttentionUI(isFocused, smoothedData);
        
        // Draw enhanced debug overlay
        drawEnhancedDebugOverlay(faceData, smoothedData, isFocused);
        
    } else {
        // No face detected
        handleNoFace();
    }
}

// Handle case when no face is detected
function handleNoFace() {
    sessionStats.totalFrames++;
    sessionStats.noFaceFrames++;
    updateSessionStats('noFace');
    
    const noFaceData = { score: 0, isLookingStraight: false, yaw: 0, pitch: 0 };
    updateAttentionUI(false, noFaceData, true);
    
    // Clear debug overlay and show "No Face" message
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw "No Face" indicator
    ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
    ctx.fillRect(10, 10, 220, 50);
    ctx.fillStyle = 'black';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('No Face Detected', 20, 40);
}

// Enhanced debug overlay with rotation info and larger focus box
function drawEnhancedDebugOverlay(faceData, attentionData, isFocused) {
    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    
    // Draw larger focus area guide (enlarged box)
    const focusRegion = attentionDetector.centerRegion;
    const centerX = canvas.width * focusRegion.x;
    const centerY = canvas.height * focusRegion.y;
    const centerWidth = canvas.width * focusRegion.width;
    const centerHeight = canvas.height * focusRegion.height;
    
    // Draw focus area box with enhanced visibility
    ctx.strokeStyle = isFocused ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 165, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(centerX, centerY, centerWidth, centerHeight);
    ctx.setLineDash([]);
    
    // Draw focus area corner markers
    const markerSize = 20;
    ctx.lineWidth = 4;
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + markerSize);
    ctx.lineTo(centerX, centerY);
    ctx.lineTo(centerX + markerSize, centerY);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(centerX + centerWidth - markerSize, centerY);
    ctx.lineTo(centerX + centerWidth, centerY);
    ctx.lineTo(centerX + centerWidth, centerY + markerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(centerX, centerY + centerHeight - markerSize);
    ctx.lineTo(centerX, centerY + centerHeight);
    ctx.lineTo(centerX + markerSize, centerY + centerHeight);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(centerX + centerWidth - markerSize, centerY + centerHeight);
    ctx.lineTo(centerX + centerWidth, centerY + centerHeight);
    ctx.lineTo(centerX + centerWidth, centerY + centerHeight - markerSize);
    ctx.stroke();
    
    // Draw face indicator if position detected
    if (faceData.type === 'position') {
        const x = faceData.x * canvas.width;
        const y = faceData.y * canvas.height;
        
        // Draw face center point
        ctx.fillStyle = isFocused ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw face region outline
        ctx.strokeStyle = isFocused ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 60, y - 70, 120, 140);
    }
    
    // Draw enhanced information panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(5, 5, 320, 140);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Detection: ${faceData.type}`, 15, 25);
    
    if (faceData.type === 'position') {
        ctx.fillText(`Position: (${(faceData.x * 100).toFixed(1)}, ${(faceData.y * 100).toFixed(1)})`, 15, 50);
        ctx.fillText(`Confidence: ${(faceData.confidence * 100).toFixed(1)}%`, 15, 75);
        
        // Head rotation information
        ctx.fillStyle = attentionData.isLookingStraight ? '#4CAF50' : '#FF5722';
        ctx.fillText(`Head Yaw: ${attentionData.yaw.toFixed(1)}°`, 15, 100);
        ctx.fillText(`Head Pitch: ${attentionData.pitch.toFixed(1)}°`, 15, 125);
        
        // Rotation status
        const rotationStatus = attentionDetector.getRotationStatus(attentionData.yaw, attentionData.pitch);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(`Head: ${rotationStatus}`, 170, 100);
        
    } else {
        ctx.fillText(`Motion Level: ${faceData.motionLevel.toFixed(1)}`, 15, 50);
        ctx.fillText(`In Center: ${faceData.isInCenter ? 'Yes' : 'No'}`, 15, 75);
    }
    
    // Enhanced attention score display
    ctx.font = 'bold 20px Arial';
    ctx.fillStyle = isFocused ? '#4CAF50' : '#FF5722';
    const attentionPercent = (attentionData.score * 100).toFixed(0);
    ctx.fillText(`Focus: ${attentionPercent}%`, 170, 50);
    
    // Focus status
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Status: ${isFocused ? 'FOCUSED' : 'DISTRACTED'}`, 170, 75);
    
    // Draw overall attention indicator overlay
    const indicatorColor = isFocused ? 'rgba(0, 255, 0, 0.08)' : 'rgba(255, 0, 0, 0.08)';
    ctx.fillStyle = indicatorColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Stop camera and cleanup
function stopCamera() {
    detectionRunning = false;
    
    // Clear detection interval
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Stop video tracks
    if (videoStream) {
        const tracks = videoStream.getTracks();
        tracks.forEach(track => {
            track.stop();
            console.log('Stopped track:', track.kind);
        });
        videoStream = null;
    }
    
    // Reset video element
    const video = document.getElementById('cameraVideo');
    if (video) {
        video.srcObject = null;
    }
    
    // Reset UI
    resetCameraUI();
    
    console.log('Camera stopped and cleaned up');
}

// Reset camera UI to initial state
function resetCameraUI() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    const placeholder = document.getElementById('cameraPlaceholder');
    const statusElement = document.getElementById('attentionStatus');
    
    if (video) video.style.display = 'none';
    if (canvas) {
        canvas.style.display = 'none';
        // Clear canvas
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (statusElement) statusElement.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';
    
    if (placeholder) {
        placeholder.innerHTML = 
            '<div style="text-align: center; opacity: 0.7;">' +
            '<div style="font-size: 2rem; margin-bottom: 10px;">📹</div>' +
            '<div>Camera View</div>' +
            '<div style="font-size: 12px;">Click Start to begin attention detection</div>' +
            '</div>';
    }
}

// Enhanced attention UI update - synchronized with statistics
function updateAttentionUI(isFocused, attentionData, noFace = false) {
    const statusElement = document.getElementById('attentionStatus');
    if (!statusElement) return;
    
    if (noFace) {
        statusElement.style.display = 'block';
        statusElement.textContent = 'No Face Detected';
        statusElement.className = 'attention-overlay';
        statusElement.style.background = 'rgba(255, 255, 0, 0.9)';
        statusElement.style.color = 'black';
        return;
    }
    
    // Calculate percentage - this should match statistics display
    const focusPercent = Math.round(attentionData.score * 100);
    
    statusElement.style.display = 'block';
    
    // Enhanced status text with rotation info
    let statusText = `${isFocused ? 'Focused' : 'Distracted'} (${focusPercent}%)`;
    
    if (!attentionData.isLookingStraight) {
        const rotationStatus = attentionDetector.getRotationStatus(attentionData.yaw, attentionData.pitch);
        statusText += ` - ${rotationStatus}`;
    }
    
    statusElement.textContent = statusText;
    statusElement.className = 'attention-overlay ' + (isFocused ? 'attention-focused' : 'attention-distracted');
    
    if (isFocused) {
        statusElement.style.background = 'rgba(0, 255, 0, 0.9)';
        statusElement.style.color = 'white';
    } else {
        statusElement.style.background = 'rgba(255, 0, 0, 0.9)';
        statusElement.style.color = 'white';
    }
}

// Check camera availability
function checkCameraAvailability() {
    return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
}

// Get available cameras
async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
        console.error('Error enumerating devices:', error);
        return [];
    }
}

// Handle camera permission
async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Camera permission denied:', error);
        return false;
    }
}

// Get current frame data for analysis
function getCurrentFrameData() {
    const canvas = document.getElementById('cameraCanvas');
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Performance monitoring
function getDetectionPerformance() {
    if (attentionDetector) {
        return attentionDetector.getPerformanceMetrics();
    }
    return null;
}