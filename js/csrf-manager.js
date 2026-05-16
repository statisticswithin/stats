// ========== CSRF PROTECTION - FRONTEND ==========

const CSRFManager = (function() {
    // Private variables
    let currentToken = null;
    let sessionId = null;
    let tokenExpiry = null;
    
    /**
     * Generate a random session ID for this browser session
     */
    function generateSessionId() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    /**
     * Get or create session ID
     */
    function getOrCreateSessionId() {
        let storedSessionId = sessionStorage.getItem('csrf_session_id');
        if (!storedSessionId) {
            storedSessionId = generateSessionId();
            sessionStorage.setItem('csrf_session_id', storedSessionId);
        }
        return storedSessionId;
    }
    
    /**
     * Fetch CSRF token from server
     */
    async function fetchTokenFromServer() {
        const sid = getOrCreateSessionId();
        
        try {
            const response = await fetch(`${API_BASE_URL}?action=getCSRFToken&session_id=${encodeURIComponent(sid)}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success && result.data && result.data.csrf_token) {
                currentToken = result.data.csrf_token;
                sessionId = sid;
                tokenExpiry = Date.now() + (55 * 60 * 1000); // 55 minutes expiry
                sessionStorage.setItem('csrf_token', currentToken);
                sessionStorage.setItem('csrf_expiry', tokenExpiry.toString());
                return currentToken;
            }
        } catch (error) {
            console.error('Failed to fetch CSRF token:', error);
        }
        
        return null;
    }
    
    /**
     * Get current CSRF token (generates new if needed)
     */
    async function getToken() {
        // Check if we have a valid token
        const storedToken = sessionStorage.getItem('csrf_token');
        const storedExpiry = sessionStorage.getItem('csrf_expiry');
        
        if (storedToken && storedExpiry && parseInt(storedExpiry) > Date.now()) {
            currentToken = storedToken;
            sessionId = getOrCreateSessionId();
            return currentToken;
        }
        
        // Fetch new token
        return await fetchTokenFromServer();
    }
    
    /**
     * Add CSRF token to request data
     */
    async function addCSRFToData(data) {
        const token = await getToken();
        if (!token) {
            console.warn('Could not obtain CSRF token');
            return data;
        }
        
        return {
            ...data,
            csrf_token: token,
            session_id: getOrCreateSessionId()
        };
    }
    
    /**
     * Wrapper for fetch API with automatic CSRF injection
     */
    async function fetchWithCSRF(url, options = {}) {
        const isPost = options.method === 'POST' || (!options.method && options.body);
        
        if (isPost && options.body) {
            let bodyData;
            
            if (typeof options.body === 'string') {
                try {
                    bodyData = JSON.parse(options.body);
                } catch (e) {
                    bodyData = {};
                }
            } else {
                bodyData = options.body;
            }
            
            const enhancedData = await addCSRFToData(bodyData);
            
            options.body = JSON.stringify(enhancedData);
            options.headers = {
                'Content-Type': 'application/json',
                ...options.headers
            };
        }
        
        return fetch(url, options);
    }
    
    /**
     * Initialize CSRF protection on page load
     */
    async function init() {
        await getToken();
        
        // Refresh token every 50 minutes
        setInterval(async () => {
            await fetchTokenFromServer();
        }, 50 * 60 * 1000);
        
        console.log('CSRF Protection initialized');
    }
    
    // Public API
    return {
        init: init,
        getToken: getToken,
        addCSRFToData: addCSRFToData,
        fetchWithCSRF: fetchWithCSRF
    };
})();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => CSRFManager.init());
} else {
    CSRFManager.init();
}