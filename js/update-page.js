// ========== UPDATE PAGE - MAIN APPLICATION ==========
// Pulls data from Google Sheets API and saves outcomes to outcomes sheet

let members = [];
let currentSelectedMember = null;
let currentHistoryMember = null;

// Load data from Google Sheets API
async function loadData() {
    showMessage('Loading members from server...', 'success');
    
    try {
        // Load members from API
        const membersResult = await api.getMembers();
        
        if (membersResult.success && membersResult.data) {
            members = membersResult.data;
            console.log('Members loaded:', members.length);
        } else {
            console.warn('Failed to load members:', membersResult.error);
            members = [];
        }
        
        renderMembersTable(members);
        showMessage(`Loaded ${members.length} members`, 'success');
        
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading data. Please refresh the page.', 'error');
    }
}

// Render members table
function renderMembersTable(dataArray) {
    const tbody = document.getElementById("membersTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (dataArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No members found.��</tr>';
        const memberCountBadge = document.getElementById("memberCountBadge");
        if (memberCountBadge) memberCountBadge.innerText = "0 members";
        return;
    }
    
    dataArray.forEach(m => {
        const row = tbody.insertRow();
        // Safely convert all values to strings
        row.insertCell(0).innerText = (m.firstname || "").toString();
        row.insertCell(1).innerText = (m.surname || "").toString();
        row.insertCell(2).innerText = (m.pin !== undefined && m.pin !== null) ? m.pin.toString() : "";
        row.insertCell(3).innerText = (m.contact || "").toString();
        row.insertCell(4).innerText = (m.branch || "N/A").toString();
        
        // Status badge
        let statusClass = "status-active";
        let statusText = "Active";
        const memberStatus = (m.status || 'active').toString();
        if (memberStatus === "backslided") { statusClass = "status-backslided"; statusText = "Backslided"; }
        else if (memberStatus === "deceased") { statusClass = "status-deceased"; statusText = "Deceased"; }
        else if (memberStatus === "transfer_out") { statusClass = "status-transfer"; statusText = "Transferred Out"; }
        else if (memberStatus === "transfer_in") { statusClass = "status-transfer"; statusText = "Transferred In"; }
        else if (memberStatus === "converts") { statusClass = "status-active"; statusText = "Convert"; }
        
        row.insertCell(5).innerHTML = `<span class="status-badge ${statusClass}">${statusText}</span>`;
        
        const kganyaValue = (m.kganya_member || 'No').toString();
        row.insertCell(6).innerHTML = `<span class="badge-kganya"><i class="fas ${kganyaValue === 'Yes' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${kganyaValue === 'Yes' ? 'Yes' : 'No'}</span>`;
        
        const actionCell = row.insertCell(7);
        actionCell.className = "action-buttons";
        actionCell.innerHTML = `
            <button class="btn btn-sm btn-info update-status-btn" data-id="${m.member_id}">
                <i class="fas fa-chart-line"></i> Update
            </button>
            <button class="btn btn-sm btn-secondary history-btn" data-id="${m.member_id}">
                <i class="fas fa-history"></i> History
            </button>
        `;
    });
    
    const memberCountBadge = document.getElementById("memberCountBadge");
    if (memberCountBadge) {
        memberCountBadge.innerText = `${dataArray.length} member${dataArray.length !== 1 ? 's' : ''}`;
    }
    attachTableEvents();
}

function attachTableEvents() {
    document.querySelectorAll(".update-status-btn").forEach(btn => {
        btn.removeEventListener("click", handleUpdateClick);
        btn.addEventListener("click", handleUpdateClick);
    });
    
    document.querySelectorAll(".history-btn").forEach(btn => {
        btn.removeEventListener("click", handleHistoryClick);
        btn.addEventListener("click", handleHistoryClick);
    });
}

function handleUpdateClick(e) {
    const id = e.currentTarget.getAttribute("data-id");
    openStatusModal(id);
}

function handleHistoryClick(e) {
    const id = e.currentTarget.getAttribute("data-id");
    openHistoryModal(id);
}

