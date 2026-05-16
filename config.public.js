// config.public.js
window.APP_CONFIG = {
    // IMPORTANT: Replace with your NEW deployment URL
    apiUrl: 'https://script.google.com/macros/s/AKfycbzD2yAfuGM1n3WNKcbBinZnrdk3rbAyOi7I81LuyKa-vZtjjmCL58D1qe2CTq6UMXQS/exec',
    sessionVersion: '1',
    appName: 'Statistics Management System'
};

window.API_BASE_URL = window.APP_CONFIG.apiUrl;
window.API_KEY = '';

console.log('✅ Public config loaded');
console.log('API URL:', window.APP_CONFIG.apiUrl);