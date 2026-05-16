// ========== KGANYA SEARCH PAGE - MAIN APPLICATION ==========
// Data Storage
let members = [];

// Load initial data from localStorage
function loadInitialData() {
    const stored = localStorage.getItem("kganya_members");
    if (stored) {
        members = JSON.parse(stored);
    } else {
        members = [];
        saveToLocal();
    }
    renderMembersTable(members);
}

// Save to localStorage
function saveToLocal() {
    localStorage.setItem("kganya_members", JSON.stringify(members));
}

// Generate unique ID
function generateId() { 
    return Date.now().toString(); 
}

// Render members table
function renderMembersTable(dataArray) {
    const tbody = document.getElementById("membersTableBody");
    tbody.innerHTML = "";
    
    if (dataArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4">No members found. Register a new member.</td></tr>';
        document.getElementById("memberCountBadge").innerText = "0 members";
        return;
    }
    
    dataArray.forEach(m => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = m.firstname || "";
        row.insertCell(1).innerText = m.middlename || "";
        row.insertCell(2).innerText = m.surname || "";
        row.insertCell(3).innerText = m.pin || "";
        row.insertCell(4).innerText = m.gender || "";
        row.insertCell(5).innerText = m.contact || "";
        row.insertCell(6).innerText = m.date_of_baptism || "N/A";
        row.insertCell(7).innerHTML = `<span class="badge-kganya"><i class="fas ${m.kganya_member === 'Yes' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${m.kganya_member || 'No'}</span>`;
        
        const actionCell = row.insertCell(8);
        actionCell.className = "action-buttons";
        actionCell.innerHTML = `
            <button class="btn btn-sm btn-outline-success edit-member-btn" data-id="${m.member_id}"><i class="fas fa-edit"></i> Edit</button>
            <button class="btn btn-sm btn-outline-danger delete-member-btn" data-id="${m.member_id}"><i class="fas fa-trash-alt"></i> Del</button>
            <button class="btn btn-sm btn-info status-open-btn" data-id="${m.member_id}" style="background:#e3f2fd; border-radius:25px;"><i class="fas fa-chart-simple"></i> Status</button>
        `;
    });
    
    document.getElementById("memberCountBadge").innerText = `${dataArray.length} member${dataArray.length !== 1 ? 's' : ''}`;
    attachTableEvents();
}

// Attach event listeners to table buttons
function attachTableEvents() {
    document.querySelectorAll(".edit-member-btn").forEach(btn => {
        btn.addEventListener("click", (e) => { 
            const id = btn.getAttribute("data-id"); 
            openEditModal(id); 
        });
    });
    
    document.querySelectorAll(".delete-member-btn").forEach(btn => {
        btn.addEventListener("click", (e) => { 
            if(confirm("Delete member permanently?")) { 
                const id = btn.getAttribute("data-id"); 
                deleteMemberById(id); 
            }
        });
    });
    
    document.querySelectorAll(".status-open-btn").forEach(btn => {
        btn.addEventListener("click", (e) => { 
            const id = btn.getAttribute("data-id"); 
            openStatusModalForMember(id); 
        });
    });
}

// Delete member by ID
function deleteMemberById(id) {
    members = members.filter(m => m.member_id !== id);
    saveToLocal();
    applySearchAndRender();
    showError("Member deleted successfully", false);
}

// Apply search filter and render
function applySearchAndRender() {
    const searchTerm = document.getElementById("globalSearchInput").value.toLowerCase().trim();
    if (searchTerm === "") {
        renderMembersTable(members);
    } else {
        const filtered = members.filter(m => 
            (m.firstname && m.firstname.toLowerCase().includes(searchTerm)) ||
            (m.surname && m.surname.toLowerCase().includes(searchTerm)) ||
            (m.pin && m.pin.toLowerCase().includes(searchTerm)) ||
            (m.contact && m.contact.toLowerCase().includes(searchTerm)) ||
            (m.contact2 && m.contact2.toLowerCase().includes(searchTerm))
        );
        renderMembersTable(filtered);
    }
}

