// ========== ADMIN CHECK FUNCTIONS ==========
function isCurrentUserAdmin() {
    const currentUser = JSON.parse(localStorage.getItem('current_user') || '{}');
    return currentUser.role === 'admin';
}

function checkAdminPermission(action) {
    if (!isCurrentUserAdmin()) {
        showMessage(`Only administrators can ${action} members.`, 'error');
        return false;
    }
    return true;
}

// ========== REGISTER PAGE - GOOGLE SHEETS BACKEND ==========
let members = [];
let filteredMembers = [];
let memberToDelete = null;
let currentStep = 1;
const totalSteps = 5;
let isLoading = false;
let isEditingMode = false;

// Branch options based on Branch Level selection
const branchOptions = {
    main: [
        { value: "FP0_Minister", label: "FP0: MINISTER" },
        { value: "FP1_Luhlokohla", label: "FP1: LUHLOKOHLA" },        
        { value: "FP2_Ezulwini", label: "FP2: EZULWINI" },
        { value: "FP3_Piggs Peak", label: "FP3: PIGGS PEAK" },
        { value: "FP4_Nhlangano", label: "FP4: NHLANGANO" },
        { value: "FP5_Mhlangatane", label: "FP5: MHLANGATANE" },
        { value: "FP6_Mbabane", label: "FP6: MBABANE" },
        { value: "FP7_Tshaneni", label: "FP7: TSHANENI/SOHHOYE" },
        { value: "FP8_Siteki", label: "FP8: SITEKI" },
        { value: "FP9_Lubulini", label: "FP9: LUBULINI" },
        { value: "FP10_Ntfonjeni", label: "FP10: NTFONJENI" }
    ],
    sub: [
        { value: "FP1_Malindza", label: "FP1: MALINDZA" },
        { value: "FP2_Maphalaleni", label: "FP2: MAPHALALENI" },
        { value: "FP4_Lulakeni", label: "FP4: LULAKENI" },
        { value: "FP5_Mpofu", label: "FP5: MPOFU" },
        { value: "FP5_Sidzakeni", label: "FP5: SIDZAKENI" },
        { value: "FP5_Sitsatsaweni", label: "FP5: SITSATSAWENI" },
        { value: "FP6_Jubukweni", label: "FP6: JUBUKWENI" },
        { value: "FP7_Nkambeni", label: "FP7: NKAMBENI" },
        { value: "FP7_SIidvokodvo", label: "FP7: SIDVOKODVO" },
        { value: "FP7_Tsambokhulu", label: "FP7: TSAMBOKHULU" },
        { value: "FP8_Mpolonjeni", label: "FP8: MPLONJENI" },
        { value: "FP9_Matsanjeni", label: "FP9: MATSANJENI" },
        { value: "FP9_Thesalonika", label: "FP9: THESALONIKA" }
    ]
};

// ========== BRANCH OVERRIDE TOGGLE VARIABLES ==========
let isBranchOverrideActive = false;
let branchLevelManualSelect = null;
let branchManualSelect = null;

// ========== BRANCH LEVEL FUNCTIONS ==========
function populateBranchOptions(branchLevel) {
    const branchSelect = document.getElementById('branch');
    if (!branchSelect) return;
    
    branchSelect.innerHTML = '';
    
    if (!branchLevel || branchLevel === '') {
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Select Branch Level First';
        branchSelect.appendChild(placeholderOption);
        branchSelect.disabled = true;
        return;
    }
    
    const options = branchOptions[branchLevel];
    
    if (options && options.length > 0) {
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = `Select ${branchLevel === 'main' ? 'Main' : 'Sub'} Branch`;
        branchSelect.appendChild(defaultOption);
        
        options.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.label;
            branchSelect.appendChild(optElement);
        });
        
        branchSelect.disabled = false;
    } else {
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'No branches available';
        branchSelect.appendChild(errorOption);
        branchSelect.disabled = true;
    }
}

function onBranchLevelChange() {
    const branchLevelSelect = document.getElementById('branch_level');
    if (!branchLevelSelect) return;
    
    const selectedLevel = branchLevelSelect.value;
    populateBranchOptions(selectedLevel);
    
    const branchSelect = document.getElementById('branch');
    if (branchSelect) {
        branchSelect.value = '';
    }
}

function setupBranchLevelListener() {
    const branchLevelSelect = document.getElementById('branch_level');
    if (branchLevelSelect) {
        branchLevelSelect.removeEventListener('change', onBranchLevelChange);
        branchLevelSelect.addEventListener('change', onBranchLevelChange);
    }
}

// Apply session branch data ONLY for new registration
function applySessionBranchForNewRegistration() {
    if (isEditingMode) return;
    
    const branchLevel = localStorage.getItem('user_branch_level') || '';
    const branch = localStorage.getItem('user_branch') || '';
    const branchLabel = localStorage.getItem('user_branch_label') || branch;
    const levelLabels = { main: 'Main Branch', sub: 'Sub-Branch' };

    const levelInput = document.getElementById('branch_level');
    const branchInput = document.getElementById('branch');
    const levelText = document.getElementById('branch_level_text');
    const branchText = document.getElementById('branch_text');

    if (levelInput) levelInput.value = branchLevel;
    if (branchInput) branchInput.value = branch;

    if (levelText) {
        levelText.textContent = branchLevel ? (levelLabels[branchLevel] || branchLevel) : 'Not set';
    }
    if (branchText) {
        branchText.textContent = branchLabel || 'Not set';
    }
}

