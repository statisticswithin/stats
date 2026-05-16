// ========== VISITS PAGE - MAIN APPLICATION ==========
// Uses the shared api-client.js

// Global variables
let members = [];
let visits = [];
let currentSelectedMember = null;
let autoRefreshInterval = null;

// ========== LOAD DATA FUNCTIONS ==========
async function loadData() {
    console.log('Loading data from Google Sheets...');
    showMessage('Loading data from server...', 'warning');
    
    try {
        const membersResult = await api.getMembers();
        
        if (membersResult.success && membersResult.data) {
            members = membersResult.data;
            console.log('Members loaded:', members.length);
        } else {
            console.warn('Failed to load members:', membersResult.error);
            members = [];
        }
        
        await loadVisitsFromServer();
        
        if (members.length > 0) {
            showMessage(`Loaded ${members.length} members and ${visits.length} total visits`, 'success');
        }
        
        updateCheckedInList();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading data. Please refresh the page.', 'error');
    }
}

async function loadVisitsFromServer() {
    try {
        const visitsResult = await api.getVisits();
        
        if (visitsResult.success && visitsResult.data) {
            visits = visitsResult.data;
            const today = new Date().toISOString().split('T')[0];
            const todayCount = visits.filter(v => {
                const visitDate = v.visit_date || v.date;
                return visitDate === today;
            }).length;
            console.log(`Visits loaded: ${visits.length} total, ${todayCount} today`);
            return true;
        } else {
            console.warn('Failed to load visits:', visitsResult.error);
            visits = [];
            return false;
        }
    } catch (error) {
        console.error('Error loading visits:', error);
        visits = [];
        return false;
    }

    
}

async function refreshStatisticsFromServer() {
    console.log('Refreshing statistics from Google Sheets...');
    try {
        const visitsResult = await api.getVisits();
        
        if (visitsResult.success && visitsResult.data) {
            visits = visitsResult.data;
            updateCheckedInList();
            console.log('Statistics refreshed successfully');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error refreshing statistics:', error);
        return false;
    }
}

// ========== HELPER FUNCTIONS ==========
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function isMemberCheckedInToday(memberId) {
    const today = getTodayDate(); // "2026-04-29"
    
    return visits.some(visit => {
        const visitDate = visit.visit_date || visit.date;
        
        // Extract just the date part from the timestamp
        let dateToCompare = visitDate;
        if (typeof visitDate === 'string' && visitDate.includes('T')) {
            dateToCompare = visitDate.split('T')[0];
        }
        
        return String(visit.member_id) === String(memberId) && dateToCompare === today;
    });
}

function getTodayVisits() {
    const today = getTodayDate(); // "2026-04-29"
    console.log('Looking for visits on:', today);
    
    const todayVisitsRaw = visits.filter(v => {
        const visitDate = v.visit_date || v.date;
        
        // Extract just YYYY-MM-DD from the full timestamp
        let dateToCompare = visitDate;
        
        if (typeof visitDate === 'string') {
            // If it contains 'T', take only the part before T
            if (visitDate.includes('T')) {
                dateToCompare = visitDate.split('T')[0];
            }
            // If it's already YYYY-MM-DD, use as is
            else if (visitDate.match(/^\d{4}-\d{2}-\d{2}/)) {
                dateToCompare = visitDate;
            }
        }
        
        const isMatch = dateToCompare === today;
        if (isMatch) {
            console.log('Match found - Original:', visitDate, 'Compared:', dateToCompare);
        }
        
        return isMatch;
    });
    
    console.log('Found', todayVisitsRaw.length, 'visits for today');
    
    // Remove duplicates (keep the most recent visit per member)
    const latestVisits = new Map();
    
    todayVisitsRaw.forEach(visit => {
        const memberId = String(visit.member_id);
        const existing = latestVisits.get(memberId);
        if (!existing || (visit.created_at > existing.created_at)) {
            latestVisits.set(memberId, visit);
        }
    });
    
    return Array.from(latestVisits.values());
}

function formatPurpose(purpose) {
    const purposes = {
        'sunday_service': 'Sunday Service',
        'meeting': 'Meeting',
        'prayer_meeting': 'Prayer Meeting',
        'youth_service': 'Youth Service',
        'choir_practice': 'Choir Practice'
    };
    return purposes[purpose] || purpose || 'Unknown';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== SEARCH FUNCTIONS ==========
function searchMembers() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        showMessage('Please enter a search term', 'error');
        return;
    }

    const filtered = members.filter(m => {
        const firstname = m.firstname ? String(m.firstname).toLowerCase() : '';
        const middlename = m.middlename ? String(m.middlename).toLowerCase() : '';
        const surname = m.surname ? String(m.surname).toLowerCase() : '';
        const pin = m.pin ? String(m.pin).toLowerCase() : '';
        const contact = m.contact ? String(m.contact).toLowerCase() : '';
        
        return firstname.includes(searchTerm) ||
            middlename.includes(searchTerm) ||
            surname.includes(searchTerm) ||
            pin.includes(searchTerm) ||
            contact.includes(searchTerm);
    });

    displaySearchResults(filtered);
}