// Search handling
function applySearchAndRender() {
    const searchInput = document.getElementById("globalSearchInput");
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === "") {
        // Show all members
        renderMembersTable(members);
        showMessage(`Showing all ${members.length} members`, "success");
    } else {
        // Filter members based on search term
        const filtered = members.filter(m => {
            const firstName = (m.firstname || '').toString().toLowerCase();
            const surname = (m.surname || '').toString().toLowerCase();
            const pin = (m.pin !== undefined && m.pin !== null) ? m.pin.toString().toLowerCase() : '';
            const contact = (m.contact || '').toString().toLowerCase();
            
            return firstName.includes(searchTerm) ||
                   surname.includes(searchTerm) ||
                   pin.includes(searchTerm) ||
                   contact.includes(searchTerm);
        });
        
        renderMembersTable(filtered);
        
        if (filtered.length === 0) {
            showMessage(`No members found matching "${searchTerm}"`, "error");
        } else {
            showMessage(`Found ${filtered.length} member(s) matching "${searchTerm}"`, "success");
        }
    }
}

// Reset search function
function resetSearch() {
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
        searchInput.value = "";
    }
    renderMembersTable(members);
    showMessage('Search cleared. Showing all members.', 'success');
}

// Show message on top of modals with higher z-index
function showMessage(msg, type) {
    const container = document.getElementById("errorMessageContainer");
    const span = document.getElementById("errorText");
    
    if (!container || !span) return;
    
    span.innerText = msg;
    container.style.display = "block";
    container.style.zIndex = "10000"; // Higher z-index to appear above modals
    container.style.position = "fixed"; // Fixed position to stay on top
    container.style.top = "20px";
    container.style.left = "50%";
    container.style.transform = "translateX(-50%)";
    container.style.minWidth = "300px";
    container.style.textAlign = "center";
    
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
    }, 4000);
}

// Open Status Modal
function openStatusModal(memberId) {
    const member = members.find(m => m.member_id == memberId);
    if (member) {
        currentSelectedMember = member;
        document.getElementById("statusMemberId").value = memberId;
        
        // Display member info
        const memberInfoDiv = document.getElementById("selectedMemberInfo");
        if (memberInfoDiv) {
            memberInfoDiv.innerHTML = `
                <div class="member-detail-row"><strong>Name:</strong> ${escapeHtml(member.firstname)} ${escapeHtml(member.surname)}</div>
                <div class="member-detail-row"><strong>PIN:</strong> ${escapeHtml(member.pin)}</div>
                <div class="member-detail-row"><strong>Branch:</strong> ${member.branch || 'N/A'}</div>
                <div class="member-detail-row"><strong>Current Status:</strong> ${member.status || 'Active'}</div>
            `;
        }
        
        resetStatusForm();
        const modal = document.getElementById("statusModal");
        if (modal) modal.style.display = "flex";
    }
}

function closeStatusModal() { 
    const modal = document.getElementById("statusModal");
    if (modal) modal.style.display = "none"; 
}

function resetStatusForm() {
    document.getElementById("memberOutcome").value = "";
    document.getElementById("convertFrom").value = "";
    document.getElementById("receivingBranch").value = "";
    document.getElementById("sendingBranch").value = "";
    document.getElementById("dateOfStatus").value = "";
    document.getElementById("statusNotes").value = "";
    
    const transferredToGroup = document.getElementById("transferredToGroup");
    const transferredFromGroup = document.getElementById("transferredFromGroup");
    const convertFromGroup = document.getElementById("convertFromGroup");
    const dateLabel = document.getElementById("dateOfStatusLabel");
    
    if (transferredToGroup) transferredToGroup.style.display = "none";
    if (transferredFromGroup) transferredFromGroup.style.display = "none";
    if (convertFromGroup) convertFromGroup.style.display = "block";
    if (dateLabel) dateLabel.innerHTML = "Outcome Date";
}