// ========== CREATE MANUAL BRANCH FIELDS DYNAMICALLY ==========
function createManualBranchFields() {
    const subsectionCard = document.querySelector('.subsection-card');
    if (!subsectionCard) return;
    
    const row = subsectionCard.querySelector('.row');
    if (!row) return;
    
    if (document.getElementById('branch_level_manual_group')) return;
    
    const levelManualGroup = document.createElement('div');
    levelManualGroup.className = 'col-md-6 form-group-modern';
    levelManualGroup.id = 'branch_level_manual_group';
    levelManualGroup.style.display = 'none';
    levelManualGroup.innerHTML = `
        <label>Branch Level (Manual) <span style="color: red;">*</span></label>
        <select id="branch_level_manual" class="form-control-modern">
            <option value="">Select Branch Level</option>
            <option value="main">Main Branch</option>
            <option value="sub">Sub-Branch</option>
            <option value="other">Other</option>
        </select>
    `;
    
    const branchManualGroup = document.createElement('div');
    branchManualGroup.className = 'col-md-6 form-group-modern';
    branchManualGroup.id = 'branch_manual_group';
    branchManualGroup.style.display = 'none';
    branchManualGroup.innerHTML = `
        <label>Branch (Manual) <span style="color: red;">*</span></label>
        <select id="branch_manual" class="form-control-modern" disabled>
            <option value="">Select Branch Level First</option>
        </select>
    `;
    
    const branchLevelDisplay = document.getElementById('branch_level_display')?.closest('.col-md-6');
    const branchDisplay = document.getElementById('branch_display')?.closest('.col-md-6');
    
    if (branchLevelDisplay && branchDisplay) {
        branchLevelDisplay.insertAdjacentElement('afterend', levelManualGroup);
        branchDisplay.insertAdjacentElement('afterend', branchManualGroup);
    } else {
        row.appendChild(levelManualGroup);
        row.appendChild(branchManualGroup);
    }
    
    const hintDiv = document.createElement('div');
    hintDiv.id = 'manualBranchHint';
    hintDiv.className = 'branch-help-text';
    hintDiv.style.cssText = 'display: none; margin-top: 0.75rem; padding: 0.5rem; background: #fff3cd; border-radius: 6px; font-size: 0.75rem; width: 100%;';
    hintDiv.innerHTML = '<i class="fas fa-info-circle"></i> Manual override active: You are manually selecting branch information.';
    subsectionCard.appendChild(hintDiv);
    
    branchLevelManualSelect = document.getElementById('branch_level_manual');
    branchManualSelect = document.getElementById('branch_manual');
    
    if (branchLevelManualSelect) {
        branchLevelManualSelect.addEventListener('change', function() {
            const selectedLevel = branchLevelManualSelect.value;
            populateManualBranchDropdown(selectedLevel);
        });
    }
}

function populateManualBranchDropdown(level) {
    if (!branchManualSelect) return;
    
    branchManualSelect.innerHTML = '<option value="">Select Branch</option>';
    
    if (!level || level === '') {
        branchManualSelect.disabled = true;
        return;
    }
    
    let options = [];
    if (level === 'main') {
        options = branchOptions.main;
    } else if (level === 'sub') {
        options = branchOptions.sub;
    } else {
        const customOption = document.createElement('option');
        customOption.value = 'other';
        customOption.textContent = 'Other';
        branchManualSelect.appendChild(customOption);
        branchManualSelect.disabled = false;
        return;
    }
    
    if (options && options.length > 0) {
        options.forEach(option => {
            const optElement = document.createElement('option');
            optElement.value = option.value;
            optElement.textContent = option.label;
            branchManualSelect.appendChild(optElement);
        });
        branchManualSelect.disabled = false;
    } else {
        branchManualSelect.disabled = true;
    }
}

// ========== BRANCH OVERRIDE TOGGLE FUNCTIONALITY ==========
function setupBranchOverrideToggle() {
    const toggleBtn = document.getElementById('toggleBranchOverrideBtn');
    if (!toggleBtn) return;
    
    createManualBranchFields();
    
    const autoLevelGroup = document.getElementById('branch_level_display')?.closest('.col-md-6');
    const autoBranchGroup = document.getElementById('branch_display')?.closest('.col-md-6');
    const manualLevelGroup = document.getElementById('branch_level_manual_group');
    const manualBranchGroup = document.getElementById('branch_manual_group');
    const manualHint = document.getElementById('manualBranchHint');
    
    function enableManualOverride() {
        isBranchOverrideActive = true;
        
        if (autoLevelGroup) autoLevelGroup.style.display = 'none';
        if (autoBranchGroup) autoBranchGroup.style.display = 'none';
        if (manualLevelGroup) manualLevelGroup.style.display = 'block';
        if (manualBranchGroup) manualBranchGroup.style.display = 'block';
        if (manualHint) manualHint.style.display = 'block';
        
        const currentLevel = document.getElementById('branch_level')?.value || '';
        const currentBranch = document.getElementById('branch')?.value || '';
        
        if (branchLevelManualSelect && currentLevel) {
            branchLevelManualSelect.value = currentLevel;
            populateManualBranchDropdown(currentLevel);
            if (branchManualSelect && currentBranch) {
                setTimeout(() => {
                    branchManualSelect.value = currentBranch;
                }, 50);
            }
        }
        
        toggleBtn.classList.add('active');
        toggleBtn.innerHTML = '<i class="fas fa-undo-alt"></i> Use Default Branch';
    }
    
    function disableManualOverride() {
        isBranchOverrideActive = false;
        
        if (autoLevelGroup) autoLevelGroup.style.display = 'block';
        if (autoBranchGroup) autoBranchGroup.style.display = 'block';
        if (manualLevelGroup) manualLevelGroup.style.display = 'none';
        if (manualBranchGroup) manualBranchGroup.style.display = 'none';
        if (manualHint) manualHint.style.display = 'none';
        
        if (branchLevelManualSelect) branchLevelManualSelect.value = '';
        if (branchManualSelect) {
            branchManualSelect.innerHTML = '<option value="">Select Branch Level First</option>';
            branchManualSelect.disabled = true;
        }
        
        if (!isEditingMode) {
            applySessionBranchForNewRegistration();
        }
        
        toggleBtn.classList.remove('active');
        toggleBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Override Branch';
    }
    
    toggleBtn.addEventListener('click', function() {
        if (isBranchOverrideActive) {
            disableManualOverride();
        } else {
            enableManualOverride();
        }
    });
}

function syncBranchOverrideBeforeSave() {
    if (isBranchOverrideActive && branchLevelManualSelect && branchManualSelect) {
        const manualLevel = branchLevelManualSelect.value;
        const manualBranch = branchManualSelect.value;
        
        const branchLevelHidden = document.getElementById('branch_level');
        const branchHidden = document.getElementById('branch');
        
        if (manualLevel) {
            branchLevelHidden.value = manualLevel;
        }
        if (manualBranch) {
            branchHidden.value = manualBranch;
        }
    }
}

