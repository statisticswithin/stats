// ========== HOME PAGE - MAIN APPLICATION ==========

// Global variables
let members = [];
let visits = [];
let events = [];

// Load data from API
async function loadData() {
    console.log('Loading home page data from API...');
    
    // Show loading indicator
    showLoading(true);
    
    try {
        // Fetch members
        const membersResult = await api.getMembers();
        if (membersResult.success) {
            members = membersResult.data || [];
            // Cache in localStorage for offline fallback
            localStorage.setItem('kganya_members', JSON.stringify(members));
        } else {
            console.warn('Failed to fetch members:', membersResult.error);
            // Fallback to localStorage
            const storedMembers = localStorage.getItem('kganya_members');
            members = storedMembers ? JSON.parse(storedMembers) : [];
        }

        // Fetch visits
        const visitsResult = await api.getVisits();
        if (visitsResult.success) {
            visits = visitsResult.data || [];
            localStorage.setItem('kganya_visits', JSON.stringify(visits));
        } else {
            const storedVisits = localStorage.getItem('kganya_visits');
            visits = storedVisits ? JSON.parse(storedVisits) : [];
        }

        // Fetch events for upcoming events section
        const eventsResult = await api.getEvents();
        if (eventsResult.success) {
            events = eventsResult.data || [];
            updateUpcomingEvents(events);
        }

        updateStatistics();
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage
        const storedMembers = localStorage.getItem('kganya_members');
        const storedVisits = localStorage.getItem('kganya_visits');
        members = storedMembers ? JSON.parse(storedMembers) : [];
        visits = storedVisits ? JSON.parse(storedVisits) : [];
        updateStatistics();
        showNotification('Error loading data. Using cached data.', 'warning');
    } finally {
        showLoading(false);
    }
}

// Update upcoming events section with real events
function updateUpcomingEvents(events) {
    const eventsGrid = document.querySelector('.events-grid');
    if (!eventsGrid) return;
    
    if (!events.length) {
        eventsGrid.innerHTML = '<div class="col-12 text-center"><p>No upcoming events scheduled.</p></div>';
        return;
    }
    
    // Get upcoming events (next 30 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcomingEvents = events
        .filter(e => {
            const eventDate = new Date(e.event_date);
            eventDate.setHours(0, 0, 0, 0);
            return eventDate >= today;
        })
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
        .slice(0, 3);

    if (upcomingEvents.length > 0) {
        eventsGrid.innerHTML = upcomingEvents.map(event => {
            const eventDate = new Date(event.event_date);
            const formattedDate = eventDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            
            // AFTER ✅
            const day = escapeHtml(String(eventDate.getDate()));
            const month = escapeHtml(eventDate.toLocaleString('default', { month: 'short' }).toUpperCase());

            return `
                <div class="col-md-4 mb-4" data-aos="fade-up">
                    <div class="event-card">
                        <div class="event-date">
                            <span class="event-day">${day}</span>
                            <span class="event-month">${month}</span>
                        </div>
                        <div class="event-details">
                            <h4>${escapeHtml(event.event_name || 'Church Event')}</h4>
                            <p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.event_venue || 'Main Sanctuary')}</p>
                            <p><i class="fas fa-clock"></i> ${escapeHtml(event.event_time || '9:00 AM')}</p>
                            <p><i class="fas fa-tag"></i> ${escapeHtml(event.event_type || '')}</p>
                            <span class="event-badge">Upcoming</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        eventsGrid.innerHTML = '<div class="col-12 text-center"><p>No upcoming events scheduled.</p></div>';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Update statistics on the home page
function updateStatistics() {
    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.status === 'active' || m.status === 'Active').length;
    const kganyaMembers = members.filter(m => m.kganya_member === 'Yes' || m.kganya_member === true || m.kganya_member === 'TRUE').length;
    
    // Get today's visits
    const today = new Date().toISOString().split('T')[0];
    const todayVisits = visits.filter(v => {
        const visitDate = v.visit_date || v.date;
        return visitDate === today;
    }).length;

    // Animate the numbers
    animateNumber('totalMembers', totalMembers);
    animateNumber('activeMembers', activeMembers);
    animateNumber('todayVisits', todayVisits);
    animateNumber('kganyaMembers', kganyaMembers);
}

// Animate counting numbers
function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let currentValue = 0;
    const duration = 2000;
    const stepTime = 20;
    const steps = duration / stepTime;
    const increment = targetValue / steps;
    
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            element.textContent = targetValue;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(currentValue);
        }
    }, stepTime);
}

// Show/hide loading indicator
function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = show ? 'flex' : 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
    const colors = {
        success: '#4CAF50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196F3'
    };
    
    notification.textContent = message;
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Update footer year
function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Add parallax effect to hero section
function setupParallax() {
    const hero = document.getElementById('homeHero');
    if (!hero) return;
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        if (scrolled <= window.innerHeight) {
            hero.style.backgroundPositionY = scrolled * 0.5 + 'px';
        }
    });
}

// Add floating animation to cards
function setupFloatingCards() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });
}

// Initialize AOS animations
function initAOS() {
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100
        });
    }
}

// Add hover effect for stat cards
function setupStatCards() {
    const statCards = document.querySelectorAll('.stat-card-flashing');
    statCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-5px)';
            card.style.transition = 'transform 0.3s ease';
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });
}

// Auto-refresh statistics every 30 seconds
function startAutoRefresh() {
    setInterval(async () => {
        try {
            const membersResult = await api.getMembers();
            if (membersResult.success) {
                members = membersResult.data || [];
                localStorage.setItem('kganya_members', JSON.stringify(members));
            }
            
            const visitsResult = await api.getVisits();
            if (visitsResult.success) {
                visits = visitsResult.data || [];
                localStorage.setItem('kganya_visits', JSON.stringify(visits));
            }
            
            updateStatistics();
            console.log('Statistics auto-refreshed');
        } catch (error) {
            console.error('Auto-refresh error:', error);
        }
    }, 30000);
}

// Logout handler
function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            await api.logout();
            window.location.href = 'index.html';
        });
    }
}

// Display user info in navbar
function displayUserInfo() {
    const user = api.getCurrentUser();
    const userNameElement = document.getElementById('userName');
    if (userNameElement && user) {
        userNameElement.textContent = user.username || 'User';
    }
}

// Initialize dashboard widgets
function initDashboardWidgets() {
    // Add click handlers for quick action buttons
    const quickActionBtns = document.querySelectorAll('.quick-action-btn');
    quickActionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = btn.getAttribute('data-action');
            if (action) {
                window.location.href = `${action}.html`;
            }
        });
    });
}

// Initialize the application
async function init() {
    console.log('Initializing Home Page...');
    
    // Check if user is authenticated
    if (!api.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }
    
    updateCurrentYear();
    setupParallax();
    setupFloatingCards();
    setupStatCards();
    initAOS();
    setupLogout();
    displayUserInfo();
    initDashboardWidgets();
    
    await loadData();
    startAutoRefresh();
    
    console.log('Home Page initialization complete');
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}