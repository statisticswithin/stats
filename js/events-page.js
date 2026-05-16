// ========== EVENTS PAGE - MAIN APPLICATION ==========
// Data Storage
let events = [];
let members = [];
let eventAttendances = [];
let currentEventForCheckin = null;
let eventToDelete = null;

// ========== HELPER FUNCTIONS ==========
function generateId() {
    return Date.now().toString();
}

function showMessage(msg, type) {
    const container = document.getElementById("errorMessageContainer");
    const span = document.getElementById("errorText");
    
    if (!container || !span) return;
    
    span.innerText = msg;
    container.style.display = "block";
    
    if(type === "success") {
        container.style.background = "#d1e7dd";
        container.style.color = "#0f5132";
        container.style.borderLeftColor = "#198754";
    } else {
        container.style.background = "#f8d7da";
        container.style.color = "#a71d2a";
        container.style.borderLeftColor = "#dc3545";
    }
    
    setTimeout(() => { 
        container.style.display = "none"; 
    }, 3000);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getEventTypeLabel(type) {
    const types = {
        'sunday_service': 'Sunday Service',
        'lekgotla_la_baruti': 'Lekgotla la Baruti',
        'mpogo': 'Mpogo',
        'meeting': 'Meeting',
        'prayer_meeting': 'Prayer Meeting',
        'youth_service': 'Youth Service',
        'choir_practice': 'Choir Practice',
        'conference': 'Conference',
        'workshop': 'Workshop',
        'other': 'Other'
    };
    return types[type] || type;
}

// ========== DATA LOADING FUNCTIONS using api-client.js ==========
async function loadData() {
    console.log('Loading data from API via ChurchAPI class...');
    showMessage('Loading events data...', 'success');
    
    // Load members from API using the global api object
    try {
        const membersResult = await api.getMembers();
        if (membersResult.success && membersResult.data) {
            members = membersResult.data;
            localStorage.setItem('zcc_members', JSON.stringify(members));
            console.log('Members loaded from API:', members.length);
        } else {
            loadMembersFromLocal();
        }
    } catch (error) {
        console.error('API error, loading members from localStorage:', error);
        loadMembersFromLocal();
    }
    
    // Load events from API using the global api object
    try {
        const eventsResult = await api.getEvents();
        console.log('Events API response:', eventsResult);
        if (eventsResult.success && eventsResult.data) {
            // Ensure event_id is stored as string
            events = eventsResult.data.map(event => ({
                ...event,
                event_id: String(event.event_id)
            }));
            localStorage.setItem('zcc_events', JSON.stringify(events));
            console.log('Events loaded from API:', events.length);
        } else {
            loadEventsFromLocal();
        }
    } catch (error) {
        console.error('API error, loading events from localStorage:', error);
        loadEventsFromLocal();
    }
    
    // Load attendances from API
    if (events.length > 0) {
        try {
            const allAttendances = [];
            for (const event of events) {
                const attendanceResult = await api.getEventAttendances(event.event_id);
                if (attendanceResult.success && attendanceResult.data) {
                    allAttendances.push(...attendanceResult.data);
                }
            }
            if (allAttendances.length > 0) {
                eventAttendances = allAttendances;
                localStorage.setItem('zcc_event_attendances', JSON.stringify(eventAttendances));
                console.log('Attendances loaded from API:', eventAttendances.length);
            } else {
                loadAttendancesFromLocal();
            }
        } catch (error) {
            console.error('API error, loading attendances from localStorage:', error);
            loadAttendancesFromLocal();
        }
    } else {
        loadAttendancesFromLocal();
    }
    
    console.log('Data loading complete');
}

function loadMembersFromLocal() {
    const storedMembers = localStorage.getItem("zcc_members");
    if (storedMembers) {
        members = JSON.parse(storedMembers);
    } else {
        members = [];
        localStorage.setItem("zcc_members", JSON.stringify(members));
    }
}

function loadEventsFromLocal() {
    const storedEvents = localStorage.getItem("zcc_events");
    if (storedEvents) {
        events = JSON.parse(storedEvents);
    } else {
        events = [];
        localStorage.setItem("zcc_events", JSON.stringify(events));
    }
}

function loadAttendancesFromLocal() {
    const storedAttendances = localStorage.getItem("zcc_event_attendances");
    if (storedAttendances) {
        eventAttendances = JSON.parse(storedAttendances);
    } else {
        eventAttendances = [];
        localStorage.setItem("zcc_event_attendances", JSON.stringify(eventAttendances));
    }
}

function saveEventsToLocal() {
    localStorage.setItem("zcc_events", JSON.stringify(events));
}

function saveAttendancesToLocal() {
    localStorage.setItem("zcc_event_attendances", JSON.stringify(eventAttendances));
}

// ========== RENDER FUNCTIONS ==========
function renderEvents() {
    const eventsContainer = document.getElementById('eventsList');
    const eventCountBadge = document.getElementById('eventCountBadge');
    
    if (!eventsContainer) return;
    
    if (events.length === 0) {
        eventsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No events created yet. Click "Create New Event" to get started.</p>
            </div>
        `;
        if (eventCountBadge) eventCountBadge.innerText = "0 events";
        return;
    }
    
    const sortedEvents = [...events].sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
    
    let html = '';
    sortedEvents.forEach(event => {
        const attendanceCount = eventAttendances.filter(a => a.event_id === event.event_id).length;
        
        // IMPORTANT: Convert event_id to string explicitly
        const eventIdStr = String(event.event_id);
        
        html += `
            <div class="event-card" data-event-id="${eventIdStr}">
                <div class="event-card-header">
                    <span class="event-type-badge"><i class="fas fa-tag"></i> ${getEventTypeLabel(event.event_type)}</span>
                    <span style="font-size: 0.75rem;"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(event.event_venue)}</span>
                </div>
                <div class="event-card-body">
                    <div class="event-title">${escapeHtml(event.event_name)}</div>
                    <div class="event-detail"><i class="fas fa-calendar"></i> ${formatDate(event.event_date)}</div>
                    <div class="event-detail"><i class="fas fa-clock"></i> ${event.event_time || 'Time TBA'}</div>
                    ${event.event_description ? `<div class="event-description">${escapeHtml(event.event_description.substring(0, 100))}${event.event_description.length > 100 ? '...' : ''}</div>` : ''}
                </div>
                <div class="event-card-footer">
                    <div class="attendance-count"><i class="fas fa-users"></i> ${attendanceCount} checked in</div>
                    <div class="event-actions">
                        <button class="btn-view-event" onclick="window.openEventDetails('${eventIdStr}')" title="View & Check-in"><i class="fas fa-eye"></i></button>
                        <button class="btn-delete-event" onclick="window.openDeleteEventModal('${eventIdStr}')" title="Delete Event"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>
        `;
    });
    
    eventsContainer.innerHTML = html;
    if (eventCountBadge) eventCountBadge.innerText = `${events.length} event${events.length !== 1 ? 's' : ''}`;
}

function refreshEvents() {
    console.log("Refreshing events...");
    renderEvents();
    showMessage('Events list refreshed', 'success');
}

// ========== MODAL FUNCTIONS ==========
function openCreateEventModal() {
    console.log("Opening create event modal...");
    const modal = document.getElementById('eventModal');
    if (modal) {
        document.getElementById('eventModalTitle').innerHTML = '<i class="fas fa-calendar-plus"></i> Create New Event';
        document.getElementById('editEventId').value = '';
        document.getElementById('eventForm').reset();
        document.getElementById('eventDate').value = new Date().toISOString().split('T')[0];
        modal.style.display = 'flex';
    } else {
        console.error('Event modal element not found!');
    }
}

function closeEventModal() {
    const modal = document.getElementById('eventModal');
    if (modal) modal.style.display = 'none';
}

// Save event to API and localStorage
async function saveEvent(event) {
    event.preventDefault();
    
    const eventId = document.getElementById('editEventId').value;
    const eventName = document.getElementById('eventName').value;
    const eventType = document.getElementById('eventType').value;
    const eventVenue = document.getElementById('eventVenue').value;
    const eventDate = document.getElementById('eventDate').value;
    const eventTime = document.getElementById('eventTime').value;
    const eventDescription = document.getElementById('eventDescription').value;
    
    if (!eventName || !eventType || !eventVenue || !eventDate) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const newEvent = {
        event_id: eventId || generateId(),
        event_name: eventName,
        event_type: eventType,
        event_venue: eventVenue,
        event_date: eventDate,
        event_time: eventTime,
        event_description: eventDescription,
        created_at: new Date().toISOString()
    };
    
    if (eventId) {
        // Update existing event
        try {
            const result = await api.updateEvent(eventId, newEvent);
            if (result && result.success) {
                const index = events.findIndex(e => e.event_id === eventId);
                if (index !== -1) {
                    events[index] = newEvent;
                    saveEventsToLocal();
                    showMessage('Event updated successfully and synced to Google Sheets!', 'success');
                }
            } else {
                const index = events.findIndex(e => e.event_id === eventId);
                if (index !== -1) {
                    events[index] = newEvent;
                    saveEventsToLocal();
                    showMessage('Event updated successfully (saved locally only)', 'success');
                }
            }
        } catch (error) {
            console.error('Update error:', error);
            const index = events.findIndex(e => e.event_id === eventId);
            if (index !== -1) {
                events[index] = newEvent;
                saveEventsToLocal();
                showMessage('Event updated successfully (saved locally only)', 'success');
            }
        }
    } else {
        // Create new event
        try {
            const result = await api.createEvent(newEvent);
            console.log('Create event result:', result);
            if (result && result.success) {
                events.push(newEvent);
                saveEventsToLocal();
                showMessage('Event created successfully and synced to Google Sheets!', 'success');
            } else {
                events.push(newEvent);
                saveEventsToLocal();
                showMessage('Event created successfully (saved locally only)', 'success');
            }
        } catch (error) {
            console.error('Create error:', error);
            events.push(newEvent);
            saveEventsToLocal();
            showMessage('Event created successfully (saved locally only)', 'success');
        }
    }
    
    renderEvents();
    closeEventModal();
}

// ========== EVENT DETAILS & CHECK-IN FUNCTIONS ==========
async function openEventDetails(eventId) {
    console.log('Opening event details for:', eventId);
    console.log('Event ID type:', typeof eventId);
    console.log('Available events:', events.map(e => ({ id: e.event_id, type: typeof e.event_id })));
    
    // Convert both to strings for comparison
    const event = events.find(e => String(e.event_id) === String(eventId));
    
    if (!event) {
        console.error('Event not found. Searched for:', eventId);
        console.error('Available event IDs:', events.map(e => e.event_id));
        showMessage('Event not found', 'error');
        return;
    }
    
    currentEventForCheckin = event;
    console.log('Current event found:', event);
    
    // Rest of your function remains the same...
    // Refresh attendances from API
    try {
        const attendanceResult = await api.getEventAttendances(eventId);
        if (attendanceResult.success && attendanceResult.data) {
            const otherAttendances = eventAttendances.filter(a => a.event_id !== eventId);
            eventAttendances = [...otherAttendances, ...attendanceResult.data];
            saveAttendancesToLocal();
        }
    } catch (error) {
        console.error('Failed to refresh attendances:', error);
    }
    
    const eventInfoHtml = `
        <div class="event-info-row"><i class="fas fa-calendar-alt"></i> <strong>Event:</strong> ${escapeHtml(event.event_name)}</div>
        <div class="event-info-row"><i class="fas fa-tag"></i> <strong>Type:</strong> ${getEventTypeLabel(event.event_type)}</div>
        <div class="event-info-row"><i class="fas fa-map-marker-alt"></i> <strong>Venue:</strong> ${escapeHtml(event.event_venue)}</div>
        <div class="event-info-row"><i class="fas fa-calendar"></i> <strong>Date:</strong> ${formatDate(event.event_date)}</div>
        <div class="event-info-row"><i class="fas fa-clock"></i> <strong>Time:</strong> ${event.event_time || 'Time TBA'}</div>
        ${event.event_description ? `<div class="event-info-row"><i class="fas fa-info-circle"></i> <strong>Description:</strong> ${escapeHtml(event.event_description)}</div>` : ''}
    `;
    
    const eventInfoDiv = document.getElementById('eventInfo');
    const detailsTitle = document.getElementById('detailsEventTitle');
    const modal = document.getElementById('eventDetailsModal');
    
    if (eventInfoDiv) eventInfoDiv.innerHTML = eventInfoHtml;
    if (detailsTitle) detailsTitle.innerHTML = `<i class="fas fa-calendar-alt"></i> ${escapeHtml(event.event_name)}`;
    
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) searchInput.value = '';
    
    const resultsContainer = document.getElementById('memberSearchResults');
    if (resultsContainer) resultsContainer.style.display = 'none';
    
    renderCheckedInMembers(event.event_id);
    
    if (modal) {
        modal.style.display = 'flex';
        console.log('Modal opened successfully');
    } else {
        console.error('Event details modal element not found!');
    }
}

function closeEventDetailsModal() {
    const modal = document.getElementById('eventDetailsModal');
    if (modal) modal.style.display = 'none';
    currentEventForCheckin = null;
}

function renderCheckedInMembers(eventId) {
    const container = document.getElementById('checkedInMembersList');
    const attendances = eventAttendances.filter(a => a.event_id === eventId);
    const countSpan = document.getElementById('checkedInCount');
    
    if (countSpan) countSpan.innerText = attendances.length;
    
    if (!container) return;
    
    if (attendances.length === 0) {
        container.innerHTML = '<div class="empty-small">No members checked in yet</div>';
        return;
    }
    
    let html = '';
    attendances.forEach(att => {
        const member = members.find(m => m.member_id === att.member_id);
        if (member) {
            const checkinTime = new Date(att.checkin_time).toLocaleTimeString();
            const firstName = (member.firstname || '').toString();
            const surname = (member.surname || '').toString();
            
            html += `
                <div class="checkedin-member-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #e0e0e0;">
                    <div class="checkedin-member-info">
                        <span class="checkedin-member-name" style="font-weight: 500;">${escapeHtml(firstName)} ${escapeHtml(surname)}</span>
                        <span class="checkedin-member-time" style="font-size: 11px; color: #888; display: block;"><i class="fas fa-clock"></i> Checked in at ${checkinTime}</span>
                    </div>
                    <button class="btn-remove-checkin" onclick="window.removeCheckin('${att.attendance_id}', '${eventId}')" title="Remove check-in" style="background: none; border: none; color: #dc3545; cursor: pointer; font-size: 18px;">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            `;
        }
    });
    
    container.innerHTML = html;
}

function searchMembersForCheckin() {
    const searchTerm = document.getElementById('memberSearchInput').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('memberSearchResults');
    
    console.log('Searching for:', searchTerm);
    console.log('Current event:', currentEventForCheckin);
    console.log('Members available:', members.length);
    
    if (!searchTerm) {
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
            resultsContainer.innerHTML = '';
        }
        return;
    }
    
    if (!currentEventForCheckin) {
        console.error('No event selected for check-in');
        showMessage('Please select an event first', 'error');
        return;
    }
    
    const checkedInIds = eventAttendances
        .filter(a => a.event_id === currentEventForCheckin.event_id)
        .map(a => a.member_id);
    
    console.log('Already checked in IDs:', checkedInIds);
    
    // FIXED: Safely convert all values to strings before calling toLowerCase()
    const filtered = members.filter(m => {
        // Skip if already checked in
        if (checkedInIds.includes(m.member_id)) return false;
        
        // Safely convert each field to string
        const firstName = (m.firstname || '').toString().toLowerCase();
        const surname = (m.surname || '').toString().toLowerCase();
        const pin = (m.pin !== undefined && m.pin !== null) ? m.pin.toString().toLowerCase() : '';
        const contact = (m.contact !== undefined && m.contact !== null) ? m.contact.toString().toLowerCase() : '';
        
        return firstName.includes(searchTerm) ||
               surname.includes(searchTerm) ||
               pin.includes(searchTerm) ||
               contact.includes(searchTerm);
    });
    
    console.log('Filtered members:', filtered.length);
    
    if (!resultsContainer) {
        console.error('Results container not found!');
        return;
    }
    
    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="member-result-item" style="padding: 12px; text-align: center; color: #666;">No members found</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    
    let html = '';
    filtered.forEach(member => {
        // Safely display member info
        const firstName = (member.firstname || '').toString();
        const surname = (member.surname || '').toString();
        const pin = (member.pin !== undefined && member.pin !== null) ? member.pin.toString() : 'N/A';
        const contact = (member.contact !== undefined && member.contact !== null) ? member.contact.toString() : 'N/A';
        const branch = (member.branch || 'N/A').toString();
        
        html += `
            <div class="member-result-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #e0e0e0; background: white; border-radius: 8px; margin-bottom: 8px;">
                <div class="member-result-info">
                    <span class="member-result-name" style="font-weight: 600; display: block;">${escapeHtml(firstName)} ${escapeHtml(surname)}</span>
                    <span class="member-result-details" style="font-size: 12px; color: #666;">PIN: ${escapeHtml(pin)} | Contact: ${escapeHtml(contact)} | Branch: ${escapeHtml(branch)}</span>
                </div>
                <button class="btn-checkin-member" onclick="window.checkinMember('${member.member_id}')" style="background: linear-gradient(135deg, #28a745, #218838); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-check-circle"></i> Check In
                </button>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    resultsContainer.style.display = 'block';
    resultsContainer.style.maxHeight = '300px';
    resultsContainer.style.overflowY = 'auto';
    resultsContainer.style.backgroundColor = '#f8f9fa';
    resultsContainer.style.padding = '10px';
    resultsContainer.style.borderRadius = '8px';
    resultsContainer.style.marginTop = '10px';
    resultsContainer.style.border = '1px solid #dee2e6';
}

async function checkinMember(memberId) {
    if (!currentEventForCheckin) {
        showMessage('No event selected', 'error');
        return;
    }
    
    const member = members.find(m => m.member_id === memberId);
    if (!member) {
        showMessage('Member not found', 'error');
        return;
    }
    
    const firstName = (member.firstname || '').toString();
    const surname = (member.surname || '').toString();
    const memberName = `${firstName} ${surname}`;
    
    const alreadyCheckedIn = eventAttendances.some(a => a.event_id === currentEventForCheckin.event_id && a.member_id === memberId);
    if (alreadyCheckedIn) {
        showMessage(`${memberName} is already checked in!`, 'error');
        return;
    }
    
    const attendance = {
        attendance_id: generateId(),
        event_id: currentEventForCheckin.event_id,
        member_id: memberId,
        checkin_time: new Date().toISOString(),
        member_name: memberName
    };
    
    try {
        const result = await api.createAttendance(attendance);
        if (result && result.success) {
            eventAttendances.push(attendance);
            saveAttendancesToLocal();
            showMessage(`${memberName} checked in successfully and synced to Google Sheets!`, 'success');
        } else {
            eventAttendances.push(attendance);
            saveAttendancesToLocal();
            showMessage(`${memberName} checked in successfully (saved locally only)`, 'success');
        }
    } catch (error) {
        console.error('Check-in error:', error);
        eventAttendances.push(attendance);
        saveAttendancesToLocal();
        showMessage(`${memberName} checked in successfully (saved locally only)`, 'success');
    }
    
    // Clear search
    const searchInput = document.getElementById('memberSearchInput');
    if (searchInput) searchInput.value = '';
    
    const resultsContainer = document.getElementById('memberSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }
    
    renderCheckedInMembers(currentEventForCheckin.event_id);
}

// Remove check-in from API and localStorage
async function removeCheckin(attendanceId, eventId) {
    try {
        const result = await api.deleteAttendance(attendanceId);
        const index = eventAttendances.findIndex(a => a.attendance_id === attendanceId);
        if (index !== -1) {
            eventAttendances.splice(index, 1);
            saveAttendancesToLocal();
            
            if (result && result.success) {
                showMessage('Check-in removed and synced to Google Sheets', 'success');
            } else {
                showMessage('Check-in removed (saved locally only)', 'success');
            }
            
            renderCheckedInMembers(eventId);
        }
    } catch (error) {
        console.error('Remove check-in error:', error);
        const index = eventAttendances.findIndex(a => a.attendance_id === attendanceId);
        if (index !== -1) {
            eventAttendances.splice(index, 1);
            saveAttendancesToLocal();
            showMessage('Check-in removed (saved locally only)', 'success');
            renderCheckedInMembers(eventId);
        }
    }
}

function exportAttendance() {
    if (!currentEventForCheckin) return;
    
    const attendances = eventAttendances.filter(a => a.event_id === currentEventForCheckin.event_id);
    
    const csvRows = [];
    csvRows.push(['Member Name', 'PIN', 'Contact', 'Branch', 'Check-in Time'].join(','));
    
    attendances.forEach(att => {
        const member = members.find(m => m.member_id === att.member_id);
        if (member) {
            const row = [
                `"${member.firstname} ${member.surname}"`,
                `"${member.pin || ''}"`,
                `"${member.contact || ''}"`,
                `"${member.branch || ''}"`,
                `${new Date(att.checkin_time).toLocaleString()}`
            ];
            csvRows.push(row.join(','));
        }
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentEventForCheckin.event_name.replace(/[^a-z0-9]/gi, '_')}_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Attendance exported successfully!', 'success');
}

// ========== DELETE EVENT FUNCTIONS ==========
function openDeleteEventModal(eventId) {
    const event = events.find(e => e.event_id === eventId);
    if (event) {
        eventToDelete = event;
        document.getElementById('deleteEventName').innerText = `${event.event_name} (${formatDate(event.event_date)})`;
        document.getElementById('deleteEventConfirmation').value = '';
        document.getElementById('deleteEventModal').style.display = 'flex';
    }
}

function closeDeleteEventModal() {
    document.getElementById('deleteEventModal').style.display = 'none';
    eventToDelete = null;
}

async function confirmDeleteEvent() {
    const confirmation = document.getElementById('deleteEventConfirmation').value;
    if (confirmation !== 'DELETE') {
        showMessage('Please type "DELETE" to confirm deletion', 'error');
        return;
    }
    
    if (eventToDelete) {
        try {
            const result = await api.deleteEvent(eventToDelete.event_id);
            
            const eventIndex = events.findIndex(e => e.event_id === eventToDelete.event_id);
            if (eventIndex !== -1) events.splice(eventIndex, 1);
            
            eventAttendances = eventAttendances.filter(a => a.event_id !== eventToDelete.event_id);
            
            saveEventsToLocal();
            saveAttendancesToLocal();
            renderEvents();
            
            if (result && result.success) {
                showMessage(`Event "${eventToDelete.event_name}" deleted successfully from Google Sheets!`, 'success');
            } else {
                showMessage(`Event "${eventToDelete.event_name}" deleted successfully (saved locally only)`, 'success');
            }
            
            closeDeleteEventModal();
        } catch (error) {
            console.error('Delete event error:', error);
            const eventIndex = events.findIndex(e => e.event_id === eventToDelete.event_id);
            if (eventIndex !== -1) events.splice(eventIndex, 1);
            
            eventAttendances = eventAttendances.filter(a => a.event_id !== eventToDelete.event_id);
            
            saveEventsToLocal();
            saveAttendancesToLocal();
            renderEvents();
            
            showMessage(`Event "${eventToDelete.event_name}" deleted successfully (saved locally only)`, 'success');
            closeDeleteEventModal();
        }
    }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const createEventBtn = document.getElementById('createEventBtn');
    const refreshEventsBtn = document.getElementById('refreshEventsBtn');
    const closeEventModalBtn = document.getElementById('closeEventModalBtn');
    const cancelEventBtn = document.getElementById('cancelEventBtn');
    const eventForm = document.getElementById('eventForm');
    const closeDetailsModalBtn = document.getElementById('closeDetailsModalBtn');
    const closeDetailsFooterBtn = document.getElementById('closeDetailsFooterBtn');
 // In setupEventListeners, verify the search button
const searchMemberBtn = document.getElementById('searchMemberBtn');
if (searchMemberBtn) {
    console.log('Search button found, attaching listener');
    searchMemberBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Search button clicked!');
        searchMembersForCheckin();
    });
} else {
    console.error('Search button NOT found!');
}
    const memberSearchInput = document.getElementById('memberSearchInput');
    const exportAttendanceBtn = document.getElementById('exportEventAttendanceBtn');
    const closeDeleteEventModalBtn = document.getElementById('closeDeleteEventModalBtn');
    const cancelDeleteEventBtn = document.getElementById('cancelDeleteEventBtn');
    const confirmDeleteEventBtn = document.getElementById('confirmDeleteEventBtn');
    
    // Create Event button
    if (createEventBtn) {
        createEventBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Create Event button clicked!');
            openCreateEventModal();
        });
        console.log('Create Event button listener attached');
    } else {
        console.error('Create Event button not found in DOM!');
    }
    
    // Refresh button
    if (refreshEventsBtn) {
        refreshEventsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Refresh button clicked!');
            refreshEvents();
        });
        console.log('Refresh button listener attached');
    }
    
    if (closeEventModalBtn) closeEventModalBtn.addEventListener('click', closeEventModal);
    if (cancelEventBtn) cancelEventBtn.addEventListener('click', closeEventModal);
    if (eventForm) eventForm.addEventListener('submit', saveEvent);
    if (closeDetailsModalBtn) closeDetailsModalBtn.addEventListener('click', closeEventDetailsModal);
    if (closeDetailsFooterBtn) closeDetailsFooterBtn.addEventListener('click', closeEventDetailsModal);
    if (searchMemberBtn) searchMemberBtn.addEventListener('click', searchMembersForCheckin);
    if (exportAttendanceBtn) exportAttendanceBtn.addEventListener('click', exportAttendance);
    if (closeDeleteEventModalBtn) closeDeleteEventModalBtn.addEventListener('click', closeDeleteEventModal);
    if (cancelDeleteEventBtn) cancelDeleteEventBtn.addEventListener('click', closeDeleteEventModal);
    if (confirmDeleteEventBtn) confirmDeleteEventBtn.addEventListener('click', confirmDeleteEvent);
    
    if (memberSearchInput) {
        memberSearchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchMembersForCheckin();
            }
        });
    }
    
    window.onclick = function(event) {
        if (event.target.classList && event.target.classList.contains('custom-modal')) {
            closeEventModal();
            closeEventDetailsModal();
            closeDeleteEventModal();
        }
    };
}

// ========== INITIALIZATION ==========
async function init() {
    console.log('Initializing Events Page...');
    await loadData();
    renderEvents();
    updateCurrentYear();
    setupEventListeners();
    console.log('Initialization complete');
    console.log('Events count:', events.length);
}

// Make functions global - THIS IS CRITICAL
window.openEventDetails = openEventDetails;
window.openDeleteEventModal = openDeleteEventModal;
window.checkinMember = checkinMember;
window.removeCheckin = removeCheckin;
window.openCreateEventModal = openCreateEventModal;
window.refreshEvents = refreshEvents;

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}