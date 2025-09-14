// Enhanced Application Main Script with Analytics Integration

// Global Variables
let currentUser = null;
let timerInterval = null;
let timerSeconds = 120; // 2 minutes default
let originalTimerSeconds = 120;
let isTimerRunning = false;
let sessionCounter = 0;

// Attention Detection Variables
let attentionDetector = null;
let sessionStats = {
    totalFrames: 0,
    focusedFrames: 0,
    distractedFrames: 0,
    noFaceFrames: 0,
    sessionStart: null,
    focusPeriods: [],
    distractionPeriods: [],
    currentState: null,
    stateStartTime: null,
    enhancedMetrics: null
};

// Initialize Enhanced Application
function initDashboard() {
    console.log('Initializing dashboard...');
    checkAuth();
    loadTheme();
    setMinDate();
    loadTasks();
    loadAnalyticsReports();
    initializeSessionCounter();
    cleanupPastTasks();
    updateTimerDisplay();

    // Cleanup past tasks daily
    setInterval(cleanupPastTasks, 86400000);

    // Check camera availability
    if (!checkCameraAvailability()) {
        console.warn('Camera not available. Attention detection will be disabled.');
    }

    console.log('Enhanced dashboard initialized');
}

// Check camera availability
function checkCameraAvailability() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Initialize session counter
function initializeSessionCounter() {
    const stored = localStorage.getItem(CONFIG.STORAGE.SESSION_COUNTER_KEY);
    sessionCounter = stored ? parseInt(stored, 10) : 0;
}

// Enhanced Authentication Functions
function checkAuth() {
    const user = localStorage.getItem(CONFIG.STORAGE.USER_KEY);
    if (user) {
        currentUser = JSON.parse(user);
        updateProfileCard();
    } else {
        window.location.href = 'index.html';
    }
}
function updateProfileCard() {
    const profileCard = document.getElementById('profileCard');
    if (!profileCard) return;

    const initials = currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();

    profileCard.innerHTML = `
        <div class="profile-avatar">${initials}</div>
        <div class="profile-info">
            <p><strong>${currentUser.name}</strong></p>
            <p>ID: ${currentUser.id}</p>
            <p>Sessions: ${sessionCounter}</p>
        </div>
        <button id="logoutBtn" class="btn-logout">Logout</button> 
    `; // Changed: Removed onclick, added id="logoutBtn"

    // Now, attach the event listener directly
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

function logout() {
    if (confirm(CONFIG.MESSAGES.LOGOUT_CONFIRM)) {
        localStorage.removeItem(CONFIG.STORAGE.USER_KEY);
        currentUser = null;
        window.location.href = 'index.html';
    }
}

// Enhanced Timer Functions with Analytics Integration
async function startTimer() {
    console.log('Start timer called');
    
    if (isTimerRunning) {
        console.log('Timer already running');
        return;
    }

    // Set timer to its configured duration
    timerSeconds = originalTimerSeconds;
    updateTimerDisplay();
    
    // Set timer as running and update button states
    isTimerRunning = true;
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('resetBtn').disabled = false;

    // Reset session stats
    resetSessionStats();

    // Initialize camera for attention detection (optional)
    let cameraReady = false;

    if (checkCameraAvailability()) {
        try {
            cameraReady = await initCamera();
        } catch (error) {
            console.error('Camera initialization failed:', error);
            cameraReady = false;
        }
    }

    if (!cameraReady) {
        const continueWithoutCamera = confirm(
            'Camera initialization failed or not available. ' +
            'Would you like to continue with timer only (without attention detection)?'
        );

        if (!continueWithoutCamera) {
            // If user cancels, reset everything back to initial state
            isTimerRunning = false;
            document.getElementById('startBtn').disabled = false;
            document.getElementById('pauseBtn').disabled = true;
            document.getElementById('resetBtn').disabled = false;
            return;
        }
    }

    // Start the countdown interval
    timerInterval = setInterval(() => {
        if (timerSeconds > 0) {
            timerSeconds--;
            updateTimerDisplay();

            // Update stats in real-time
            displaySessionStats();
        } else {
            timerComplete();
        }
    }, CONFIG.TIMER.UPDATE_INTERVAL_MS || 1000);

    console.log('Enhanced timer started for 2 minutes');
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;

    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('resetBtn').disabled = false;
    
    console.log('Timer paused');
}

// Updated resetTimer function to reset to 2 minutes
function resetTimer() {
    pauseTimer();
    timerSeconds = originalTimerSeconds; // Reset to the configured duration
    updateTimerDisplay();

    // Stop camera and reset stats
    if (typeof detectionRunning !== 'undefined' && detectionRunning) {
        stopCamera();
    }
    resetSessionStats();

    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('resetBtn').disabled = false;
    
    console.log(`Timer reset to ${Math.floor(originalTimerSeconds / 60)} minutes`);
}
// Enhanced session stats reset
function resetSessionStats() {
    sessionStats = {
        totalFrames: 0,
        focusedFrames: 0,
        distractedFrames: 0,
        noFaceFrames: 0,
        sessionStart: null,
        focusPeriods: [],
        distractionPeriods: [],
        currentState: null,
        stateStartTime: null,
        enhancedMetrics: {
            avgConfidence: 0,
            avgRotation: { yaw: 0, pitch: 0 },
            qualityScore: 0,
            stabilityScore: 0,
            trackingAccuracy: 0,
            peakFocusStreak: 0,
            totalDistractions: 0
        }
    };

    // Reset stats display
    const statsContent = document.getElementById('statsContent');
    if (statsContent) {
        statsContent.innerHTML = `
            <div style="text-align: center; opacity: 0.7;">
                <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                <div>Start a focus session to see your attention statistics here</div>
            </div>
        `;
    }
}

function updateTimerDisplay() {
    const hours = Math.floor(timerSeconds / 3600);
    const minutes = Math.floor((timerSeconds % 3600) / 60);
    const seconds = timerSeconds % 60;

    let display = '';
    if (hours > 0) {
        display += String(hours).padStart(2, '0') + ':';
    }
    display += String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
        timerDisplay.textContent = display;
    }
}