function displaySearchResults(results) {
    const resultsDiv = document.getElementById('searchResults');
    const membersListDiv = document.getElementById('membersList');
    
    if (!resultsDiv || !membersListDiv) return;

    if (results.length === 0) {
        membersListDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-slash" style="font-size: 3rem;"></i>
                <p>No members found matching your search.</p>
            </div>
        `;
    } else {
        membersListDiv.innerHTML = results.map(member => {
            const alreadyCheckedIn = isMemberCheckedInToday(member.member_id);
            const buttonDisabled = alreadyCheckedIn ? 'disabled' : '';
            const buttonText = alreadyCheckedIn ? '✓ Checked In' : '<i class="fas fa-calendar-check"></i> Check-In';
            const buttonClass = alreadyCheckedIn ? 'btn-checked-in' : 'btn-checkin';
            
            return `
                <div class="visit-card" data-member-id="${member.member_id}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(member.firstname)} ${escapeHtml(member.surname)}</strong>
                            ${alreadyCheckedIn ? '<span class="badge-success ms-2">Checked In Today</span>' : ''}
                            <br>
                            <small class="text-muted">
                                <i class="fas fa-id-card"></i> ${member.pin || 'N/A'} | 
                                <i class="fas fa-phone"></i> ${member.contact || 'N/A'}                            
                            </small>
                        </div>
                        <button class="${buttonClass} checkin-btn" data-member-id="${member.member_id}" ${buttonDisabled}>
                            ${buttonText}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        attachDynamicEventListeners();
    }

    resultsDiv.style.display = 'block';
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');
    const membersList = document.getElementById('membersList');
    
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.style.display = 'none';
    if (membersList) membersList.innerHTML = '';
}

function closeSearchResults() {
    const searchResults = document.getElementById('searchResults');
    if (searchResults) searchResults.style.display = 'none';
}

// ========== CHECK-IN FUNCTIONS ==========
function openCheckInModal(memberId) {
    const member = members.find(m => String(m.member_id) === String(memberId));
    if (member) {
        currentSelectedMember = member;
        document.getElementById('checkInMemberId').value = memberId;
        document.getElementById('modalMemberName').innerHTML = `<i class="fas fa-user"></i> Check-In: ${member.firstname} ${member.surname}`;
        document.getElementById('visitDate').value = getTodayDate();
        document.getElementById('checkInModal').style.display = 'flex';
    }
}

function closeCheckInModal() {
    document.getElementById('checkInModal').style.display = 'none';
    document.getElementById('visitPurpose').value = 'sunday_service';
    document.getElementById('paidKganya').checked = false;
}