// Toggle fields based on outcome
function toggleStatusFields() {
    const outcome = document.getElementById("memberOutcome").value;
    const transferredToGroup = document.getElementById("transferredToGroup");
    const transferredFromGroup = document.getElementById("transferredFromGroup");
    const convertFromGroup = document.getElementById("convertFromGroup");
    const dateLabel = document.getElementById("dateOfStatusLabel");
    
    if (transferredToGroup) transferredToGroup.style.display = "none";
    if (transferredFromGroup) transferredFromGroup.style.display = "none";
    if (convertFromGroup) convertFromGroup.style.display = "none";
    
    if (outcome === "transfer_out") {
        if (transferredToGroup) transferredToGroup.style.display = "block";
        if (dateLabel) dateLabel.innerHTML = "Transfer Date";
    } else if (outcome === "transfer_in") {
        if (transferredFromGroup) transferredFromGroup.style.display = "block";
        if (dateLabel) dateLabel.innerHTML = "Transfer Date";
    } else if (outcome === "deceased") {
        if (dateLabel) dateLabel.innerHTML = "Decease Date";
    } else if (outcome === "backslided") {
        if (dateLabel) dateLabel.innerHTML = "Date Backslided";
    } else if (outcome === "converts") {
        if (convertFromGroup) convertFromGroup.style.display = "block";
        if (dateLabel) dateLabel.innerHTML = "Date Converted";
    } else if (outcome === "active") {
        if (dateLabel) dateLabel.innerHTML = "Reactivation Date";
    } else {
        if (dateLabel) dateLabel.innerHTML = "Outcome Date";
    }
}

function updateDateLabel() {
    const convertFromVal = document.getElementById("convertFrom");
    const outcome = document.getElementById("memberOutcome");
    const dateLabel = document.getElementById("dateOfStatusLabel");
    
    if (outcome && outcome.value === "converts" && convertFromVal && convertFromVal.value && dateLabel) {
        const selectedText = convertFromVal.options[convertFromVal.selectedIndex]?.text || "";
        if (selectedText) dateLabel.innerHTML = `Date converted from ${selectedText}`;
        else dateLabel.innerHTML = "Date Converted";
    }
}

// Save outcome to Google Sheets
async function saveOutcomeToServer(outcomeData) {
    try {
        const result = await api.createOutcome(outcomeData);
        return result;
    } catch (error) {
        console.error('Error saving outcome:', error);
        return { success: false, error: error.message };
    }
}

// Update member status using existing member data from the array
async function updateMemberStatusOnly(memberId, newStatus, receivingBranch, sendingBranch) {
    try {
        // Find the member in our existing members array
        const currentMember = members.find(m => String(m.member_id) === String(memberId));
        
        if (!currentMember) {
            console.error('Member not found in array:', memberId);
            return { success: false, error: 'Member not found' };
        }
        
        // Preserve ALL existing data from the current member
        const updateData = {
            // Keep all existing fields exactly as they are
            firstname: currentMember.firstname || '',
            surname: currentMember.surname || '',
            middlename: currentMember.middlename || '',
            pin: currentMember.pin || '',
            contact: currentMember.contact || '',
            email: currentMember.email || '',
            gender: currentMember.gender || '',
            branch: currentMember.branch || '',
            status: newStatus, // Only update the status
            kganya_member: currentMember.kganya_member || 'No',
            date_of_birth: currentMember.date_of_birth || '',
            address: currentMember.address || '',
            // Preserve any other fields that might exist
            member_id: currentMember.member_id,
            registration_date: currentMember.registration_date || new Date().toISOString()
        };
        
        // Only change branch if it's a transfer in
        if (newStatus === "transfer_in" && sendingBranch) {
            updateData.branch = sendingBranch;
        }
        
        // Add transfer tracking fields
        if (newStatus === "transfer_out" && receivingBranch) {
            updateData.transferred_to = receivingBranch;
        }
        
        if (newStatus === "transfer_in" && sendingBranch) {
            updateData.transferred_from = sendingBranch;
        }
        
        console.log('Updating member with preserved data:', updateData);
        
        // Call update member API with complete data
        const result = await api.updateMember(memberId, updateData);
        return result;
    } catch (error) {
        console.error('Error updating member status:', error);
        return { success: false, error: error.message };
    }
}