function resetBranchOverride() {
    if (isBranchOverrideActive) {
        const toggleBtn = document.getElementById('toggleBranchOverrideBtn');
        if (toggleBtn && toggleBtn.classList.contains('active')) {
            toggleBtn.click();
        }
    }
    isBranchOverrideActive = false;
}

// ========== LOAD DATA FUNCTIONS ==========
async function loadInitialData() {
    showLoading(true);
    
    try {
        const result = await api.getMembers();
        
        if (result.success && result.data) {
            members = result.data;
            filteredMembers = [...members];
            renderMembersTable(filteredMembers);
            updateMemberCount(filteredMembers.length);
        } else {
            members = [];
            filteredMembers = [];
            renderMembersTable(filteredMembers);
            updateMemberCount(0);
            if (result.error) {
                showMessage('Error loading members: ' + result.error, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading members:', error);
        showMessage('Error connecting to server. Please check your connection.', 'error');
        members = [];
        filteredMembers = [];
        renderMembersTable(filteredMembers);
        updateMemberCount(0);
    }
    
    showLoading(false);
}

function updateMemberCount(count) {
    const memberCountBadge = document.getElementById("memberCountBadge");
    if (memberCountBadge) {
        memberCountBadge.innerText = `${count} member${count !== 1 ? 's' : ''}`;
    }
}

function showLoading(show) {
    isLoading = show;
    const tbody = document.getElementById("membersTableBody");
    if (tbody && show) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4"><div class="spinner-border text-success" role="status"></div><p class="mt-2">Loading members...</p></td></tr>`;
    }
}

function renderMembersTable(dataArray) {
    const tbody = document.getElementById("membersTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    if (!dataArray || dataArray.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-4">No members found. Click "Register Member" to add one.</td></tr>';
        updateMemberCount(0);
        return;
    }
    
    const isAdmin = isCurrentUserAdmin();
    
    dataArray.forEach(m => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = m.firstname || "";
        row.insertCell(1).innerText = m.surname || "";
        row.insertCell(2).innerText = m.pin || "";
        row.insertCell(3).innerText = m.contact || "";
        row.insertCell(4).innerText = m.branch || "N/A";
        
        let activityText = "";
        switch(m.church_activity) {
            case 'mokhukhu': activityText = 'Mokhukhu'; break;
            case 'female_choir': activityText = 'Female Choir'; break;
            case 'male_choir': activityText = 'Male Choir'; break;
            case 'sunday_school': activityText = 'Sunday School'; break;
            default: activityText = m.church_activity || 'N/A';
        }
        row.insertCell(5).innerText = activityText;
        row.insertCell(6).innerHTML = `<span class="badge-kganya"><i class="fas ${m.kganya_member === 'Yes' ? 'fa-check-circle' : 'fa-times-circle'}"></i> ${m.kganya_member === 'Yes' ? 'Yes' : 'No'}</span>`;
        
        const actionCell = row.insertCell(7);
        actionCell.className = "action-buttons";
        
        let actionsHtml = `
            <button class="btn btn-sm btn-outline-success edit-member-btn" data-id="${m.member_id}"><i class="fas fa-edit"></i> Edit</button>
        `;
        
        if (isAdmin) {
            actionsHtml += `
                <button class="btn btn-sm btn-outline-danger delete-member-btn" data-id="${m.member_id}"><i class="fas fa-trash-alt"></i> Del</button>
            `;
        }
        
        actionCell.innerHTML = actionsHtml;
    });
    
    updateMemberCount(dataArray.length);
    attachTableEvents();
}

function attachTableEvents() {
    document.querySelectorAll(".edit-member-btn").forEach(btn => {
        btn.removeEventListener("click", handleEditClick);
        btn.addEventListener("click", handleEditClick);
    });
    
    document.querySelectorAll(".delete-member-btn").forEach(btn => {
        btn.removeEventListener("click", handleDeleteClick);
        btn.addEventListener("click", handleDeleteClick);
    });
}

function handleEditClick(e) {
    const id = e.currentTarget.getAttribute("data-id");
    openEditModal(id);
}

function handleDeleteClick(e) {
    const id = e.currentTarget.getAttribute("data-id");
    openDeleteModal(id);
}

// ========== SEARCH FUNCTIONS ==========
function applySearchAndRender() {
    const searchInput = document.getElementById("globalSearchInput");
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (searchTerm === "") {
        filteredMembers = [...members];
        renderMembersTable(filteredMembers);
        showMessage(`Showing all ${filteredMembers.length} members`, "success");
    } else {
        filteredMembers = members.filter(m => {
            const firstName = (m.firstname || "").toString().toLowerCase();
            const surname = (m.surname || "").toString().toLowerCase();
            const pin = (m.pin || "").toString().toLowerCase();
            const contact = (m.contact || "").toString().toLowerCase();
            const contact2 = (m.contact2 || "").toString().toLowerCase();
            const fullName = (firstName + " " + surname).toLowerCase();
            
            return firstName.includes(searchTerm) || 
                   surname.includes(searchTerm) || 
                   fullName.includes(searchTerm) ||
                   pin.includes(searchTerm) || 
                   contact.includes(searchTerm) ||
                   contact2.includes(searchTerm);
        });
        
        renderMembersTable(filteredMembers);
        
        if (filteredMembers.length === 0) {
            showMessage(`No members found matching "${searchTerm}"`, "error");
        } else {
            showMessage(`Found ${filteredMembers.length} member(s) matching "${searchTerm}"`, "success");
        }
    }
}

function resetSearch() {
    const searchInput = document.getElementById("globalSearchInput");
    if (searchInput) {
        searchInput.value = "";
    }
    filteredMembers = [...members];
    renderMembersTable(filteredMembers);
    showMessage(`Search cleared. Showing all ${filteredMembers.length} members.`, "success");
}

// ========== STEP NAVIGATION ==========
function showStep(step) {
    console.log('Showing step:', step);
    
    document.querySelectorAll('.step-section').forEach(section => {
        section.style.display = 'none';
    });
    
    const currentSection = document.querySelector(`.step-section[data-section="${step}"]`);
    if (currentSection) {
        currentSection.style.display = 'block';
        console.log('Displayed section for step:', step);
    }
    
    document.querySelectorAll('.step').forEach((stepEl, index) => {
        const stepNum = index + 1;
        stepEl.classList.remove('active', 'completed');
        
        if (stepNum < step) {
            stepEl.classList.add('completed');
        } else if (stepNum === step) {
            stepEl.classList.add('active');
        }
    });
    
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelFormBtn');
    
    if (step === 1) {
        if (prevBtn) prevBtn.style.display = 'none';
    } else {
        if (prevBtn) prevBtn.style.display = 'inline-flex';
    }
    
    if (step === totalSteps) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'inline-flex';
        updateReviewContent();
    } else {
        if (nextBtn) nextBtn.style.display = 'inline-flex';
        if (saveBtn) saveBtn.style.display = 'none';
    }
    
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    
    currentStep = step;
    
    setTimeout(() => {
        if (emptyFieldHighlightingActive) {
            highlightEmptyFields();
        }
    }, 50);
}

