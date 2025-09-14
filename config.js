const CONFIG = {
    MEDIAPIPE: {
        FACE_MESH_OPTIONS: {
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        },
        CAMERA_OPTIONS: {
            width: 640,
            height: 480,
            facingMode: 'user'
        },
        CDN_BASE_URL: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/'
    },

    // Attention Detection Settings
    ATTENTION: {
        FOCUS_THRESHOLD: 0.54,
        SMOOTHING_WINDOW: 10,
        MAX_YAW_DEGREES: 25.0,    
        MAX_PITCH_DEGREES: 20.0,  
        YAW_WEIGHT: 0.8,           
        PITCH_WEIGHT: 0.6,        
        POWER_CURVE: 0.7,
        PROCESSING_FPS: 10,
        ADAPTIVE_THRESHOLD: true,
        FOCUS_BOX_SIZE: 0.6   
    },

    TIMER: {
        DEFAULT_MINUTES: 25,
        MIN_SECONDS: 60,
        MAX_SECONDS: 86400,
        UPDATE_INTERVAL_MS: 1000
    },

    // UI Settings
    UI: {
        ANIMATION_DURATION: 300,
        THEME_TRANSITION_DURATION: 300,
        MODAL_FADE_DURATION: 200,
        STATS_UPDATE_INTERVAL: 1000,
        DEBUG_OVERLAY: true,
        SHOW_LANDMARKS: true,
        LANDMARK_DENSITY: 4
    },

    // Storage Settings
    STORAGE: {
        USER_KEY: 'currentUser',
        THEME_KEY: 'selectedTheme',
        TASKS_KEY: 'tasks',
        SETTINGS_KEY: 'appSettings',
        STATS_HISTORY_KEY: 'statsHistory',
        REPORTS_KEY: 'savedReports',  // New key for saved reports
        SESSION_COUNTER_KEY: 'sessionCounter',  // Added missing key
        MAX_STATS_HISTORY: 30,
        MAX_SAVED_REPORTS: 50  // Added missing key
    },

    // Performance Settings
    PERFORMANCE: {
        MAX_PROCESSING_TIMES: 100,
        PERFORMANCE_WARNING_MS: 50,
        MEMORY_CLEANUP_INTERVAL: 300000,
        AUTO_PAUSE_ON_TAB_SWITCH: false
    },

    // Feature Flags
    FEATURES: {
        FACE_DETECTION: true,
        ATTENTION_TRACKING: true,
        HEAD_ROTATION_DETECTION: true, 
        ADAPTIVE_THRESHOLD: true,
        PERFORMANCE_MONITORING: true,
        KEYBOARD_SHORTCUTS: true,
        AUTO_TASK_CLEANUP: true,
        SESSION_HISTORY: true,      
        EXPORT_STATS: false,
        CUSTOM_THEMES: false
    },

    // Error Messages
    MESSAGES: {
        CAMERA_DENIED: 'Camera permission denied. Please allow camera access and try again.',
        CAMERA_NOT_FOUND: 'No camera found. Please connect a camera and try again.',
        CAMERA_BUSY: 'Camera is being used by another application. Please close other applications and try again.',
        MEDIAPIPE_LOAD_FAILED: 'Failed to load face detection libraries. Please refresh the page and try again.',
        BROWSER_NOT_SUPPORTED: 'Your browser does not support the required features. Please use a modern browser.',
        TIMER_INVALID: 'Please set a valid time between 1 minute and 24 hours.',
        TASK_INCOMPLETE: 'Please enter both task name and date.',
        TASK_CONFIRM_DELETE: 'Are you sure you want to remove this task?',
        LOGOUT_CONFIRM: 'Are you sure you want to logout?'
    },

    // Themes Configuration
    THEMES: {
        DEFAULT: {
            name: 'Default',
            primary: 'linear-gradient(135deg, #193964 0%, #9CCBD9 100%)',
            accent: '#4facfe'
        },
        DARK: {
            name: 'Dark',
            primary: 'linear-gradient(135deg, #1a1a1a 0%, #333333 100%)',
            accent: '#555555'
        },
        OLIVE: {
            name: 'Olive Green',
            primary: 'linear-gradient(135deg, #556B2F 0%, #8FBC8F 100%)',
            accent: '#66bb6a'
        },
        PINKORANGE: {
            name: 'Pink Orange',
            primary: 'linear-gradient(135deg, #FF837A 0%, #FFA35C 100%)',
            accent: '#ff6b35'
        }
    },

    // Landmark Indices (MediaPipe Face Mesh)
    LANDMARKS: {
        NOSE_TIP: 1,
        LEFT_EYE: 33,
        RIGHT_EYE: 263,
        LEFT_MOUTH: 61,
        RIGHT_MOUTH: 291,
        CHIN: 175,
        FOREHEAD: 10
    },

    // Assessment Thresholds
    ASSESSMENT: {
        EXCELLENT: 90,
        GOOD: 80,
        MODERATE: 70,
        BELOW_AVERAGE: 60,
        POOR: 0
    },

    // Head Rotation Thresholds (in degrees)
    HEAD_ROTATION: {
        STRAIGHT_YAW_TOLERANCE: 15,     // Must be within ±15 degrees for yaw
        STRAIGHT_PITCH_TOLERANCE: 10,   // Must be within ±10 degrees for pitch
        DISTRACTION_YAW_THRESHOLD: 20,  // Beyond ±20 degrees is distracted
        DISTRACTION_PITCH_THRESHOLD: 15 // Beyond ±15 degrees is distracted
    },

    // Analytics Configuration
    ANALYTICS: {
        REPORT_CATEGORIES: {
            EXCELLENT: { color: '#4CAF50', icon: '🏆' },
            GOOD: { color: '#8BC34A', icon: '✅' },
            MODERATE: { color: '#FFC107', icon: '⚠️' },
            BELOW_AVERAGE: { color: '#FF9800', icon: '📉' },
            POOR: { color: '#F44336', icon: '❌' }
        }
    },

    // Debug Settings (Development only)
    DEBUG: {
        ENABLED: false,
        LOG_PERFORMANCE: false,
        LOG_ATTENTION_SCORES: false,
        LOG_POSE_DATA: false,
        SHOW_FPS: false,
        MOCK_CAMERA_DATA: false
    }
};

// Validation function to ensure config is properly loaded
function validateConfig() {
    const requiredKeys = ['MEDIAPIPE', 'ATTENTION', 'TIMER', 'UI', 'STORAGE'];
    const missing = requiredKeys.filter(key => !CONFIG[key]);
    
    if (missing.length > 0) {
        console.error('Missing configuration keys:', missing);
        return false;
    }
    
    return true;
}

// Export configuration for use in other files
if (typeof window !== 'undefined') {
    window.APP_CONFIG = CONFIG;
    window.validateConfig = validateConfig;
}

// Initialize configuration validation
document.addEventListener('DOMContentLoaded', function() {
    if (!validateConfig()) {
        console.error('Configuration validation failed');
    } else {
        console.log('Configuration loaded successfully');
    }
});

// Helper functions for configuration access
const getConfig = (path) => {
    const keys = path.split('.');
    let value = CONFIG;
    
    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return undefined;
        }
    }
    
    return value;
};

const updateConfig = (path, newValue) => {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = CONFIG;
    
    for (const key of keys) {
        if (!(key in target) || typeof target[key] !== 'object') {
            target[key] = {};
        }
        target = target[key];
    }
    
    target[lastKey] = newValue;
};

// Make helper functions globally available
if (typeof window !== 'undefined') {
    window.getConfig = getConfig;
    window.updateConfig = updateConfig;
}