// Handle status form submission with loading indicators
const statusForm = document.getElementById("statusForm");
if (statusForm) {
    statusForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        
        const memberId = document.getElementById("statusMemberId").value;
        const outcome = document.getElementById("memberOutcome").value;
        const convertFrom = document.getElementById("convertFrom").value;
        const receivingBranch = document.getElementById("receivingBranch").value;
        const sendingBranch = document.getElementById("sendingBranch").value;
        const statusDate = document.getElementById("dateOfStatus").value;
        const notes = document.getElementById("statusNotes").value;
        
        if (!outcome || !statusDate) {
            showMessage("Please select outcome and date", "error");
            return;
        }
        
        if (outcome === "transfer_out" && !receivingBranch) {
            showMessage("Please select receiving branch for transfer out", "error");
            return;
        }
        
        if (outcome === "transfer_in" && !sendingBranch) {
            showMessage("Please select sending branch for transfer in", "error");
            return;
        }
        
        if (outcome === "converts" && !convertFrom) {
            showMessage("Please select Convert From option", "error");
            return;
        }
        
        const member = members.find(m => String(m.member_id) === String(memberId));
        if (member) {
            const outcomeRecord = {
                outcome_id: 'OUT_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                member_id: memberId,
                member_name: `${member.firstname} ${member.surname}`,
                previous_status: member.status || 'active',
                new_status: outcome,
                convert_from: convertFrom,
                transferred_to: receivingBranch,
                transferred_from: sendingBranch,
                outcome_date: statusDate,
                notes: notes,
                recorded_at: new Date().toISOString()
            };
            
            // Disable save button and show loading state
            const saveBtn = document.querySelector("#statusForm .btn-save");
            const originalBtnText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving outcome...';
            
            showMessage("Saving outcome record...", "success");
            
            // First, save the outcome record
            const saveResult = await saveOutcomeToServer(outcomeRecord);
            
            if (saveResult.success) {
                // Update save button to show updating status
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating member status...';
                showMessage("Outcome saved! Updating member status...", "success");
                
                // Update member status (preserving all other data)
                const updateResult = await updateMemberStatusOnly(memberId, outcome, receivingBranch, sendingBranch);
                
                if (updateResult.success) {
                    showMessage(`✓ Status updated for ${member.firstname} ${member.surname}`, "success");
                    closeStatusModal();
                    
                    // Reload data to reflect changes
                    await loadData();
                } else {
                    showMessage("⚠ Outcome saved but member status update failed: " + (updateResult.error || "Unknown error"), "error");
                }
            } else {
                showMessage("✗ Error saving outcome: " + (saveResult.error || "Unknown error"), "error");
            }
            
            // Re-enable save button and restore original text
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnText;
        } else {
            showMessage("Member not found", "error");
        }
    });
}

// ========== HISTORY MODAL FUNCTIONS ==========