function nextStep() {
    console.log('Next step clicked, current step:', currentStep);
    if (validateCurrentSection(currentStep)) {
        if (currentStep < totalSteps) {
            showStep(currentStep + 1);
        }
    } else {
        highlightEmptyFields();
    }
}

function prevStep() {
    console.log('Prev step clicked, current step:', currentStep);
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
}

// ========== VALIDATION FUNCTIONS ==========
function validateContactNumber(contact, fieldName) {
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(contact)) {
        showMessage(`${fieldName} must contain only numbers and be 8-15 digits long`, 'error');
        return false;
    }
    return true;
}

function validatePIN(pin) {
    const pinRegex = /^[0-9]{0,20}$/;
    if (!pinRegex.test(pin)) {
        showMessage('PIN must contain only numbers and be 0-20 digits long', 'error');
        return false;
    }
    return true;
}

function validateCurrentSection(step) {
    console.log('Validating section:', step);
    
    if (step === 1) {
        const firstname = document.getElementById('firstname')?.value.trim();
        const surname = document.getElementById('surname')?.value.trim();
        const pin = document.getElementById('pin')?.value.trim();
        const contact = document.getElementById('contact')?.value.trim();
        let branchLevel = document.getElementById('branch_level')?.value;
        let branch = document.getElementById('branch')?.value;
        const joinMethod = document.getElementById('join_method')?.value;
        
        if (isBranchOverrideActive && branchLevelManualSelect && branchManualSelect) {
            branchLevel = branchLevelManualSelect.value;
            branch = branchManualSelect.value;
        }
        
        if (!firstname) {
            alert('Please enter first name');
            return false;
        }
        if (!surname) {
            alert('Please enter surname');
            return false;
        }
        if (!pin) {
            alert('Please enter PIN/ID number');
            return false;
        }
        if (!validatePIN(pin)) {
            return false;
        }
        if (!contact) {
            alert('Please enter contact number');
            return false;
        }
        if (!validateContactNumber(contact, 'Contact number')) {
            return false;
        }
        if (!branchLevel) {
            alert('Please select Branch Level');
            return false;
        }
        if (!branch) {
            alert('Please select a Branch');
            return false;
        }
        if (!joinMethod) {
            alert('Please select Join Method');
            return false;
        }
        
        const contact2 = document.getElementById('contact2')?.value.trim();
        if (contact2 && !validateContactNumber(contact2, 'Secondary contact number')) {
            return false;
        }
    }
    return true;
}