async function saveCheckIn() {
    const memberId = document.getElementById('checkInMemberId').value;
    const purpose = document.getElementById('visitPurpose').value;
    const date = document.getElementById('visitDate').value;
    const paidKganya = document.getElementById('paidKganya').checked;

    if (!date) {
        showMessage('Please select a visit date', 'error');
        return;
    }

    if (isMemberCheckedInToday(memberId)) {
        showMessage(`${currentSelectedMember.firstname} ${currentSelectedMember.surname} has already been checked in today!`, 'error');
        closeCheckInModal();
        return;
    }

    const visitData = {
        member_id: memberId,
        visitor_name: `${currentSelectedMember.firstname} ${currentSelectedMember.surname}`,
        visit_date: date,
        visit_type: purpose,
        notes: `Paid Kganya: ${paidKganya ? 'Yes' : 'No'}`,
        status: 'completed'
    };

    showMessage('Saving check-in...', 'warning');
    
    try {
        const result = await api.createVisit(visitData);
        console.log('API Response:', result);
        
        if (result && result.success) {
            showMessage(`${currentSelectedMember.firstname} ${currentSelectedMember.surname} checked in successfully!`, 'success');
            closeCheckInModal();
            
            const newVisit = {
                visit_id: 'local_' + Date.now(),
                member_id: memberId,
                visitor_name: `${currentSelectedMember.firstname} ${currentSelectedMember.surname}`,
                visit_date: date,
                visit_type: purpose,
                notes: `Paid Kganya: ${paidKganya ? 'Yes' : 'No'}`,
                created_at: new Date().toISOString()
            };
            visits.push(newVisit);
            
            updateCheckedInList();
            
            const searchInput = document.getElementById('searchInput');
            if (searchInput && searchInput.value.trim()) {
                searchMembers();
            }
            
            setTimeout(() => refreshStatisticsFromServer(), 2000);
        } else {
            const errorMsg = result?.error || 'Could not save check-in. Please check your connection.';
            showMessage('Error: ' + errorMsg, 'error');
            console.error('Save check-in failed:', result);
        }
    } catch (error) {
        console.error('Exception in saveCheckIn:', error);
        showMessage('Error: Network issue. Please check your connection and try again.', 'error');
    }
}

// ========== UI UPDATE FUNCTIONS ==========
function updateCheckedInList() {
    const todayVisits = getTodayVisits();
    const checkedInDiv = document.getElementById('checkedInList');
    
    if (!checkedInDiv) return;
    
    if (todayVisits.length === 0) {
        checkedInDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users" style="font-size: 3rem;"></i>
                <p>No members checked in yet today</p>
            </div>
        `;
    } else {
        checkedInDiv.innerHTML = todayVisits.map(visit => {
            const member = members.find(m => String(m.member_id) === String(visit.member_id));
            const purpose = visit.visit_type || 'Unknown';
            const paid = visit.notes && visit.notes.includes('Paid Kganya: Yes');
            const timestamp = visit.created_at || visit.visit_date || new Date().toISOString();
            
            return `
                <div class="visit-card checkedin-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${member ? escapeHtml(member.firstname) + ' ' + escapeHtml(member.surname) : visit.visitor_name || 'Unknown'}</strong>
                            <br>
                            <small class="text-muted">
                                <i class="fas fa-tag"></i> ${formatPurpose(purpose)} | 
                                <i class="fas fa-money-bill"></i> ${paid ? 'Paid' : 'Not Paid'}
                            </small>
                        </div>
                        <span class="visit-time">
                            <i class="fas fa-clock"></i> ${new Date(timestamp).toLocaleTimeString()}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updateStatistics(todayVisits);
}

function updateStatistics(todayVisits) {
    const total = todayVisits.length;
    const paidCount = todayVisits.filter(v => v.notes && v.notes.includes('Paid Kganya: Yes')).length;
    const sundayServiceTotal = todayVisits.filter(v => v.visit_type === 'sunday_service').length;
    const meetingTotal = todayVisits.filter(v => v.visit_type === 'meeting').length;
    
    const totalElement = document.getElementById('totalCheckedIn');
    const paidElement = document.getElementById('paidKganyaCount');
    const sundayElement = document.getElementById('sundayServiceCount');
    const meetingElement = document.getElementById('meetingCount');
    
    if (totalElement) totalElement.textContent = total;
    if (paidElement) paidElement.textContent = paidCount;
    if (sundayElement) sundayElement.textContent = sundayServiceTotal;
    if (meetingElement) meetingElement.textContent = meetingTotal;
    
    console.log(`Statistics: Total=${total}, Paid=${paidCount}, Sunday=${sundayServiceTotal}, Meetings=${meetingTotal}`);
}

// ========== REFRESH FUNCTION ==========
async function refreshAllData() {
    const refreshBtn = document.getElementById('refreshDataBtn');
    
    if (refreshBtn) {
        refreshBtn.classList.add('refreshing');
        refreshBtn.disabled = true;
    }
    
    try {
        showMessage('Refreshing data from server...', 'warning');
        await loadData();
        showMessage('Data refreshed successfully!', 'success');
    } catch (error) {
        showMessage('Error refreshing data', 'error');
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('refreshing');
            refreshBtn.disabled = false;
        }
    }
}