// Open History Modal - FIXED with null checks
async function openHistoryModal(memberId) {
    const member = members.find(m => String(m.member_id) === String(memberId));
    if (member) {
        currentHistoryMember = member;
        
        // Check if modal title element exists
        const modalTitle = document.getElementById("historyModalTitle");
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="fas fa-history"></i> Outcome History: ${escapeHtml(member.firstname)} ${escapeHtml(member.surname)}`;
        }
        
        // Load outcomes from server
        await loadMemberOutcomes(memberId);
        
        const modal = document.getElementById("historyModal");
        if (modal) modal.style.display = "flex";
    } else {
        showMessage("Member not found", "error");
    }
}

function closeHistoryModal() {
    const modal = document.getElementById("historyModal");
    if (modal) modal.style.display = "none";
}

async function loadMemberOutcomes(memberId) {
    const historyList = document.getElementById("historyList");
    if (!historyList) return;
    
    // Show loading state
    historyList.innerHTML = '<div class="history-loading"><i class="fas fa-spinner fa-pulse"></i><br>Loading outcome history...</div>';
    
    try {
        // Fetch all outcomes
        const outcomesResult = await api.getOutcomes();
        
        console.log('Outcomes result:', outcomesResult);
        
        if (outcomesResult.success && outcomesResult.data) {
            // Filter outcomes for this member
            const memberOutcomes = outcomesResult.data.filter(o => String(o.member_id) === String(memberId));
            
            console.log(`Found ${memberOutcomes.length} outcomes for member ${memberId}`);
            
            if (memberOutcomes.length === 0) {
                historyList.innerHTML = '<div class="history-empty"><i class="fas fa-archive"></i><br>No outcome history found for this member.</div>';
                return;
            }
            
            // Sort by outcome date (newest first)
            memberOutcomes.sort((a, b) => new Date(b.outcome_date) - new Date(a.outcome_date));
            
            let html = '';
            memberOutcomes.forEach((outcome) => {
                const outcomeDate = outcome.outcome_date ? new Date(outcome.outcome_date).toLocaleDateString('en-ZA') : 'N/A';
                const newStatus = outcome.new_status || 'N/A';
                const previousStatus = outcome.previous_status || 'N/A';
                const recordedAt = outcome.recorded_at ? new Date(outcome.recorded_at).toLocaleString() : 'N/A';
                const notes = outcome.notes || 'No notes';
                const outcomeId = outcome.outcome_id || outcome.id;
                
                let statusClass = 'active';
                let statusIcon = 'fa-check-circle';
                if (newStatus === 'backslided') {
                    statusClass = 'backslided';
                    statusIcon = 'fa-exclamation-triangle';
                } else if (newStatus === 'deceased') {
                    statusClass = 'deceased';
                    statusIcon = 'fa-cross';
                } else if (newStatus === 'transfer_out' || newStatus === 'transfer_in') {
                    statusClass = 'transfer_out';
                    statusIcon = 'fa-exchange-alt';
                } else if (newStatus === 'converts') {
                    statusClass = 'converts';
                    statusIcon = 'fa-church';
                }
                
                let statusDisplay = newStatus.charAt(0).toUpperCase() + newStatus.slice(1).replace('_', ' ');
                
                let transferInfo = '';
                if (outcome.transferred_to) {
                    transferInfo = `
                        <div class="transfer-info">
                            <i class="fas fa-exchange-alt"></i>
                            <span>Transferred To: <strong>${escapeHtml(outcome.transferred_to)}</strong></span>
                        </div>`;
                }
                if (outcome.transferred_from) {
                    transferInfo = `
                        <div class="transfer-info">
                            <i class="fas fa-exchange-alt"></i>
                            <span>Transferred From: <strong>${escapeHtml(outcome.transferred_from)}</strong></span>
                        </div>`;
                }
                
                let convertInfo = '';
                if (outcome.convert_from) {
                    const convertText = outcome.convert_from === 'stengenas' ? 'St. Engenas' : 'Backslider';
                    convertInfo = `
                        <div class="convert-info">
                            <i class="fas fa-church"></i>
                            <span>Converted From: <strong>${convertText}</strong></span>
                        </div>`;
                }
                
                let notesHtml = '';
                if (notes && notes !== 'No notes') {
                    notesHtml = `
                        <div class="history-notes">
                            <i class="fas fa-sticky-note"></i>
                            <span>${escapeHtml(notes)}</span>
                        </div>`;
                }
                
                html += `
                    <div class="history-item" data-status="${newStatus}">
                        <div class="history-header">
                            <div class="history-header-left">
                                <span class="history-status-badge ${statusClass}">
                                    <i class="fas ${statusIcon}"></i>
                                    ${statusDisplay}
                                </span>
                                <span class="history-date">
                                    <i class="fas fa-calendar-alt"></i> ${outcomeDate}
                                </span>
                            </div>
                            <button class="btn-delete-history" onclick="deleteOutcomeRecord('${outcomeId}', '${memberId}')">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>
                        </div>
                        <div class="history-body">
                            <div class="history-detail">
                                <i class="fas fa-arrow-left arrow-icon"></i>
                                <span>Previous Status: <strong>${escapeHtml(previousStatus)}</strong></span>
                            </div>
                            <div class="history-detail">
                                <i class="fas fa-arrow-right arrow-icon"></i>
                                <span>New Status: <strong>${statusDisplay}</strong></span>
                            </div>
                            ${convertInfo}
                            ${transferInfo}
                            ${notesHtml}
                            <div class="history-recorded">
                                <i class="fas fa-clock"></i>
                                <span>Recorded: ${recordedAt}</span>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            historyList.innerHTML = html;
        } else {
            historyList.innerHTML = '<div class="history-empty"><i class="fas fa-exclamation-triangle"></i><br>Unable to load outcome history.</div>';
        }
    } catch (error) {
        console.error('Error loading outcomes:', error);
        historyList.innerHTML = '<div class="history-empty"><i class="fas fa-times-circle"></i><br>Error loading history. Please try again.</div>';
    }
}