// Show error/success message
function showError(msg, isError = true) {
    const container = document.getElementById("errorMessageContainer");
    const span = document.getElementById("errorText");
    span.innerText = msg;
    container.style.display = "block";
    
    if(!isError) {
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

// Open register modal
function openRegisterModal() {
    document.getElementById("registerModalTitle").innerHTML = '<i class="fas fa-user-plus"></i> Register New Member';
    document.getElementById("memberForm").reset();
    document.getElementById("editMemberId").value = "";
    document.getElementById("registerModal").style.display = "flex";
}

// Open edit modal
function openEditModal(memberId) {
    const member = members.find(m => m.member_id === memberId);
    if(member){
        document.getElementById("editMemberId").value = member.member_id;
        document.getElementById("firstname").value = member.firstname || "";
        document.getElementById("middlename").value = member.middlename || "";
        document.getElementById("surname").value = member.surname || "";
        document.getElementById("pin").value = member.pin || "";
        document.getElementById("gender").value = member.gender || "Male";
        document.getElementById("contact").value = member.contact || "";
        document.getElementById("date_of_baptism").value = member.date_of_baptism || "";
        document.getElementById("kganya_member").value = member.kganya_member || "Yes";
        document.getElementById("registerModalTitle").innerHTML = '<i class="fas fa-edit"></i> Edit Member';
        document.getElementById("registerModal").style.display = "flex";
    }
}

// Close register modal
function closeRegisterModal() { 
    document.getElementById("registerModal").style.display = "none"; 
}

// Handle member form submission
document.getElementById("memberForm").addEventListener("submit", function(e){
    e.preventDefault();
    const id = document.getElementById("editMemberId").value;
    const newMember = {
        member_id: id ? id : generateId(),
        firstname: document.getElementById("firstname").value,
        middlename: document.getElementById("middlename").value,
        surname: document.getElementById("surname").value,
        pin: document.getElementById("pin").value,
        gender: document.getElementById("gender").value,
        contact: document.getElementById("contact").value,
        date_of_baptism: document.getElementById("date_of_baptism").value,
        kganya_member: document.getElementById("kganya_member").value,
        statusHistory: []
    };
    
    if(id){
        const index = members.findIndex(m => m.member_id === id);
        if(index !== -1) members[index] = {...members[index], ...newMember};
    } else {
        members.push(newMember);
    }
    
    saveToLocal();
    applySearchAndRender();
    closeRegisterModal();
    showError("Member saved successfully!", false);
});

// Open status modal
function openStatusModalForMember(memberId){
    document.getElementById("statusMemberId").value = memberId;
    resetStatusFormFields();
    document.getElementById("statusModal").style.display = "flex";
}

// Close status modal
function closeStatusModal(){ 
    document.getElementById("statusModal").style.display = "none"; 
}

// Reset status form fields
function resetStatusFormFields(){
    document.getElementById("memberOutcome").value = "";
    document.getElementById("outcomeSource").value = "";
    document.getElementById("receivingBranch").value = "";
    document.getElementById("dateOfStatusLabel").innerText = "Outcome Date";
    document.getElementById("outcomeSourceGroup").style.display = "block";
    document.getElementById("transferredToGroup").style.display = "none";
    document.getElementById("dateOfStatus").value = "";
}

// Toggle fields based on outcome selection
function toggleFields(){
    const outcome = document.getElementById("memberOutcome").value;
    const sourceGroup = document.getElementById("outcomeSourceGroup");
    const transferGroup = document.getElementById("transferredToGroup");
    const dateLabel = document.getElementById("dateOfStatusLabel");
    
    if(outcome === "transfer_out"){
        sourceGroup.style.display = "none";
        transferGroup.style.display = "block";
        dateLabel.innerText = "Transfer Date";
    } else if(outcome === "deceased"){
        sourceGroup.style.display = "none";
        transferGroup.style.display = "none";
        dateLabel.innerText = "Decease date";
    } else if(outcome === "backslided"){
        sourceGroup.style.display = "none";
        transferGroup.style.display = "none";
        dateLabel.innerText = "Date Backslided";
    } else if(outcome === "converts"){
        sourceGroup.style.display = "block";
        transferGroup.style.display = "none";
        dateLabel.innerText = "Date Converted";
    } else {
        sourceGroup.style.display = "block";
        transferGroup.style.display = "none";
        dateLabel.innerText = "Outcome Date";
    }
}

// Update date label based on outcome source
function updateDateLabel(){
    const outcomeSourceVal = document.getElementById("outcomeSource");
    const outcome = document.getElementById("memberOutcome").value;
    const dateLabel = document.getElementById("dateOfStatusLabel");
    
    if(outcome === "converts" && outcomeSourceVal.value){
        const selectedText = outcomeSourceVal.options[outcomeSourceVal.selectedIndex]?.text || "";
        if(selectedText) dateLabel.innerText = `Date converted from ${selectedText}`;
        else dateLabel.innerText = "Date Converted";
    }
}

// Handle status form submission
document.getElementById("statusForm").addEventListener("submit", function(e){
    e.preventDefault();
    const memberId = document.getElementById("statusMemberId").value;
    const outcome = document.getElementById("memberOutcome").value;
    const outcomeSource = document.getElementById("outcomeSource").value;
    const receivingBranch = document.getElementById("receivingBranch").value;
    const statusDate = document.getElementById("dateOfStatus").value;
    
    if(!outcome || !statusDate){
        showError("Please select outcome and date", true);
        return;
    }
    if(outcome === "transfer_out" && !receivingBranch){
        showError("Please select receiving branch for transfer", true);
        return;
    }
    if(outcome === "converts" && !outcomeSource){
        showError("Please select Outcome Source for Converts", true);
        return;
    }
    
    const memberIndex = members.findIndex(m => m.member_id === memberId);
    if(memberIndex !== -1){
        const statusRecord = { 
            outcome, 
            outcomeSource, 
            receivingBranch, 
            date: statusDate, 
            recordedAt: new Date().toISOString() 
        };
        
        if(!members[memberIndex].statusHistory) members[memberIndex].statusHistory = [];
        members[memberIndex].statusHistory.push(statusRecord);
        saveToLocal();
        showError(`Status updated for ${members[memberIndex].firstname} ${members[memberIndex].surname}`, false);
        closeStatusModal();
        applySearchAndRender();
    } else {
        showError("Member not found", true);
    }
});

// Setup all event listeners
function setupEventListeners() {
    // Search and reset buttons
    document.getElementById("searchBtn").addEventListener("click", () => applySearchAndRender());
    document.getElementById("resetBtn").addEventListener("click", () => {
        document.getElementById("globalSearchInput").value = "";
        applySearchAndRender();
    });
    document.getElementById("openRegisterModalBtn").addEventListener("click", openRegisterModal);
    
    // Modal close buttons
    const closeRegisterBtn = document.getElementById("closeRegisterModalBtn");
    const cancelRegisterBtn = document.getElementById("cancelRegisterBtn");
    const closeStatusBtn = document.getElementById("closeStatusModalBtn");
    const cancelStatusBtn = document.getElementById("cancelStatusBtn");
    
    if (closeRegisterBtn) closeRegisterBtn.addEventListener("click", closeRegisterModal);
    if (cancelRegisterBtn) cancelRegisterBtn.addEventListener("click", closeRegisterModal);
    if (closeStatusBtn) closeStatusBtn.addEventListener("click", closeStatusModal);
    if (cancelStatusBtn) cancelStatusBtn.addEventListener("click", closeStatusModal);
    
    // Status form field listeners
    const memberOutcome = document.getElementById("memberOutcome");
    const outcomeSource = document.getElementById("outcomeSource");
    
    if (memberOutcome) memberOutcome.addEventListener("change", toggleFields);
    if (outcomeSource) outcomeSource.addEventListener("change", updateDateLabel);
    
    // Enter key search
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
        searchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                applySearchAndRender();
            }
        });
    }
    
    // Close modals when clicking outside
    window.onclick = function(event) {
        if (event.target.classList.contains('custom-modal')) {
            event.target.style.display = 'none';
        }
    };
}

// Update footer year
function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Initialize the application
function init() {
    loadInitialData();
    updateCurrentYear();
    setupEventListeners();
}

// Start the application
init();