// ========== REVIEW CONTENT - FIXED ==========
function updateReviewContent() {
    const reviewContent = document.getElementById('reviewContent');
    if (!reviewContent) {
        console.error('reviewContent element not found');
        return;
    }
    
    console.log('Updating review content...');
    
    // Helper function to get input value
    function getInputValue(id, defaultValue = 'Not provided') {
        const el = document.getElementById(id);
        if (!el) return defaultValue;
        if (el.tagName === 'SELECT' && el.selectedIndex !== -1 && el.options[el.selectedIndex]) {
            return el.options[el.selectedIndex].text || defaultValue;
        }
        return el.value || defaultValue;
    }
    
    function getRawValue(id, defaultValue = 'Not provided') {
        const el = document.getElementById(id);
        return el ? (el.value || defaultValue) : defaultValue;
    }
    
    // Get branch display text
    let branchLevelText = '';
    let branchText = '';
    
    if (isBranchOverrideActive && branchLevelManualSelect && branchManualSelect) {
        branchLevelText = branchLevelManualSelect.options[branchLevelManualSelect.selectedIndex]?.text || branchLevelManualSelect.value || 'Not selected';
        branchText = branchManualSelect.options[branchManualSelect.selectedIndex]?.text || branchManualSelect.value || 'Not selected';
    } else {
        const levelSpan = document.getElementById('branch_level_text');
        const branchSpan = document.getElementById('branch_text');
        branchLevelText = levelSpan ? levelSpan.textContent : 'Not selected';
        branchText = branchSpan ? branchSpan.textContent : 'Not selected';
        
        if (branchLevelText === 'Loading...') branchLevelText = 'Not selected';
        if (branchText === 'Loading...') branchText = 'Not selected';
    }
    
    // Format church activity
    const churchActivityMap = {
        'mokhukhu': 'Mokhukhu',
        'female_choir': 'Female Choir',
        'male_choir': 'Male Choir',
        'sunday_school': 'Sunday School',
        'other': 'Other'
    };
    const churchActivityValue = getRawValue('church_activity');
    const churchActivityText = churchActivityMap[churchActivityValue] || churchActivityValue || 'Not selected';
    
    // Check if in executive committee
    const inExecCommittee = document.getElementById('in_executive_committee')?.checked || false;
    
    // Build the review HTML
    reviewContent.innerHTML = `
        <div style="background: #f8f9fa; border-radius: 12px; padding: 1.5rem;">
            <div class="review-section-title" style="background: #2e7d32; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px;">
                <i class="fas fa-user-friends"></i> Demographics Information
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                <div><strong>Firstname:</strong> ${escapeHtml(getInputValue('firstname'))}</div>
                <div><strong>Middlename:</strong> ${escapeHtml(getRawValue('middlename') || '')}</div>
                <div><strong>Surname:</strong> ${escapeHtml(getInputValue('surname'))}</div>
                <div><strong>PIN:</strong> ${escapeHtml(getRawValue('pin'))}</div>
                <div><strong>Date of Birth:</strong> ${getRawValue('date_of_birth') || 'Not provided'}</div>
                <div><strong>Gender:</strong> ${getInputValue('gender')}</div>
                <div><strong>Contact 1:</strong> ${escapeHtml(getRawValue('contact'))}</div>
                <div><strong>Contact 2:</strong> ${escapeHtml(getRawValue('contact2') || '')}</div>
                <div><strong>Branch Level:</strong> ${escapeHtml(branchLevelText)}</div>
                <div><strong>Branch:</strong> ${escapeHtml(branchText)}</div>
                <div><strong>Join Method:</strong> ${getInputValue('join_method')}</div>
                <div><strong>Baptism Date:</strong> ${getRawValue('date_of_baptism') || 'Not provided'}</div>
                <div><strong>Residential Address:</strong> ${escapeHtml(getRawValue('residential_address') || 'Not provided')}</div>
                <div><strong>Pays Kganya:</strong> ${getInputValue('kganya_member')}</div>
                <div><strong>Kganya Book Number:</strong> ${escapeHtml(getRawValue('kganya_book_number') || 'Not provided')}</div>
                <div><strong>Church Activity:</strong> ${churchActivityText}</div>
            </div>
            
            <div class="review-section-title" style="background: #2e7d32; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px;">
                <i class="fas fa-heart"></i> Next of Kin Information
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                <div><strong>Next of Kin Name:</strong> ${escapeHtml(getRawValue('nok_firstname') || '')} ${escapeHtml(getRawValue('nok_surname') || '')}</div>
                <div><strong>Next of Kin Contact:</strong> ${escapeHtml(getRawValue('nok_contact') || 'Not provided')}</div>
                <div><strong>Relationship:</strong> ${getInputValue('nok_relationship')}</div>
            </div>
            
            <div class="review-section-title" style="background: #2e7d32; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px;">
                <i class="fas fa-users"></i> Committee Information
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
                <div><strong>In Executive Committee:</strong> ${inExecCommittee ? 'Yes' : 'No'}</div>
                ${inExecCommittee ? `
                    <div><strong>Executive Committee:</strong> ${getInputValue('executive_committee')}</div>
                    <div><strong>Committee Role:</strong> ${escapeHtml(getRawValue('executive_committee_role') || 'Not provided')}</div>
                ` : ''}
            </div>
            
            <div class="review-section-title" style="background: #2e7d32; color: white; padding: 8px 12px; border-radius: 8px; margin-bottom: 15px;">
                <i class="fas fa-cogs"></i> Skills Set
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div><strong>Employment Status:</strong> ${getInputValue('employment_status')}</div>
                <div><strong>Occupation:</strong> ${escapeHtml(getRawValue('occupation') || 'Not provided')}</div>
                <div><strong>Education Level:</strong> ${getInputValue('education_level')}</div>
                <div><strong>Highest Certification:</strong> ${escapeHtml(getRawValue('highest_certification') || 'Not provided')}</div>
                <div><strong>Qualification:</strong> ${escapeHtml(getRawValue('qualification') || 'Not provided')}</div>
                <div><strong>Skills:</strong> ${escapeHtml(getRawValue('skills') || 'Not provided')}</div>
                <div><strong>Formally Trained:</strong> ${getInputValue('formally_trained_on_skills')}</div>
            </div>
        </div>
    `;
    
    console.log('Review content updated successfully');
}

// ========== MODAL OPEN/CLOSE FUNCTIONS ==========
function openRegisterModal() {
    const title = document.getElementById("registerModalTitle");
    const form = document.getElementById("memberForm");
    const editId = document.getElementById("editMemberId");
    const modal = document.getElementById("registerModal");
    
    if (!modal) {
        alert('Modal element not found');
        return;
    }
    
    isEditingMode = false;
    resetBranchOverride();
    
    if (title) title.innerHTML = '<i class="fas fa-user-plus"></i> Register New Member';
    if (form) form.reset();
    if (editId) editId.value = "";
    
    applySessionBranchForNewRegistration();
    
    const branchLevelSelect = document.getElementById('branch_level');
    if (branchLevelSelect && branchLevelSelect.value) {
        populateBranchOptions(branchLevelSelect.value);
    } else {
        populateBranchOptions("");
    }
    
    const dateOfBirth = document.getElementById('date_of_birth');
    if (dateOfBirth) dateOfBirth.value = "";
    
    const joinMethod = document.getElementById('join_method');
    if (joinMethod) joinMethod.value = "";
    
    const committeeGroup = document.getElementById('executive_committee_group');
    const roleGroup = document.getElementById('executive_committee_role_group');
    if (committeeGroup) committeeGroup.style.display = 'none';
    if (roleGroup) roleGroup.style.display = 'none';
    
    const inCommitteeCheckbox = document.getElementById('in_executive_committee');
    if (inCommitteeCheckbox) inCommitteeCheckbox.checked = false;
    
    currentStep = 1;
    showStep(1);
    
    modal.style.display = "flex";
    console.log('Modal opened');
    
    setTimeout(() => {
        emptyFieldHighlightingActive = true;
        highlightEmptyFields();
        addEmptyFieldsToggleButton();
    }, 200);
}

function closeRegisterModal() { 
    const modal = document.getElementById("registerModal");
    if (modal) modal.style.display = "none"; 
    isEditingMode = false;
    resetBranchOverride();
}

function formatDateForInput(dateString) {
    if (!dateString) return "";
    
    try {
        if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateString)) {
            return dateString.split('T')[0];
        }
        
        let date;
        if (typeof dateString === 'number') {
            date = new Date(dateString);
        } else if (dateString instanceof Date) {
            date = dateString;
        } else if (typeof dateString === 'string') {
            date = new Date(dateString);
            if (isNaN(date.getTime())) {
                const parts = dateString.split(/[/.-]/);
                if (parts.length === 3) {
                    let year = parseInt(parts[2]);
                    let month = parseInt(parts[1]);
                    let day = parseInt(parts[0]);
                    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
                        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    }
                }
            }
        }
        
        if (date && !isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const day = date.getDate();
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        
        return "";
    } catch (error) {
        console.error("Error formatting date:", error);
        return "";
    }
}