// Delete outcome record
async function deleteOutcomeRecord(outcomeId, memberId) {
    if (confirm('⚠️ Are you sure you want to delete this outcome record?\n\nThis action cannot be undone!')) {
        try {
            const result = await api.deleteOutcome(outcomeId);
            
            if (result.success) {
                showMessage('Outcome record deleted successfully', 'success');
                // Reload the history for this member
                await loadMemberOutcomes(memberId);
                // Also reload members to update current status display
                await loadData();
            } else {
                showMessage('Error deleting record: ' + (result.error || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error deleting outcome:', error);
            showMessage('Error deleting record. Please try again.', 'error');
        }
    }
}

// Event Listeners
function setupEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const resetBtn = document.getElementById("resetBtn");
    const closeStatusBtn = document.getElementById("closeStatusModalBtn");
    const cancelStatusBtn = document.getElementById("cancelStatusBtn");
    const closeHistoryBtn = document.getElementById("closeHistoryModalBtn");
    const cancelHistoryBtn = document.getElementById("cancelHistoryBtn");
    const memberOutcome = document.getElementById("memberOutcome");
    const convertFrom = document.getElementById("convertFrom");
    const searchInput = document.getElementById("globalSearchInput");
    
    // Search button handler
    if (searchBtn) {
        searchBtn.removeEventListener("click", applySearchAndRender);
        searchBtn.addEventListener("click", applySearchAndRender);
        console.log("Search button listener attached");
    }
    
    // Reset button handler
    if (resetBtn) {
        resetBtn.removeEventListener("click", resetSearch);
        resetBtn.addEventListener("click", resetSearch);
        console.log("Reset button listener attached");
    }
    
    if (closeStatusBtn) closeStatusBtn.addEventListener("click", closeStatusModal);
    if (cancelStatusBtn) cancelStatusBtn.addEventListener("click", closeStatusModal);
    if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", closeHistoryModal);
    if (cancelHistoryBtn) cancelHistoryBtn.addEventListener("click", closeHistoryModal);
    if (memberOutcome) memberOutcome.addEventListener("change", toggleStatusFields);
    if (convertFrom) convertFrom.addEventListener("change", updateDateLabel);
    
    if (searchInput) {
        searchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                applySearchAndRender();
            }
        });
    }
    
    window.onclick = function(event) {
        if (event.target.classList.contains('custom-modal')) {
            closeStatusModal();
            closeHistoryModal();
        }
    };
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

// Initialize
async function init() {
    console.log("Initializing Update Page...");
    await loadData();
    updateCurrentYear();
    setupEventListeners();
    console.log("Update Page Initialized");
}

// Make global functions available
window.deleteOutcomeRecord = deleteOutcomeRecord;
window.openHistoryModal = openHistoryModal;

init();