// ========== MESSAGE FUNCTIONS ==========
function showMessage(msg, type) {
    const messageDiv = document.getElementById('messageArea');
    if (!messageDiv) {
        console.log(msg);
        return;
    }
    
    if (window.messageTimeout) {
        clearTimeout(window.messageTimeout);
    }
    
    messageDiv.style.display = 'flex';
    messageDiv.className = `alert-message ${type}`;
    messageDiv.innerHTML = `<span>${msg}</span><button class="close-msg" onclick="hideMessage()">&times;</button>`;
    
    window.messageTimeout = setTimeout(() => hideMessage(), 4000);
}

function hideMessage() {
    const messageDiv = document.getElementById('messageArea');
    if (messageDiv) {
        messageDiv.style.display = 'none';
    }
    if (window.messageTimeout) {
        clearTimeout(window.messageTimeout);
        window.messageTimeout = null;
    }
}

// ========== MODAL CLOSING FUNCTIONS ==========
function closeModalOnOutsideClick(event) {
    const modals = document.querySelectorAll('.custom-modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function closeAllModalsOnEscape(event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.custom-modal');
        modals.forEach(modal => {
            if (modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
        hideMessage();
    }
}

// ========== EVENT LISTENERS ==========
function attachDynamicEventListeners() {
    document.querySelectorAll('.checkin-btn').forEach(btn => {
        btn.removeEventListener('click', handleCheckInClick);
        btn.addEventListener('click', handleCheckInClick);
    });
}

function handleCheckInClick(e) {
    e.stopPropagation();
    const memberId = e.currentTarget.getAttribute('data-member-id');
    
    if (isMemberCheckedInToday(memberId)) {
        const member = members.find(m => String(m.member_id) === String(memberId));
        if (member) {
            showMessage(`${member.firstname} ${member.surname} has already been checked in today!`, 'error');
        }
        return;
    }
    
    openCheckInModal(memberId);
}

function setupEventListeners() {
    const searchBtn = document.getElementById('searchMembersBtn');
    if (searchBtn) searchBtn.addEventListener('click', searchMembers);
    
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) clearBtn.addEventListener('click', clearSearch);
    
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshAllData);
    
    const closeResultsBtn = document.getElementById('closeResultsBtn');
    if (closeResultsBtn) closeResultsBtn.addEventListener('click', closeSearchResults);
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchMembers();
        });
    }
    
    const closeCheckInModalBtn = document.getElementById('closeCheckInModalBtn');
    if (closeCheckInModalBtn) closeCheckInModalBtn.addEventListener('click', closeCheckInModal);
    
    const cancelCheckInBtn = document.getElementById('cancelCheckInBtn');
    if (cancelCheckInBtn) cancelCheckInBtn.addEventListener('click', closeCheckInModal);
    
    const confirmCheckInBtn = document.getElementById('confirmCheckInBtn');
    if (confirmCheckInBtn) confirmCheckInBtn.addEventListener('click', saveCheckIn);
    
    window.addEventListener('click', closeModalOnOutsideClick);
    document.addEventListener('keydown', closeAllModalsOnEscape);
}

// ========== AUTO REFRESH ==========
function startAutoRefresh() {
    if (autoRefreshInterval) clearInterval(autoRefreshInterval);
    autoRefreshInterval = setInterval(() => {
        refreshStatisticsFromServer();
    }, 3000000);
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// ========== INITIALIZATION ==========
function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) yearElement.textContent = new Date().getFullYear();
}

async function init() {
    console.log('Initializing Visits Page...');
    await loadData();
    updateCurrentYear();
    setupEventListeners();
    startAutoRefresh();
    console.log('Initialization complete - auto-refresh every 30 seconds');
}

function handleVisibilityChange() {
    if (document.hidden) {
        stopAutoRefresh();
    } else {
        startAutoRefresh();
        refreshStatisticsFromServer();
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
    if (window.messageTimeout) {
        clearTimeout(window.messageTimeout);
    }
});