// Enhanced timer completion with analytics integration
function timerComplete() {
    pauseTimer();

    // Increment session counter
    sessionCounter++;
    localStorage.setItem(CONFIG.STORAGE.SESSION_COUNTER_KEY, sessionCounter.toString());

    // Generate comprehensive final report
    const finalReport = generateEnhancedFinalReport();

    // Save report to analytics instead of showing popup
    saveReportToAnalytics(finalReport);

    // Update profile card with new session count
    updateProfileCard();

    // Stop camera after delay
    setTimeout(() => {
        if (typeof detectionRunning !== 'undefined' && detectionRunning) {
            stopCamera();
        }
    }, 3000);

    // Show subtle notification
    showSessionCompleteNotification();
}

// Generate final report
function generateFinalReport() {
    const focusPercentage = sessionStats.totalFrames > 0 ?
        ((sessionStats.focusedFrames / sessionStats.totalFrames) * 100).toFixed(1) : 0;

    const duration = sessionStats.sessionStart ?
        ((Date.now() - sessionStats.sessionStart) / 1000 / 60).toFixed(1) :
        ((originalTimerSeconds - timerSeconds) / 60).toFixed(1);

    let assessment = 'Session completed';
    let assessmentCategory = 'MODERATE';

    if (sessionStats.totalFrames > 0) {
        const focus = parseFloat(focusPercentage);
        if (focus >= CONFIG.ASSESSMENT.EXCELLENT) {
            assessment = 'Excellent session';
            assessmentCategory = 'EXCELLENT';
        } else if (focus >= CONFIG.ASSESSMENT.GOOD) {
            assessment = 'Good session';
            assessmentCategory = 'GOOD';
        } else if (focus >= CONFIG.ASSESSMENT.MODERATE) {
            assessment = 'Moderate session';
            assessmentCategory = 'MODERATE';
        } else if (focus >= CONFIG.ASSESSMENT.BELOW_AVERAGE) {
            assessment = 'Below average session';
            assessmentCategory = 'BELOW_AVERAGE';
        } else {
            assessment = 'Poor session';
            assessmentCategory = 'POOR';
        }
    }

    const detectorMetrics = attentionDetector ? attentionDetector.getPerformanceMetrics() : null;

    return {
        sessionId: sessionCounter,
        timestamp: new Date().toISOString(),
        userId: currentUser.id,
        duration: parseFloat(duration),
        completed: timerSeconds <= 0,
        focusPercentage: sessionStats.totalFrames > 0 ? parseFloat(focusPercentage) : null,
        totalFrames: sessionStats.totalFrames,
        focusedFrames: sessionStats.focusedFrames,
        distractedFrames: sessionStats.distractedFrames,
        noFaceFrames: sessionStats.noFaceFrames,
        assessment,
        assessmentCategory,
        detectorMetrics: detectorMetrics ? {
            avgProcessingTime: detectorMetrics.averageProcessingTime.toFixed(2),
            maxFocusStreak: detectorMetrics.maxFocusStreak,
            detectionRate: detectorMetrics.detectionRate.toFixed(1),
            sessionQuality: (detectorMetrics.sessionQualityScore * 100).toFixed(1)
        } : null
    };
}