function openEditModal(memberId) {
    if (!members || members.length === 0) {
        showMessage('Member data not loaded. Please refresh the page.', 'error');
        return;
    }
    
    const member = members.find(m => m.member_id === memberId);
    if (!member) {
        showMessage('Member not found', 'error');
        return;
    }
    
    isEditingMode = true;
    resetBranchOverride();
    
    document.getElementById("editMemberId").value = member.member_id || "";
    document.getElementById("firstname").value = member.firstname || "";
    document.getElementById("middlename").value = member.middlename || "";
    document.getElementById("surname").value = member.surname || "";
    document.getElementById("pin").value = member.pin || "";
    document.getElementById("gender").value = member.gender || "Male";
    document.getElementById("contact").value = member.contact || "";
    document.getElementById("contact2").value = member.contact2 || "";
    
    const dobField = document.getElementById("date_of_birth");
    if (dobField) {
        dobField.value = formatDateForInput(member.date_of_birth);
    }
    
    document.getElementById("join_method").value = member.join_method || "";
    
    const branchLevelInput = document.getElementById('branch_level');
    const branchInput = document.getElementById('branch');
    const branchLevelText = document.getElementById('branch_level_text');
    const branchText = document.getElementById('branch_text');
    
    const memberBranchLevel = member.branch_level || '';
    const memberBranch = member.branch || '';
    
    if (branchLevelInput) branchLevelInput.value = memberBranchLevel;
    if (branchInput) branchInput.value = memberBranch;
    
    const levelLabels = { main: 'Main Branch', sub: 'Sub-Branch' };
    if (branchLevelText) {
        branchLevelText.textContent = memberBranchLevel ? (levelLabels[memberBranchLevel] || memberBranchLevel) : 'Not specified';
    }
    if (branchText) {
        branchText.textContent = memberBranch || 'Not specified';
    }
    
    if (memberBranchLevel && (memberBranchLevel === 'main' || memberBranchLevel === 'sub')) {
        populateBranchOptions(memberBranchLevel);
        setTimeout(() => {
            const branchSelect = document.getElementById("branch");
            if (branchSelect && memberBranch) {
                branchSelect.value = memberBranch;
            }
        }, 50);
    } else {
        populateBranchOptions("");
    }
    
    const baptismField = document.getElementById("date_of_baptism");
    if (baptismField) {
        baptismField.value = formatDateForInput(member.date_of_baptism);
    }
    
    document.getElementById("residential_address").value = member.residential_address || "";
    document.getElementById("kganya_member").value = member.kganya_member || "";
    document.getElementById("kganya_book_number").value = member.kganya_book_number || "";
    document.getElementById("church_activity").value = member.church_activity || "";
    
    document.getElementById("nok_firstname").value = member.nok_firstname || "";
    document.getElementById("nok_surname").value = member.nok_surname || "";
    document.getElementById("nok_contact").value = member.nok_contact || "";
    document.getElementById("nok_relationship").value = member.nok_relationship || "";
    
    const inCommittee = member.in_executive_committee === true || member.in_executive_committee === 1 || member.in_executive_committee === "yes";
    document.getElementById("in_executive_committee").checked = inCommittee;
    
    if (inCommittee) {
        const committeeGroup = document.getElementById('executive_committee_group');
        const roleGroup = document.getElementById('executive_committee_role_group');
        if (committeeGroup) committeeGroup.style.display = 'block';
        if (roleGroup) roleGroup.style.display = 'block';
    } else {
        const committeeGroup = document.getElementById('executive_committee_group');
        const roleGroup = document.getElementById('executive_committee_role_group');
        if (committeeGroup) committeeGroup.style.display = 'none';
        if (roleGroup) roleGroup.style.display = 'none';
    }
    
    document.getElementById("executive_committee").value = member.executive_committee || "";
    document.getElementById("executive_committee_role").value = member.executive_committee_role || "";
    
    document.getElementById("employment_status").value = member.employment_status || "";
    document.getElementById("occupation").value = member.occupation || "";
    document.getElementById("education_level").value = member.education_level || "";
    document.getElementById("highest_certification").value = member.highest_certification || "";
    document.getElementById("qualification").value = member.qualification || "";
    document.getElementById("skills").value = member.skills || "";
    document.getElementById("formally_trained_on_skills").value = member.formally_trained_on_skills || "";
    
    document.getElementById("registerModalTitle").innerHTML = '<i class="fas fa-edit"></i> Edit Member';
    currentStep = 1;
    showStep(1);
    document.getElementById("registerModal").style.display = "flex";
    
    setTimeout(() => {
        emptyFieldHighlightingActive = true;
        highlightEmptyFields();
        addEmptyFieldsToggleButton();
    }, 300);
}

// ========== COMMITTEE FUNCTIONS ==========
function setupCommitteeListener() {
    const committeeCheckbox = document.getElementById('in_executive_committee');
    if (committeeCheckbox) {
        committeeCheckbox.removeEventListener('change', handleCommitteeChange);
        committeeCheckbox.addEventListener('change', handleCommitteeChange);
    }
}

function handleCommitteeChange() {
    const committeeGroup = document.getElementById('executive_committee_group');
    const roleGroup = document.getElementById('executive_committee_role_group');
    if (this.checked) {
        if (committeeGroup) committeeGroup.style.display = 'block';
        if (roleGroup) roleGroup.style.display = 'block';
    } else {
        if (committeeGroup) committeeGroup.style.display = 'none';
        if (roleGroup) roleGroup.style.display = 'none';
        const execCommittee = document.getElementById('executive_committee');
        const execRole = document.getElementById('executive_committee_role');
        if (execCommittee) execCommittee.value = '';
        if (execRole) execRole.value = '';
    }
}

// ========== SAVE FUNCTIONS ==========
let saveButtonOriginalText = '';

function setSaveButtonLoading(loading, isEditing = false) {
    const saveBtn = document.getElementById('saveBtn');
    if (!saveBtn) return;
    
    if (loading) {
        if (!saveButtonOriginalText) {
            saveButtonOriginalText = saveBtn.innerHTML;
        }
        saveBtn.disabled = true;
        const actionText = isEditing ? 'Updating' : 'Saving';
        saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>${actionText} Member...`;
    } else {
        saveBtn.disabled = false;
        saveBtn.innerHTML = saveButtonOriginalText || '<i class="fas fa-save"></i> Save Member';
    }
}

function setDeleteButtonLoading(loading) {
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    if (!confirmDeleteBtn) return;
    
    if (loading) {
        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Deleting...';
    } else {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.innerHTML = 'Permanently Delete';
    }
}

// ========== FORM SUBMIT ==========
const memberForm = document.getElementById("memberForm");
if (memberForm) {
    memberForm.addEventListener("submit", async function(e){
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn && saveBtn.disabled) {
            return;
        }
        
        syncBranchOverrideBeforeSave();
        
        const nokContact = document.getElementById("nok_contact")?.value.trim();
        if (nokContact && !validateContactNumber(nokContact, 'Next of kin contact number')) {
            return;
        }
        
        const id = document.getElementById("editMemberId").value;
        const isEditing = !!id;
        
        setSaveButtonLoading(true, isEditing);
        
        const memberData = {
            firstname: document.getElementById("firstname")?.value.trim() || "",
            middlename: document.getElementById("middlename")?.value.trim() || "",
            surname: document.getElementById("surname")?.value.trim() || "",
            pin: document.getElementById("pin")?.value.trim() || "",
            date_of_birth: document.getElementById("date_of_birth")?.value || "",
            gender: document.getElementById("gender")?.value || "",
            contact: document.getElementById("contact")?.value.trim() || "",
            contact2: document.getElementById("contact2")?.value.trim() || "",
            branch_level: document.getElementById("branch_level")?.value || "",
            branch: document.getElementById("branch")?.value || "",
            join_method: document.getElementById("join_method")?.value || "",
            date_of_baptism: document.getElementById("date_of_baptism")?.value || "",
            residential_address: document.getElementById("residential_address")?.value || "",
            kganya_member: document.getElementById("kganya_member")?.value || "",
            kganya_book_number: document.getElementById("kganya_book_number")?.value || "",
            church_activity: document.getElementById("church_activity")?.value || "",
            nok_firstname: document.getElementById("nok_firstname")?.value.trim() || "",
            nok_surname: document.getElementById("nok_surname")?.value.trim() || "",
            nok_contact: nokContact || "",
            nok_relationship: document.getElementById("nok_relationship")?.value || "",
            in_executive_committee: document.getElementById("in_executive_committee")?.checked || false,
            executive_committee: document.getElementById("executive_committee")?.value || "",
            executive_committee_role: document.getElementById("executive_committee_role")?.value || "",
            employment_status: document.getElementById("employment_status")?.value || "",
            occupation: document.getElementById("occupation")?.value || "",
            education_level: document.getElementById("education_level")?.value || "",
            highest_certification: document.getElementById("highest_certification")?.value || "",
            qualification: document.getElementById("qualification")?.value || "",
            skills: document.getElementById("skills")?.value || "",
            formally_trained_on_skills: document.getElementById("formally_trained_on_skills")?.value || ""
        };
        
        let result;
        try {
            if (id) {
                result = await api.updateMember(id, memberData);
            } else {
                result = await api.createMember(memberData);
            }
            
            if (result && result.success) {
                await loadInitialData();
                closeRegisterModal();
                showMessage(id ? "Member updated successfully!" : "Member registered successfully!", "success");
            } else {
                showMessage(result?.error || "Failed to save member. Please try again.", "error");
            }
        } catch (error) {
            console.error('Save error:', error);
            showMessage("An error occurred while saving. Please try again.", "error");
        } finally {
            setSaveButtonLoading(false);
        }
    });
}

// ========== DELETE FUNCTIONS ==========
function openDeleteModal(memberId) {
    if (!checkAdminPermission('delete')) {
        return;
    }
    
    const member = members.find(m => m.member_id === memberId);
    if (member) {
        memberToDelete = member;
        
        const deleteMemberInfo = document.getElementById('deleteMemberInfo');
        if (deleteMemberInfo) {
            deleteMemberInfo.innerHTML = `
                <div><strong>Full Name:</strong> ${escapeHtml(member.firstname)} ${escapeHtml(member.surname)}</div>
                <div><strong>PIN/ID:</strong> ${escapeHtml(member.pin)}</div>
                <div><strong>Contact:</strong> ${escapeHtml(member.contact || 'N/A')}</div>
                <div><strong>Branch:</strong> ${member.branch || 'N/A'}</div>
            `;
        }
        
        const confirmationInput = document.getElementById('deleteConfirmationInput');
        if (confirmationInput) confirmationInput.value = '';
        
        const deleteModal = document.getElementById('deleteModal');
        if (deleteModal) deleteModal.style.display = 'flex';
    }
}

async function confirmDelete() {
    if (!checkAdminPermission('delete')) {
        closeDeleteModal();
        return;
    }
    
    const confirmationText = document.getElementById('deleteConfirmationInput');
    if (!confirmationText || confirmationText.value !== 'CONFIRM DELETE') {
        showMessage('Please type "CONFIRM DELETE" to proceed with deletion', 'error');
        return;
    }
    
    if (memberToDelete) {
        setDeleteButtonLoading(true);
        
        const result = await api.deleteMember(memberToDelete.member_id);
        
        setDeleteButtonLoading(false);
        
        if (result && result.success) {
            showMessage(`${memberToDelete.firstname} ${memberToDelete.surname} has been permanently deleted.`, 'success');
            closeDeleteModal();
            await loadInitialData();
            memberToDelete = null;
        } else {
            showMessage(result?.error || "Failed to delete member. Please try again.", "error");
        }
    }
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.style.display = 'none';
    memberToDelete = null;
}

// ========== UTILITY FUNCTIONS ==========
function showMessage(msg, type) {
    const container = document.getElementById("errorMessageContainer");
    const span = document.getElementById("errorText");
    
    if (!container || !span) {
        alert(msg);
        return;
    }
    
    span.innerText = msg;
    container.style.display = "block";
    
    if(type === "success") {
        container.style.background = "#d1e7dd";
        container.style.color = "#0f5132";
        container.style.borderLeft = "4px solid #198754";
    } else {
        container.style.background = "#f8d7da";
        container.style.color = "#a71d2a";
        container.style.borderLeft = "4px solid #dc3545";
    }
    
    setTimeout(() => { 
        container.style.display = "none"; 
    }, 5000);
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

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
    const searchBtn = document.getElementById("searchBtn");
    const resetBtn = document.getElementById("resetBtn");
    const openRegisterBtn = document.getElementById("openRegisterModalBtn");
    const closeRegisterBtn = document.getElementById("closeRegisterModalBtn");
    const cancelFormBtn = document.getElementById("cancelFormBtn");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    const closeDeleteBtn = document.getElementById("closeDeleteModalBtn");
    const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    const searchInput = document.getElementById("globalSearchInput");
    
    if (searchBtn) {
        searchBtn.addEventListener("click", function(e) {
            e.preventDefault();
            applySearchAndRender();
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener("click", function(e) {
            e.preventDefault();
            resetSearch();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener("keypress", function(e) {
            if (e.key === "Enter") {
                e.preventDefault();
                applySearchAndRender();
            }
        });
    }
    
    if (openRegisterBtn) {
        openRegisterBtn.addEventListener("click", openRegisterModal);
    }
    
    if (closeRegisterBtn) closeRegisterBtn.addEventListener("click", closeRegisterModal);
    if (cancelFormBtn) cancelFormBtn.addEventListener("click", closeRegisterModal);
    if (prevBtn) prevBtn.addEventListener("click", prevStep);
    if (nextBtn) nextBtn.addEventListener("click", nextStep);
    if (closeDeleteBtn) closeDeleteBtn.addEventListener("click", closeDeleteModal);
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", confirmDelete);
    
    setupBranchLevelListener();
    setupCommitteeListener();
    setupBranchOverrideToggle();
    
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.custom-modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
}

// ========== EMPTY FIELD HIGHLIGHTING FUNCTIONS ==========
let emptyFieldHighlightingActive = true;

function highlightEmptyFields() {
    if (!emptyFieldHighlightingActive) return;
    
    const modal = document.getElementById('registerModal');
    if (!modal || modal.style.display !== 'flex') return;
    
    const formFields = modal.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]), select, textarea');
    
    clearEmptyFieldHighlights();
    
    formFields.forEach(field => {
        if (field.disabled) return;
        if (field.type === 'checkbox') return;
        
        let isEmpty = false;
        const fieldValue = field.value;
        
        if (field.tagName === 'SELECT') {
            isEmpty = !fieldValue || fieldValue === '';
        } else if (field.tagName === 'TEXTAREA') {
            isEmpty = !fieldValue || fieldValue.trim() === '';
        } else {
            isEmpty = !fieldValue || fieldValue.trim() === '';
        }
        
        if (isEmpty) {
            field.classList.add('empty-field-highlight');
            
            const isRequired = field.hasAttribute('required') || 
                              field.closest('.form-group-modern')?.querySelector('label')?.innerHTML.includes('*');
            
            if (isRequired) {
                field.classList.add('empty-field-critical');
            }
            
            field.removeEventListener('input', removeHighlightOnFill);
            field.removeEventListener('change', removeHighlightOnFill);
            field.addEventListener('input', removeHighlightOnFill);
            field.addEventListener('change', removeHighlightOnFill);
        }
    });
}

function removeHighlightOnFill(event) {
    const field = event.target;
    let isEmpty = false;
    
    if (field.tagName === 'SELECT') {
        isEmpty = !field.value || field.value === '';
    } else if (field.tagName === 'TEXTAREA') {
        isEmpty = !field.value || field.value.trim() === '';
    } else {
        isEmpty = !field.value || field.value.trim() === '';
    }
    
    if (!isEmpty) {
        field.classList.remove('empty-field-highlight');
        field.classList.remove('empty-field-critical');
        setTimeout(() => {
            highlightEmptyFields();
        }, 50);
    }
}

function clearEmptyFieldHighlights() {
    const modal = document.getElementById('registerModal');
    if (!modal) return;
    
    const highlightedFields = modal.querySelectorAll('.empty-field-highlight');
    highlightedFields.forEach(field => {
        field.classList.remove('empty-field-highlight');
        field.classList.remove('empty-field-critical');
    });
}

function toggleEmptyFieldHighlighting() {
    emptyFieldHighlightingActive = !emptyFieldHighlightingActive;
    const toggleBtn = document.getElementById('toggleEmptyFieldsBtn');
    
    if (emptyFieldHighlightingActive) {
        highlightEmptyFields();
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Empty Fields';
        }
    } else {
        clearEmptyFieldHighlights();
        if (toggleBtn) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Show Empty Fields';
        }
    }
}

function validateAndHighlightBeforeSave() {
    let allValid = true;
    
    for (let step = 1; step <= totalSteps; step++) {
        if (!validateCurrentSection(step)) {
            allValid = false;
            showStep(step);
            break;
        }
    }
    
    if (!allValid) {
        highlightEmptyFields();
        showMessage('Please fill in all highlighted fields before saving.', 'error');
        return false;
    }
    
    return true;
}

function addEmptyFieldsToggleButton() {
    const navigationButtons = document.querySelector('.navigation-buttons');
    if (!navigationButtons) return;
    
    if (document.getElementById('toggleEmptyFieldsBtn')) return;
    
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggleEmptyFieldsBtn';
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn-secondary-modal';
    toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Empty Fields';
    toggleBtn.onclick = toggleEmptyFieldHighlighting;
    toggleBtn.style.marginRight = 'auto';
    
    navigationButtons.insertBefore(toggleBtn, navigationButtons.firstChild);
}

// ========== INITIALIZATION ==========
async function init() {
    console.log("Initializing Register Page...");
    await loadInitialData();
    updateCurrentYear();
    setupEventListeners();
    populateBranchOptions("");
    console.log("Register Page Ready");
}

init();