// Generate enhanced final report (alias for compatibility)
function generateEnhancedFinalReport() {
    return generateFinalReport();
}

// Save report
function saveReportToAnalytics(report) {
    try {
        let savedReports = JSON.parse(localStorage.getItem(CONFIG.STORAGE.REPORTS_KEY) || '[]');
        savedReports.unshift(report);
        if (savedReports.length > CONFIG.STORAGE.MAX_SAVED_REPORTS) {
            savedReports = savedReports.slice(0, CONFIG.STORAGE.MAX_SAVED_REPORTS);
        }
        localStorage.setItem(CONFIG.STORAGE.REPORTS_KEY, JSON.stringify(savedReports));
        loadAnalyticsReports();
        console.log(`Report saved: Session ${report.sessionId}`);
    } catch (error) {
        console.error('Failed to save report:', error);
    }
}

// Load analytics
function loadAnalyticsReports() {
    const analyticsContent = document.getElementById('analyticsContent');
    const clearBtn = document.querySelector('.analytics-clear-btn');
    const emptyState = document.querySelector('.analytics-empty');
    const savedReports = document.getElementById('savedReports');
    
    if (!analyticsContent) return;

    try {
        const reports = JSON.parse(localStorage.getItem(CONFIG.STORAGE.REPORTS_KEY) || '[]');

        if (reports.length === 0) {
            // Show empty state
            if (emptyState) emptyState.style.display = 'block';
            if (savedReports) savedReports.style.display = 'none';
            if (clearBtn) clearBtn.style.display = 'none';
            return;
        }

        // Hide empty state and show reports
        if (emptyState) emptyState.style.display = 'none';
        if (savedReports) savedReports.style.display = 'block';
        if (clearBtn) clearBtn.style.display = 'block';

        // Clear existing reports
        if (savedReports) {
            savedReports.innerHTML = '';
            
            // Add reports with proper styling
            reports.forEach((report) => {
                const reportElement = createReportElement(report);
                savedReports.appendChild(reportElement);
            });
        }
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

// Create report item
function createReportElement(report) {
    const reportDiv = document.createElement('div');
    reportDiv.className = 'analytics-report';
    reportDiv.onclick = () => showReportDetails(report);

    const category = CONFIG.ANALYTICS.REPORT_CATEGORIES[report.assessmentCategory] ||
        { color: '#666', icon: '📊' };

    const focusDisplay = report.focusPercentage !== null ? `${report.focusPercentage}%` : 'N/A';
    const dateDisplay = new Date(report.timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Apply category color as border
    reportDiv.style.borderLeftColor = category.color;
    reportDiv.style.borderLeftWidth = '4px';

    reportDiv.innerHTML = `
        <div class="report-header">
            <div class="report-title" style="color: ${category.color};">
                ${category.icon} Session ${report.sessionId}
            </div>
            <div class="report-focus-score" style="color: ${category.color};">
                ${focusDisplay}
            </div>
        </div>
        <div class="report-details">
            <div class="report-date">${dateDisplay}</div>
            <div class="report-duration">${report.duration}min</div>
        </div>
    `;

    return reportDiv;
}

// Show report details
function showReportDetails(report) {
    const modal = document.getElementById('reportModal');
    const title = document.getElementById('reportTitle');
    const details = document.getElementById('reportDetails');

    if (!modal || !title || !details) return;

    const category = CONFIG.ANALYTICS.REPORT_CATEGORIES[report.assessmentCategory] ||
        { color: '#666', icon: '📊' };

    title.innerHTML = `${category.icon} Session ${report.sessionId} Details`;

    const focusDisplay = report.focusPercentage !== null ? `${report.focusPercentage}%` : 'No data';

    details.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div>
                <h4 style="color: ${category.color};">Overview</h4>
                <p><strong>Date:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
                <p><strong>Duration:</strong> ${report.duration} minutes</p>
                <p><strong>Status:</strong> ${report.completed ? 'Completed' : 'Incomplete'}</p>
                <p><strong>Assessment:</strong> ${report.assessment}</p>
            </div>
            <div>
                <h4 style="color: ${category.color};">Metrics</h4>
                <p><strong>Focus Score:</strong> ${focusDisplay}</p>
                <p><strong>Total Frames:</strong> ${report.totalFrames || 'N/A'}</p>
                <p><strong>Focused Frames:</strong> ${report.focusedFrames || 0}</p>
                <p><strong>Detection Rate:</strong> ${report.detectorMetrics ? report.detectorMetrics.detectionRate + '%' : 'N/A'}</p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

// Clear analytics
function clearAnalytics() {
    if (confirm('Clear all reports?')) {
        localStorage.removeItem(CONFIG.STORAGE.REPORTS_KEY);
        loadAnalyticsReports();
    }
}


// Show subtle session complete notification
function showSessionCompleteNotification() {
    // Create and show a temporary notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        font-weight: bold;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 20px;">🎉</span>
            <div>
                <div>Session Complete!</div>
                <div style="font-size: 12px; opacity: 0.9;">Report saved to Analytics</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

// Enhanced Session Statistics Functions
function updateSessionStats(state) {
    sessionStats.totalFrames++;

    if (state === 'focused') {
        sessionStats.focusedFrames++;
    } else if (state === 'distracted') {
        sessionStats.distractedFrames++;
    } else if (state === 'noFace') {
        sessionStats.noFaceFrames++;
    }

    // Track state changes for period analysis (handled in camera-handler)
    const currentTime = new Date();
    if (sessionStats.currentState !== state) {
        if (sessionStats.currentState && sessionStats.stateStartTime) {
            const duration = (currentTime - sessionStats.stateStartTime) / 1000;

            if (sessionStats.currentState === 'focused') {
                sessionStats.focusPeriods.push({ duration, timestamp: currentTime });
            } else if (sessionStats.currentState === 'distracted') {
                sessionStats.distractionPeriods.push({ duration, timestamp: currentTime });
            }
        }

        sessionStats.currentState = state;
        sessionStats.stateStartTime = currentTime;
    }

    // Initialize session start time
    if (!sessionStats.sessionStart) {
        sessionStats.sessionStart = currentTime;
    }
}

// Enhanced statistics display with real-time updates
function displaySessionStats() {
    const statsContent = document.getElementById('statsContent');

    if (!statsContent || sessionStats.totalFrames === 0) {
        if (statsContent) {
            statsContent.innerHTML = `
                <div style="text-align: center; opacity: 0.7;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📊</div>
                    <div>Camera not active or no data yet</div>
                </div>
            `;
        }
        return;
    }

    const focusPercentage = ((sessionStats.focusedFrames / sessionStats.totalFrames) * 100).toFixed(1);
    const distractedPercentage = ((sessionStats.distractedFrames / sessionStats.totalFrames) * 100).toFixed(1);
    const noFacePercentage = ((sessionStats.noFaceFrames / sessionStats.totalFrames) * 100).toFixed(1);

    const sessionDuration = sessionStats.sessionStart ?
        ((new Date() - sessionStats.sessionStart) / 1000 / 60).toFixed(1) : 0;

    // Enhanced assessment with more granular feedback
    let assessment = 'Gathering data...';
    let assessmentColor = '#666';
    
    if (sessionStats.totalFrames > 30) {
        const focusNum = parseFloat(focusPercentage);
        if (focusNum >= CONFIG.ASSESSMENT.EXCELLENT) {
            assessment = 'Excellent focus! 🏆';
            assessmentColor = '#4CAF50';
        } else if (focusNum >= CONFIG.ASSESSMENT.GOOD) {
            assessment = 'Good focus maintained ✅';
            assessmentColor = '#8BC34A';
        } else if (focusNum >= CONFIG.ASSESSMENT.MODERATE) {
            assessment = 'Moderate focus ⚠️';
            assessmentColor = '#FFC107';
        } else if (focusNum >= CONFIG.ASSESSMENT.BELOW_AVERAGE) {
            assessment = 'Below average focus 📉';
            assessmentColor = '#FF9800';
        } else {
            assessment = 'Poor focus - adjust position ❌';
            assessmentColor = '#F44336';
        }
    }

    // Get enhanced metrics if available
    const enhancedInfo = getEnhancedStatsInfo();

    statsContent.innerHTML = `
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-value" style="font-size: 2.5rem; font-weight: bold; color: #4CAF50;">${focusPercentage}%</div>
                <div class="stat-label" style="font-size: 16px;">Focused</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="font-size: 2.5rem; font-weight: bold; color: #FF5722;">${distractedPercentage}%</div>
                <div class="stat-label" style="font-size: 16px;">Distracted</div>
            </div>
        </div>
        <div class="stats-row">
            <div class="stat-box">
                <div class="stat-value" style="font-size: 2.2rem; font-weight: bold;">${sessionDuration}</div>
                <div class="stat-label" style="font-size: 16px;">Minutes</div>
            </div>
            <div class="stat-box">
                <div class="stat-value" style="font-size: 2.2rem; font-weight: bold;">${sessionStats.totalFrames}</div>
                <div class="stat-label" style="font-size: 16px;">Frames</div>
            </div>
        </div>
        <div class="assessment-text" style="font-size: 18px; font-weight: bold; margin-top: 15px; color: ${assessmentColor};">
            ${assessment}
            ${sessionStats.noFaceFrames > sessionStats.totalFrames * 0.2 ?
            '<br><small style="font-size: 14px; color: #FF9800;">⚠️ Face detection issues detected</small>' : ''}
            ${enhancedInfo ? `<br><small style="font-size: 12px; opacity: 0.8;">${enhancedInfo}</small>` : ''}
        </div>
    `;
}

// Get enhanced statistics information
function getEnhancedStatsInfo() {
    if (!attentionDetector) return null;
    
    try {
        const metrics = attentionDetector.getPerformanceMetrics ? attentionDetector.getPerformanceMetrics() : null;
        if (!metrics) return null;
        
        let info = '';
        if (metrics.maxFocusStreak > 0) {
            info += `Max streak: ${metrics.maxFocusStreak} | `;
        }
        if (metrics.trackingConfidence > 0) {
            info += `Quality: ${(metrics.trackingConfidence * 100).toFixed(0)}%`;
        }
        
        return info || null;
    } catch (error) {
        console.warn('Error getting enhanced stats info:', error);
        return null;
    }
}

// Timer Settings Functions
function openTimerSettings() {
    const hours = Math.floor(originalTimerSeconds / 3600);
    const minutes = Math.floor((originalTimerSeconds % 3600) / 60);

    document.getElementById('timerHours').value = hours;
    document.getElementById('timerMinutes').value = minutes;
    document.getElementById('timerModal').style.display = 'flex';
}

function setCustomTimer() {
    const hours = parseInt(document.getElementById('timerHours').value) || 0;
    const minutes = parseInt(document.getElementById('timerMinutes').value) || 0;

    const totalSeconds = (hours * 3600) + (minutes * 60);

    if (totalSeconds <= 0) {
        alert(CONFIG.MESSAGES.TIMER_INVALID);
        return;
    }

    if (totalSeconds > 86400) { // 24 hours max
        alert("Maximum timer duration is 24 hours.");
        return;
    }

    originalTimerSeconds = totalSeconds;
    timerSeconds = totalSeconds;
    updateTimerDisplay();
    closeModal('timerModal');
    
    console.log(`Timer set to ${hours}:${String(minutes).padStart(2, '0')}`);
}

// Theme Functions
function changeTheme(element) {
    document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');

    const theme = element.dataset.theme;
    document.body.className = theme;
    localStorage.setItem(CONFIG.STORAGE.THEME_KEY, theme);
    
    console.log(`Theme changed to: ${theme}`);
}

function loadTheme() {
    const savedTheme = localStorage.getItem(CONFIG.STORAGE.THEME_KEY) || 'theme-default';
    const option = document.querySelector(`[data-theme="${savedTheme}"]`);
    if (option) {
        changeTheme(option);
    }
}

// Enhanced Task Management Functions
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    const taskDateInput = document.getElementById('taskDate');
    if (taskDateInput) {
        taskDateInput.setAttribute('min', today);
    }
}

function openTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) {
        modal.style.display = 'flex';
        const taskNameInput = document.getElementById('taskName');
        if (taskNameInput) {
            taskNameInput.focus();
        }
    }
}

function addTask() {
    const taskName = document.getElementById('taskName').value.trim();
    const taskDate = document.getElementById('taskDate').value;

    if (!taskName || !taskDate) {
        alert(CONFIG.MESSAGES.TASK_INCOMPLETE);
        return;
    }

    const task = {
        name: taskName,
        date: taskDate,
        id: 'TASK' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        priority: 'normal'
    };

    let tasks = JSON.parse(localStorage.getItem(CONFIG.STORAGE.TASKS_KEY) || '[]');
    tasks.push(task);
    tasks.sort((a, b) => new Date(a.date) - new Date(b.date));
    localStorage.setItem(CONFIG.STORAGE.TASKS_KEY, JSON.stringify(tasks));

    // Clear form
    document.getElementById('taskName').value = '';
    document.getElementById('taskDate').value = '';
    closeModal('taskModal');
    loadTasks();
    
    console.log('Task added:', task.name);
}

function loadTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    taskList.innerHTML = '';

    let tasks = JSON.parse(localStorage.getItem(CONFIG.STORAGE.TASKS_KEY) || '[]');
    const userTasks = tasks.filter(task => task.userId === currentUser.id);
    userTasks.sort((a, b) => new Date(a.date) - new Date(b.date));

    userTasks.forEach(task => {
        const li = document.createElement('li');
        const isOverdue = new Date(task.date) < new Date();
        
        li.innerHTML = `
            <div class="task-info" style="${isOverdue ? 'opacity: 0.7;' : ''}">
                <div class="task-name" style="${isOverdue ? 'text-decoration: line-through;' : ''}">${task.name}</div>
                <div class="task-date" style="color: ${isOverdue ? '#ff6b6b' : 'inherit'};">${formatDate(task.date)}</div>
            </div>
            <button class="btn-remove" onclick="removeTask('${task.id}')" title="Remove Task">✖</button>
        `;
        taskList.appendChild(li);
    });

    if (userTasks.length === 0) {
        taskList.innerHTML = '<li style="text-align: center; opacity: 0.7; padding: 20px;">No tasks yet. Add your first task!</li>';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }
}

function removeTask(taskId) {
    if (confirm(CONFIG.MESSAGES.TASK_CONFIRM_DELETE)) {
        let tasks = JSON.parse(localStorage.getItem(CONFIG.STORAGE.TASKS_KEY) || '[]');
        tasks = tasks.filter(t => t.id !== taskId);
        localStorage.setItem(CONFIG.STORAGE.TASKS_KEY, JSON.stringify(tasks));
        loadTasks();
        console.log('Task removed:', taskId);
    }
}

function cleanupPastTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let tasks = JSON.parse(localStorage.getItem(CONFIG.STORAGE.TASKS_KEY) || '[]');
    const originalCount = tasks.length;

    // Remove tasks older than 7 days to avoid clutter
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - 7);

    tasks = tasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate >= cutoffDate;
    });

    if (tasks.length !== originalCount) {
        localStorage.setItem(CONFIG.STORAGE.TASKS_KEY, JSON.stringify(tasks));
        console.log(`Cleaned up ${originalCount - tasks.length} old tasks`);
        if (document.getElementById('task-list')) {
            loadTasks(); // Refresh display if on page
        }
    }
}

// Modal Functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Enhanced Utility Functions
function showWelcome() {
    const message = `Welcome to your Enhanced Smart Dashboard!\n\n` +
        `New Features:\n` +
        `• Advanced Face Detection with Head Rotation Tracking\n` +
        `• Real-time Attention Quality Monitoring\n` +
        `• Comprehensive Session Analytics\n` +
        `• Saved Reports in Analytics Section\n` +
        `• Enhanced Performance Optimization\n` +
        `• Detailed Session Metrics\n\n` +
        `Your focus sessions are now automatically saved to the Analytics section. ` +
        `Start the timer to begin tracking with enhanced accuracy!`;

    alert(message);
}
demo
// Enhanced Keyboard shortcuts
document.addEventListener('keydown', function (event) {
    // Prevent shortcuts during timer running to avoid accidental actions
    if (isTimerRunning && (event.key === 'r' || event.key === 'R')) {
        return;
    }

    // Space bar to start/pause timer
    if (event.code === 'Space' && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        event.preventDefault();
        if (!isTimerRunning) {
            startTimer();
        } else {
            pauseTimer();
        }
    }

    // 'R' key to reset timer (only when not running)
    if ((event.key === 'r' || event.key === 'R') && !isTimerRunning && event.target.tagName !== 'INPUT') {
        resetTimer();
    }

    // Escape key to close modals
    if (event.key === 'Escape') {
        closeModal('taskModal');
        closeModal('timerModal');
        closeModal('reportModal');
    }

    // 'A' key to open analytics (when no input is focused)
    if ((event.key === 'a' || event.key === 'A') && event.target.tagName !== 'INPUT' && event.target.tagName !== 'TEXTAREA') {
        const analyticsSection = document.getElementById('analyticsContent');
        if (analyticsSection) {
            analyticsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
});

// Enhanced Error handling and user feedback
window.addEventListener('error', function (event) {
    console.error('Application error:', event.error);
    
    // Handle specific error types
    if (event.error && event.error.message) {
        if (event.error.message.includes('camera') || event.error.message.includes('getUserMedia')) {
            console.warn('Camera-related error detected. Attention detection may not work properly.');
        } else if (event.error.message.includes('localStorage') || event.error.message.includes('storage')) {
            console.warn('Storage error detected. Data saving may be affected.');
            alert('Warning: Data storage issue detected. Your session data may not be saved properly.');
        }
    }
});

// Handle visibility change (tab switching) with enhanced behavior
document.addEventListener('visibilitychange', function () {
    if (document.hidden && isTimerRunning) {
        console.log('Tab hidden - timer continues running');
    } else if (!document.hidden && isTimerRunning) {
        console.log('Tab visible - timer still running');
    }
});

// Enhanced Application State Management
function getApplicationState() {
    return {
        user: currentUser,
        timer: {
            isRunning: isTimerRunning,
            currentSeconds: timerSeconds,
            originalSeconds: originalTimerSeconds
        },
        session: {
            counter: sessionCounter,
            stats: sessionStats,
            hasActiveCamera: typeof detectionRunning !== 'undefined' ? detectionRunning : false
        },
        storage: {
            tasks: localStorage.getItem(CONFIG.STORAGE.TASKS_KEY) ? 'available' : 'empty',
            reports: localStorage.getItem(CONFIG.STORAGE.REPORTS_KEY) ? 'available' : 'empty',
            theme: localStorage.getItem(CONFIG.STORAGE.THEME_KEY) || 'default'
        }
    };
}

// Data Export Function (for future use)
function exportSessionData() {
    const data = {
        user: currentUser,
        sessionCounter: sessionCounter,
        savedReports: JSON.parse(localStorage.getItem(CONFIG.STORAGE.REPORTS_KEY) || '[]'),
        tasks: JSON.parse(localStorage.getItem(CONFIG.STORAGE.TASKS_KEY) || '[]'),
        exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Session data exported');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboard);
} else {
    initDashboard();
}