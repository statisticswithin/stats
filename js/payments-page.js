// ========== PAYMENTS PAGE - MAIN APPLICATION ==========
// Manages member payments for trips, services, and church activities

// Global variables
let members = [];
let payments = [];
let currentSelectedMember = null;
let currentSelectedTrip = null;
let currentFilterTrip = '';
let currentFilterDate = '';

// Service/Trip types and their default amounts
const SERVICE_TYPES = {
    'funeral': { name: 'Funeral', defaultAmount: 100 },
    'lekgotla': { name: 'Lekgotla', defaultAmount: 100 },
    'easters': { name: 'Easters', defaultAmount: 650 },
    'new_year': { name: 'New Year (Sept)', defaultAmount: 650 },
    'christmas': { name: 'Christmas', defaultAmount: 650 },
    'feela': { name: 'Feela (Umshanyelo)', defaultAmount: 650 }
};

// Payment types
const PAYMENT_TYPES = {
    'deposit': 'Deposit',
    'final': 'Final Payment',
    'full': 'Full Payment'
};

// ========== LOAD DATA FUNCTIONS ==========
async function loadData() {
    console.log('Loading data for payments...');
    showMessage('Loading data from server...', 'warning');
    
    try {
        if (typeof api === 'undefined' || !api) {
            console.error('API not available');
            showMessage('API not available. Please check your connection.', 'error');
            return;
        }
        
        const membersResult = await api.getMembers();
        
        if (membersResult.success && membersResult.data) {
            members = membersResult.data;
            console.log('Members loaded:', members.length);
        } else {
            console.warn('Failed to load members:', membersResult.error);
            members = [];
        }
        
        await loadPaymentsFromServer();
        
        if (members.length > 0) {
            showMessage(`Loaded ${members.length} members and ${payments.length} total payments`, 'success');
        } else {
            showMessage('No members found. Please add members first.', 'warning');
        }
        
        updatePaymentSummary();
        calculatePaymentStatistics();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading data. Please refresh the page.', 'error');
    }
}

async function loadPaymentsFromServer() {
    try {
        if (typeof api.getPayments === 'undefined') {
            console.warn('api.getPayments not available, using localStorage fallback');
            const storedPayments = localStorage.getItem('zcc_payments');
            payments = storedPayments ? JSON.parse(storedPayments) : [];
            payments = payments.map(p => ({
                ...p,
                member_id: String(p.member_id || p.memberId || ''),
                payment_amount: parseFloat(p.payment_amount) || parseFloat(p.amount) || 0,
                total_amount: parseFloat(p.total_amount) || 0
            }));
            return true;
        }
        
        const paymentsResult = await api.getPayments();
        
        if (paymentsResult.success && paymentsResult.data) {
            payments = paymentsResult.data.map(p => ({
                ...p,
                member_id: String(p.member_id || p.memberId || ''),
                payment_amount: parseFloat(p.payment_amount) || parseFloat(p.amount) || 0,
                total_amount: parseFloat(p.total_amount) || 0
            }));
            console.log(`Payments loaded: ${payments.length} total`);
            localStorage.setItem('zcc_payments', JSON.stringify(payments));
            return true;
        } else {
            console.warn('Failed to load payments:', paymentsResult.error);
            const storedPayments = localStorage.getItem('zcc_payments');
            payments = storedPayments ? JSON.parse(storedPayments) : [];
            payments = payments.map(p => ({
                ...p,
                member_id: String(p.member_id || p.memberId || ''),
                payment_amount: parseFloat(p.payment_amount) || parseFloat(p.amount) || 0,
                total_amount: parseFloat(p.total_amount) || 0
            }));
            return false;
        }
    } catch (error) {
        console.error('Error loading payments:', error);
        const storedPayments = localStorage.getItem('zcc_payments');
        payments = storedPayments ? JSON.parse(storedPayments) : [];
        payments = payments.map(p => ({
            ...p,
            member_id: String(p.member_id || p.memberId || ''),
            payment_amount: parseFloat(p.payment_amount) || parseFloat(p.amount) || 0,
            total_amount: parseFloat(p.total_amount) || 0
        }));
        return false;
    }
}

// ========== HELPER FUNCTIONS ==========
function getMemberPayments(memberId, serviceType = null) {
    const memberIdStr = String(memberId);
    let memberPayments = payments.filter(p => String(p.member_id) === memberIdStr);
    
    if (serviceType) {
        memberPayments = memberPayments.filter(p => p.service_type === serviceType);
    }
    
    return memberPayments;
}

function getMemberTotalPaid(memberId, serviceType = null) {
    const memberPayments = getMemberPayments(memberId, serviceType);
    return memberPayments.reduce((total, payment) => total + (parseFloat(payment.payment_amount || payment.amount) || 0), 0);
}

function getMemberTripStatus(memberId, serviceType) {
    const totalPaid = getMemberTotalPaid(memberId, serviceType);
    const totalAmount = SERVICE_TYPES[serviceType]?.defaultAmount || 0;
    const balance = totalAmount - totalPaid;
    
    if (totalPaid === 0) {
        return { status: 'not_deposited', text: 'No Deposit', class: 'status-no-deposit', balance: balance };
    } else if (totalPaid >= totalAmount) {
        return { status: 'fully_paid', text: 'Fully Paid', class: 'status-fully-paid', balance: 0 };
    } else {
        return { status: 'deposited', text: `Deposited: ${formatCurrency(totalPaid)}`, class: 'status-partial', balance: balance };
    }
}

function formatCurrency(amount) {
    if (isNaN(amount) || amount === null || amount === undefined) {
        return 'R0.00';
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
        return 'R0.00';
    }
    return 'R' + numAmount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========== SEARCH AND FILTER FUNCTIONS ==========
function searchMembers() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        showMessage('Please enter a search term', 'error');
        return;
    }

    // Get the current trip filter value
    const tripFilterValue = document.getElementById('tripFilter')?.value || '';
    
    let filtered = members.filter(m => {
        const firstname = m.firstname ? String(m.firstname).toLowerCase() : '';
        const middlename = m.middlename ? String(m.middlename).toLowerCase() : '';
        const surname = m.surname ? String(m.surname).toLowerCase() : '';
        const pin = m.pin ? String(m.pin).toLowerCase() : '';
        const contact = m.contact ? String(m.contact).toLowerCase() : '';
        
        const matchesSearch = firstname.includes(searchTerm) ||
            middlename.includes(searchTerm) ||
            surname.includes(searchTerm) ||
            pin.includes(searchTerm) ||
            contact.includes(searchTerm);
        
        if (!matchesSearch) return false;
        
        // Apply trip filter if one is selected
        if (tripFilterValue && tripFilterValue !== '') {
            const memberId = String(m.member_id || m.id);
            const memberPayments = getMemberPayments(memberId, tripFilterValue);
            const totalPaid = memberPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
            // Only show members who have made at least one payment for this trip
            return totalPaid > 0;
        }
        
        return true;
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
            const memberId = member.member_id || member.id;
            
            return `
                <div class="member-card" data-member-id="${memberId}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(member.firstname)} ${escapeHtml(member.surname)}</strong>
                            <br>
                            <small class="text-muted">
                                <i class="fas fa-id-card"></i> ${member.pin || 'N/A'} | 
                                <i class="fas fa-phone"></i> ${member.contact || 'N/A'}
                                ${member.gender ? `| <i class="fas fa-venus-mars"></i> ${escapeHtml(member.gender)}` : ''}
                            </small>
                        </div>
                        <div>
                            <button class="btn-view-payment view-payments-btn" data-member-id="${memberId}">
                                <i class="fas fa-history"></i> View Payments
                            </button>
                            <button class="btn-payment make-payment-btn" data-member-id="${memberId}">
                                <i class="fas fa-money-bill-wave"></i> Make Payment
                            </button>
                        </div>
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

function applyFilters() {
    const tripFilter = document.getElementById('tripFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    currentFilterTrip = tripFilter ? tripFilter.value : '';
    currentFilterDate = dateFilter ? dateFilter.value : '';
    
    // Update statistics based on filters
    calculatePaymentStatistics();
    displayRecentPayments();
}

function resetFilters() {
    const tripFilter = document.getElementById('tripFilter');
    const dateFilter = document.getElementById('dateFilter');
    
    if (tripFilter) tripFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    
    currentFilterTrip = '';
    currentFilterDate = '';
    
    calculatePaymentStatistics();
    displayRecentPayments();
}

// ========== PAYMENT STATISTICS FUNCTIONS (Filtered by Trip and Date) ==========
function calculatePaymentStatistics() {
    // Filter payments by selected trip and date
    let filteredPayments = [...payments];
    
    if (currentFilterTrip) {
        filteredPayments = filteredPayments.filter(p => p.service_type === currentFilterTrip);
    }
    
    if (currentFilterDate) {
        filteredPayments = filteredPayments.filter(p => p.payment_date === currentFilterDate);
    }
    
    // Calculate totals from filtered payments
    const totalPaymentsAmount = filteredPayments.reduce((sum, p) => sum + (p.payment_amount || 0), 0);
    const uniqueMembersWithPayments = new Set(filteredPayments.map(p => String(p.member_id))).size;
    
    // Calculate trip-specific totals
    let eastersTotal = 0, newYearTotal = 0, christmasTotal = 0, lekgotlaTotal = 0, funeralTotal = 0, feelaTotal = 0;
    
    filteredPayments.forEach(p => {
        const amount = p.payment_amount || 0;
        switch(p.service_type) {
            case 'easters': eastersTotal += amount; break;
            case 'new_year': newYearTotal += amount; break;
            case 'christmas': christmasTotal += amount; break;
            case 'lekgotla': lekgotlaTotal += amount; break;
            case 'funeral': funeralTotal += amount; break;
            case 'feela': feelaTotal += amount; break;
        }
    });
    
    // Calculate pending amounts - ONLY for members who have made payments
    let totalPendingAmount = 0;
    let fullyPaidCount = 0;
    let notDepositedCount = 0;
    let partialPaymentCount = 0;
    
    if (currentFilterTrip && currentFilterTrip !== '') {
        // SPECIFIC TRIP FILTER IS APPLIED - Calculate pending amount
        const tripAmount = SERVICE_TYPES[currentFilterTrip]?.defaultAmount || 0;
        
        // Track payments per member for this specific trip
        const memberPaidAmounts = new Map();
        
        filteredPayments.forEach(p => {
            const memberId = String(p.member_id);
            const currentPaid = memberPaidAmounts.get(memberId) || 0;
            memberPaidAmounts.set(memberId, currentPaid + (p.payment_amount || 0));
        });
        
        // Calculate ONLY for members who have made payments for this trip
        memberPaidAmounts.forEach((paidAmount, memberId) => {
            const pendingAmount = tripAmount - paidAmount;
            
            // Add to total pending amount (positive balance only)
            if (pendingAmount > 0) {
                totalPendingAmount += pendingAmount;
            }
            
            // Count member status for this trip
            if (paidAmount >= tripAmount && tripAmount > 0) {
                fullyPaidCount++;
            } else if (paidAmount > 0 && paidAmount < tripAmount) {
                partialPaymentCount++;
            }
        });
        
        // Count members with no deposit (members who exist but have no payment records for this specific trip)
        notDepositedCount = members.length - memberPaidAmounts.size;
        
    } else {
        // NO TRIP FILTER (ALL TRIPS) - Set pending amount to ZERO
        totalPendingAmount = 0;
        
        // Still need to calculate counts for display
        const memberTotalPaid = new Map();
        
        // Sum up all payments for each member (across all trips)
        payments.forEach(payment => {
            const memberId = String(payment.member_id);
            const currentPaid = memberTotalPaid.get(memberId) || 0;
            memberTotalPaid.set(memberId, currentPaid + (payment.payment_amount || 0));
        });
        
        // Count member statuses for all trips
        memberTotalPaid.forEach((totalPaid, memberId) => {
            // Check if this member is fully paid across all trips
            let isFullyPaid = true;
            let hasAnyPayment = false;
            
            for (const [serviceType, serviceData] of Object.entries(SERVICE_TYPES)) {
                const tripPaid = getMemberTotalPaid(memberId, serviceType);
                const tripAmount = serviceData.defaultAmount;
                
                if (tripPaid > 0) {
                    hasAnyPayment = true;
                }
                
                if (tripPaid < tripAmount) {
                    isFullyPaid = false;
                }
            }
            
            if (isFullyPaid && totalPaid > 0) {
                fullyPaidCount++;
            } else if (hasAnyPayment && !isFullyPaid) {
                partialPaymentCount++;
            }
        });
        
        // Count members with no deposits (members who have NEVER made any payment)
        notDepositedCount = members.length - memberTotalPaid.size;
    }
    
    // Update UI elements
    const totalPaymentsElement = document.getElementById('totalPayments');
    const membersWithPaymentsElement = document.getElementById('membersWithPayments');
    const eastersTotalElement = document.getElementById('eastersTotal');
    const newYearTotalElement = document.getElementById('newYearTotal');
    const otherTotalElement = document.getElementById('otherTotal');
    const totalOwedElement = document.getElementById('totalOwedAmount');
    const fullyPaidElement = document.getElementById('fullyPaidCount');
    const notDepositedElement = document.getElementById('notDepositedCount');
    const partialElement = document.getElementById('partialPaymentCount');
    
    if (totalPaymentsElement) totalPaymentsElement.textContent = formatCurrency(totalPaymentsAmount);
    if (membersWithPaymentsElement) membersWithPaymentsElement.textContent = uniqueMembersWithPayments;
    if (eastersTotalElement) eastersTotalElement.textContent = formatCurrency(eastersTotal);
    if (newYearTotalElement) newYearTotalElement.textContent = formatCurrency(newYearTotal);
    if (otherTotalElement) otherTotalElement.textContent = formatCurrency(christmasTotal + lekgotlaTotal + funeralTotal + feelaTotal);
    if (totalOwedElement) totalOwedElement.textContent = formatCurrency(totalPendingAmount);
    if (fullyPaidElement) fullyPaidElement.textContent = fullyPaidCount;
    if (notDepositedElement) notDepositedElement.textContent = notDepositedCount;
    if (partialElement) partialElement.textContent = partialPaymentCount;
}

// ========== MEMBER PAYMENT STATUS REPORT (3 Filters: Trip, Gender, Payment Status) ==========
function generatePaymentStatusReport() {
    const tripFilter = document.getElementById('reportTripFilter')?.value || '';
    const genderFilter = document.getElementById('reportGenderFilter')?.value || '';
    
    // Get selected payment statuses (multi-select)
    const paymentStatusSelect = document.getElementById('reportPaymentStatusFilter');
    const selectedStatuses = paymentStatusSelect ? Array.from(paymentStatusSelect.selectedOptions).map(opt => opt.value) : [];
    
    console.log('Generating report with filters:', { tripFilter, genderFilter, selectedStatuses });
    
    let reportData = [];
    
    members.forEach(member => {
        const memberId = String(member.member_id || member.id);
        const memberGender = (member.gender || '').toLowerCase();
        
        // Apply gender filter
        if (genderFilter && memberGender !== genderFilter.toLowerCase()) {
            return;
        }
        
        if (tripFilter && tripFilter !== '') {
            // Trip-specific report
            const tripData = SERVICE_TYPES[tripFilter];
            if (!tripData) return;
            
            const totalPaid = getMemberTotalPaid(memberId, tripFilter);
            const totalAmount = tripData.defaultAmount;
            const balance = totalAmount - totalPaid;
            let paymentStatus = '';
            
            if (totalPaid === 0) {
                paymentStatus = 'no_deposit';
            } else if (totalPaid >= totalAmount) {
                paymentStatus = 'fully_paid';
            } else {
                paymentStatus = 'deposited';
            }
            
            // Apply payment status filter - only show if status is in selected list
            if (selectedStatuses.length > 0 && !selectedStatuses.includes(paymentStatus)) {
                return;
            }
            
            // Skip no_deposit entries when filters are applied
            if (paymentStatus === 'no_deposit') {
                return;
            }
            
            reportData.push({
                member_id: memberId,
                name: `${member.firstname || ''} ${member.surname || ''}`.trim(),
                gender: member.gender || 'Not specified',
                pin: member.pin || 'N/A',
                contact: member.contact || 'N/A',
                trip_name: tripData.name,
                trip_type: tripFilter,
                total_amount: totalAmount,
                total_paid: totalPaid,
                balance: balance,
                status: paymentStatus,
                statusText: paymentStatus === 'fully_paid' ? 'Fully Paid' : (paymentStatus === 'deposited' ? 'Deposit Made' : 'No Deposit'),
                statusClass: paymentStatus === 'fully_paid' ? 'status-fully-paid' : (paymentStatus === 'deposited' ? 'status-partial' : 'status-no-deposit')
            });
        } else {
            // All trips - show each trip for the member
            for (const [serviceType, serviceData] of Object.entries(SERVICE_TYPES)) {
                const totalPaid = getMemberTotalPaid(memberId, serviceType);
                const totalAmount = serviceData.defaultAmount;
                const balance = totalAmount - totalPaid;
                let paymentStatus = '';
                
                if (totalPaid === 0) {
                    paymentStatus = 'no_deposit';
                } else if (totalPaid >= totalAmount) {
                    paymentStatus = 'fully_paid';
                } else {
                    paymentStatus = 'deposited';
                }
                
                // Apply payment status filter
                if (selectedStatuses.length > 0 && !selectedStatuses.includes(paymentStatus)) {
                    continue;
                }
                
                // Skip no_deposit entries when filters are applied
                if (paymentStatus === 'no_deposit') {
                    continue;
                }
                
                reportData.push({
                    member_id: memberId,
                    name: `${member.firstname || ''} ${member.surname || ''}`.trim(),
                    gender: member.gender || 'Not specified',
                    pin: member.pin || 'N/A',
                    contact: member.contact || 'N/A',
                    trip_name: serviceData.name,
                    trip_type: serviceType,
                    total_amount: totalAmount,
                    total_paid: totalPaid,
                    balance: balance,
                    status: paymentStatus,
                    statusText: paymentStatus === 'fully_paid' ? 'Fully Paid' : (paymentStatus === 'deposited' ? 'Deposit Made' : 'No Deposit'),
                    statusClass: paymentStatus === 'fully_paid' ? 'status-fully-paid' : (paymentStatus === 'deposited' ? 'status-partial' : 'status-no-deposit')
                });
            }
        }
    });
    
    console.log('Report data generated:', reportData.length, 'rows');
    return reportData;
}

function showPaymentStatusReport() {
    console.log('Opening Payment Status Report Modal');
    const modal = document.getElementById('paymentStatusModal');
    if (!modal) {
        console.error('Modal not found!');
        return;
    }
    
    modal.style.display = 'flex';
    modal.style.zIndex = '1000';
    
    // Clear previous filters or set defaults
    const tripFilter = document.getElementById('reportTripFilter');
    const genderFilter = document.getElementById('reportGenderFilter');
    const paymentStatusFilter = document.getElementById('reportPaymentStatusFilter');
    
    if (tripFilter) tripFilter.value = '';
    if (genderFilter) genderFilter.value = '';
    if (paymentStatusFilter) paymentStatusFilter.value = '';
    
    // Load initial empty state
    const tbody = document.getElementById('paymentStatusTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">Select filters and click Apply Filters to see results...</td></tr>';
    }
}

function loadPaymentStatusTable() {
    console.log('Loading payment status table with filters');
    const reportData = generatePaymentStatusReport();
    const tbody = document.getElementById('paymentStatusTableBody');
    
    if (!tbody) {
        console.error('Table body not found!');
        return;
    }
    
    if (reportData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">No members found matching the selected filters</td></tr>';
        return;
    }
    
    tbody.innerHTML = reportData.map(member => `
        <tr>
            <td><strong>${escapeHtml(member.name)}</strong></td>
            <td>${escapeHtml(member.gender)}</td>
            <td>${escapeHtml(member.pin)}</td>
            <td>${escapeHtml(member.contact)}</td>
            <td>${escapeHtml(member.trip_name)}</td>
            <td class="payment-amount">${formatCurrency(member.total_amount)}</td>
            <td class="payment-amount">${formatCurrency(member.total_paid)}</td>
            <td class="payment-amount">${member.balance > 0 ? formatCurrency(member.balance) : 'R0.00'}</td>
            <td><span class="status-badge ${member.statusClass}">${member.statusText}</span></td>
            <td>
                <button class="btn-view-payment-mini" onclick="viewMemberPaymentsForTrip('${member.member_id}', '${member.trip_type}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        </tr>
    `).join('');
}

function viewMemberPaymentsForTrip(memberId, tripType) {
    console.log('Viewing payments for member:', memberId, 'trip:', tripType);
    closePaymentStatusModal();
    viewMemberPayments(memberId, tripType);
}

function exportPaymentReportToCSV() {
    const reportData = generatePaymentStatusReport();
    
    if (reportData.length === 0) {
        showMessage('No data to export', 'error');
        return;
    }
    
    const headers = ['Name', 'Gender', 'PIN', 'Contact', 'Trip', 'Total Amount', 'Total Paid', 'Balance', 'Status'];
    
    const csvRows = [headers];
    
    reportData.forEach(member => {
        const row = [
            member.name,
            member.gender,
            member.pin,
            member.contact,
            member.trip_name,
            member.total_amount,
            member.total_paid,
            member.balance,
            member.statusText
        ];
        csvRows.push(row);
    });
    
    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showMessage('Report exported successfully!', 'success');
}

function closePaymentStatusModal() {
    const modal = document.getElementById('paymentStatusModal');
    if (modal) modal.style.display = 'none';
}

function applyReportFilters() {
    console.log('Apply Filters button clicked');
    loadPaymentStatusTable();
}
// ========== PAYMENT MODAL FUNCTIONS ==========
function openPaymentModal(memberId, closeViewModal = false, preSelectedTrip = null, existingBalance = null, existingTotalAmount = null) {
    console.log('openPaymentModal called with memberId:', memberId, 'preSelectedTrip:', preSelectedTrip);
    
    if (closeViewModal) {
        closeViewPaymentsModal();
    }
    
    const memberIdStr = String(memberId);
    const member = members.find(m => String(m.member_id || m.id) === memberIdStr);
    
    if (!member) {
        console.error('Member not found with ID:', memberId);
        showMessage('Member not found', 'error');
        return;
    }
    
    currentSelectedMember = member;
    document.getElementById('paymentMemberId').value = memberId;
    
    const isFinalPayment = preSelectedTrip && existingBalance !== null && existingBalance > 0;
    
    // Set available trips in dropdown (only trips that exist)
    const serviceSelect = document.getElementById('serviceType');
    if (serviceSelect) {
        // Clear existing options
        serviceSelect.innerHTML = '';
        
        // Add options for all trip types
        for (const [key, value] of Object.entries(SERVICE_TYPES)) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `${value.name} (R${value.defaultAmount})`;
            serviceSelect.appendChild(option);
        }
        
        if (preSelectedTrip) {
            serviceSelect.value = preSelectedTrip;
        }
        
        if (isFinalPayment) {
            serviceSelect.disabled = true;
            serviceSelect.style.opacity = '0.7';
            serviceSelect.style.cursor = 'not-allowed';
        } else {
            serviceSelect.disabled = false;
            serviceSelect.style.opacity = '1';
            serviceSelect.style.cursor = 'pointer';
        }
    }
    
    if (isFinalPayment) {
        const serviceName = SERVICE_TYPES[preSelectedTrip]?.name || preSelectedTrip;
        const modalTitle = document.getElementById('modalMemberName');
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="fas fa-user"></i> Final Payment for: ${member.firstname} ${member.surname} - ${serviceName}`;
        }
        
        const totalAmountSpan = document.getElementById('totalAmount');
        if (totalAmountSpan && existingTotalAmount) {
            totalAmountSpan.textContent = formatCurrency(existingTotalAmount);
        } else if (totalAmountSpan) {
            const amount = SERVICE_TYPES[preSelectedTrip]?.defaultAmount || 650;
            totalAmountSpan.textContent = formatCurrency(amount);
        }
        
        const customAmountDiv = document.getElementById('customAmount');
        if (customAmountDiv) customAmountDiv.style.display = 'none';
        
        const paymentAmountInput = document.getElementById('paymentAmount');
        if (paymentAmountInput) {
            paymentAmountInput.placeholder = `Enter payment amount (max ${formatCurrency(existingBalance)})`;
            paymentAmountInput.max = existingBalance;
        }
        
        const paymentTypeSelect = document.getElementById('paymentType');
        if (paymentTypeSelect) {
            paymentTypeSelect.value = 'final';
            paymentTypeSelect.disabled = true;
            paymentTypeSelect.style.opacity = '0.7';
            paymentTypeSelect.style.cursor = 'not-allowed';
        }
        
        const paymentDateInput = document.getElementById('paymentDate');
        if (paymentDateInput) {
            paymentDateInput.value = new Date().toISOString().split('T')[0];
        }
        
        const paymentNotesInput = document.getElementById('paymentNotes');
        if (paymentNotesInput) paymentNotesInput.value = '';
        
        const totalAmt = existingTotalAmount || SERVICE_TYPES[preSelectedTrip]?.defaultAmount || 650;
        const previouslyPaid = totalAmt - existingBalance;
        
        const balanceDisplay = document.getElementById('existingBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.style.display = 'block';
            balanceDisplay.innerHTML = `
                <div style="background: linear-gradient(135deg, rgba(231, 76, 60, 0.15) 0%, rgba(231, 76, 60, 0.05) 100%); border: 2px solid #e74c3c; border-radius: 12px; padding: 1rem; margin-top: 1rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
                        <i class="fas fa-info-circle" style="color: #e74c3c; font-size: 1.25rem;"></i>
                        <span style="color: #e74c3c; font-weight: 600;">Final Payment for ${escapeHtml(serviceName)}</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-top: 0.5rem;">
                        <div style="background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 8px;">
                            <div style="font-size: 0.7rem; color: #666;">Trip Total</div>
                            <div style="font-weight: 600; color: #2c3e50;">${formatCurrency(totalAmt)}</div>
                        </div>
                        <div style="background: rgba(0,0,0,0.05); padding: 0.5rem; border-radius: 8px;">
                            <div style="font-size: 0.7rem; color: #666;">Previously Paid</div>
                            <div style="font-weight: 600; color: #27ae60;">${formatCurrency(previouslyPaid)}</div>
                        </div>
                        <div style="background: rgba(231, 76, 60, 0.1); padding: 0.5rem; border-radius: 8px; grid-column: span 2;">
                            <div style="font-size: 0.7rem; color: #666;">Remaining Balance</div>
                            <div style="font-weight: 700; font-size: 1.1rem; color: #e74c3c;">${formatCurrency(existingBalance)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    } else {
        const modalTitle = document.getElementById('modalMemberName');
        if (modalTitle) {
            modalTitle.innerHTML = `<i class="fas fa-user"></i> Payment for: ${member.firstname} ${member.surname}`;
        }
        
        const paymentTypeSelect = document.getElementById('paymentType');
        if (paymentTypeSelect) {
            paymentTypeSelect.disabled = false;
            paymentTypeSelect.style.opacity = '1';
            paymentTypeSelect.style.cursor = 'pointer';
        }
        
        const customAmountDiv = document.getElementById('customAmount');
        if (customAmountDiv) customAmountDiv.style.display = 'none';
        
        const paymentAmountInput = document.getElementById('paymentAmount');
        if (paymentAmountInput) {
            paymentAmountInput.value = '';
            paymentAmountInput.readOnly = false;
            paymentAmountInput.max = '';
            paymentAmountInput.placeholder = 'Enter payment amount';
        }
        
        const paymentTypeSelect2 = document.getElementById('paymentType');
        if (paymentTypeSelect2) paymentTypeSelect2.value = 'deposit';
        
        const paymentDateInput = document.getElementById('paymentDate');
        if (paymentDateInput) paymentDateInput.value = new Date().toISOString().split('T')[0];
        
        const paymentNotesInput = document.getElementById('paymentNotes');
        if (paymentNotesInput) paymentNotesInput.value = '';
        
        updateTotalAmount();
        
        const balanceDisplay = document.getElementById('existingBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.style.display = 'none';
        }
    }
    
    const modal = document.getElementById('paymentModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = '1000';
    }
}

function updateTotalAmount() {
    const serviceType = document.getElementById('serviceType').value;
    const totalAmountSpan = document.getElementById('totalAmount');
    
    const amount = SERVICE_TYPES[serviceType]?.defaultAmount || 650;
    if (totalAmountSpan) totalAmountSpan.textContent = formatCurrency(amount);
    const paymentAmountInput = document.getElementById('paymentAmount');
    if (paymentAmountInput) {
        paymentAmountInput.placeholder = `Enter amount (max ${formatCurrency(amount)})`;
        paymentAmountInput.max = amount;
    }
}

function closePaymentModal() {
    const modal = document.getElementById('paymentModal');
    if (modal) modal.style.display = 'none';
    currentSelectedMember = null;
}

async function savePayment() {
    const memberId = document.getElementById('paymentMemberId').value;
    const serviceType = document.getElementById('serviceType').value;
    let paymentType = document.getElementById('paymentType').value;
    
    let totalAmount = SERVICE_TYPES[serviceType]?.defaultAmount || 650;
    
    const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
    if (!paymentAmount || paymentAmount <= 0) {
        showMessage('Please enter a valid payment amount', 'error');
        return;
    }
    
    if (paymentAmount > totalAmount) {
        showMessage(`Payment amount cannot exceed total amount of ${formatCurrency(totalAmount)}`, 'error');
        return;
    }
    
    const paymentDate = document.getElementById('paymentDate').value;
    if (!paymentDate) {
        showMessage('Please select a payment date', 'error');
        return;
    }
    
    const notes = document.getElementById('paymentNotes').value;
    
    const totalPaidSoFar = getMemberTotalPaid(memberId, serviceType);
    const newTotalPaid = totalPaidSoFar + paymentAmount;
    const remainingBalance = totalAmount - newTotalPaid;
    
    if (remainingBalance === 0) {
        paymentType = 'final';
    }
    
    const paymentData = {
        member_id: String(memberId),
        member_name: `${currentSelectedMember.firstname} ${currentSelectedMember.surname}`,
        service_type: serviceType,
        service_name: SERVICE_TYPES[serviceType]?.name || serviceType,
        total_amount: parseFloat(totalAmount),
        payment_amount: parseFloat(paymentAmount),
        payment_type: paymentType,
        payment_date: paymentDate,
        notes: notes,
        remaining_balance: remainingBalance,
        status: newTotalPaid >= totalAmount ? 'completed' : 'partial',
        created_at: new Date().toISOString()
    };
    
    console.log('Saving payment data:', paymentData);
    showMessage('Saving payment...', 'warning');
    
    try {
        let result;
        if (typeof api.createPayment !== 'undefined') {
            result = await api.createPayment(paymentData);
        } else {
            const existingPayments = localStorage.getItem('zcc_payments');
            let paymentsList = existingPayments ? JSON.parse(existingPayments) : [];
            const newPayment = {
                ...paymentData,
                payment_id: Date.now()
            };
            paymentsList.push(newPayment);
            localStorage.setItem('zcc_payments', JSON.stringify(paymentsList));
            result = { success: true, data: newPayment };
        }
        
        if (result && result.success) {
            const balanceMsg = remainingBalance > 0 ? ` Remaining balance: ${formatCurrency(remainingBalance)}` : ' Payment completed!';
            showMessage(`Payment of ${formatCurrency(paymentAmount)} recorded successfully!${balanceMsg}`, 'success');
            
            const newPayment = {
                payment_id: result.data?.payment_id || Date.now(),
                ...paymentData
            };
            payments.push(newPayment);
            
            localStorage.setItem('zcc_payments', JSON.stringify(payments));
            
            updatePaymentSummary();
            calculatePaymentStatistics();
            
            const searchResults = document.getElementById('searchResults');
            if (searchResults && searchResults.style.display === 'block') {
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value.trim()) {
                    searchMembers();
                }
            }
            
            closePaymentModal();
        } else {
            const errorMsg = result?.error || 'Could not save payment. Please check your connection.';
            showMessage('Error: ' + errorMsg, 'error');
        }
    } catch (error) {
        console.error('Exception in savePayment:', error);
        showMessage('Error: Network issue. Please check your connection and try again.', 'error');
    }
}

// ========== VIEW MEMBER PAYMENTS (Trip Specific) ==========
function viewMemberPayments(memberId, specificTrip = null) {
    console.log('viewMemberPayments called with memberId:', memberId, 'specificTrip:', specificTrip);
    
    const memberIdStr = String(memberId);
    const member = members.find(m => String(m.member_id || m.id) === memberIdStr);
    
    if (!member) {
        console.error('Member not found for view:', memberId);
        showMessage('Member not found', 'error');
        return;
    }
    
    currentSelectedMember = member;
    
    let memberPayments = payments.filter(p => String(p.member_id) === memberIdStr);
    
    if (specificTrip) {
        memberPayments = memberPayments.filter(p => p.service_type === specificTrip);
    }
    
    const paymentsByService = {};
    
    memberPayments.forEach(payment => {
        const key = payment.service_type;
        if (!paymentsByService[key]) {
            paymentsByService[key] = {
                service_name: payment.service_name || SERVICE_TYPES[key]?.name || key,
                total_amount: payment.total_amount || SERVICE_TYPES[key]?.defaultAmount || 0,
                payments: [],
                total_paid: 0
            };
        }
        paymentsByService[key].payments.push(payment);
        paymentsByService[key].total_paid += parseFloat(payment.payment_amount) || parseFloat(payment.amount) || 0;
    });
    
    let html = `
        <div class="member-info-section" style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid rgba(0,0,0,0.1);">
            <h5 style="color: #2c3e50; margin-bottom: 0.5rem;">
                <i class="fas fa-user-circle" style="color: #3498db;"></i> 
                ${escapeHtml(member.firstname)} ${escapeHtml(member.surname)}
            </h5>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap; font-size: 0.85rem; color: #666;">
                <span><i class="fas fa-id-card"></i> PIN: ${member.pin || 'N/A'}</span>
                <span><i class="fas fa-phone"></i> ${member.contact || 'N/A'}</span>
                ${member.gender ? `<span><i class="fas fa-venus-mars"></i> ${escapeHtml(member.gender)}</span>` : ''}
            </div>
        </div>
    `;
    
    if (Object.keys(paymentsByService).length === 0) {
        html += `
            <div class="empty-state" style="text-align: center; padding: 3rem; background: rgba(0,0,0,0.05); border-radius: 12px;">
                <i class="fas fa-receipt" style="font-size: 4rem; color: #bdc3c7; margin-bottom: 1rem;"></i>
                <p style="color: #7f8c8d;">No payment records found for this member.</p>
                <button class="btn-primary-modal" onclick="openPaymentModal('${memberId}', true)" style="margin-top: 1rem; padding: 0.75rem 1.5rem; border-radius: 8px; border: none; background: linear-gradient(135deg, #025205 0%, #013803 100%); color: white; cursor: pointer;">
                    <i class="fas fa-plus"></i> Record First Payment
                </button>
            </div>
        `;
    } else {
        let grandTotalPaid = 0;
        let grandTotalOwed = 0;
        
        for (const [serviceType, data] of Object.entries(paymentsByService)) {
            const totalPaid = data.total_paid;
            let totalAmount = data.total_amount;
            if (totalAmount === 0 || isNaN(totalAmount)) {
                totalAmount = SERVICE_TYPES[serviceType]?.defaultAmount || 650;
            }
            const balance = totalAmount - totalPaid;
            const isFullyPaid = totalPaid >= totalAmount;
            
            grandTotalPaid += totalPaid;
            grandTotalOwed += totalAmount;
            
            const statusColor = isFullyPaid ? '#27ae60' : (totalPaid > 0 ? '#e74c3c' : '#f39c12');
            const statusText = isFullyPaid ? 'FULLY PAID' : (totalPaid > 0 ? 'PARTIAL PAYMENT' : 'NO PAYMENT');
            const statusBg = isFullyPaid ? 'rgba(39, 174, 96, 0.1)' : (totalPaid > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(243, 156, 18, 0.1)');
            
            html += `
                <div class="payment-service-group" style="margin-bottom: 1.5rem; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="background: linear-gradient(135deg, #025205 0%, #013803 100%); padding: 0.75rem 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong style="font-size: 1rem; color: white;"><i class="fas fa-bus"></i> ${escapeHtml(data.service_name)}</strong>
                            </div>
                            <span style="background: ${statusBg}; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; color: ${statusColor}; border: 1px solid ${statusColor};">
                                ${statusText}
                            </span>
                        </div>
                    </div>
                    <div style="padding: 1rem;">
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 0.75rem; text-align: center;">
                                <div style="font-size: 0.7rem; color: #6c757d;">Total Amount</div>
                                <div style="font-size: 1.1rem; font-weight: 600; color: #2c3e50;">${formatCurrency(totalAmount)}</div>
                            </div>
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 0.75rem; text-align: center;">
                                <div style="font-size: 0.7rem; color: #6c757d;">Total Paid</div>
                                <div style="font-size: 1.1rem; font-weight: 600; color: #27ae60;">${formatCurrency(totalPaid)}</div>
                            </div>
                            <div style="background: #f8f9fa; border-radius: 8px; padding: 0.75rem; text-align: center;">
                                <div style="font-size: 0.7rem; color: #6c757d;">Balance</div>
                                <div style="font-size: 1.1rem; font-weight: 600; ${balance > 0 ? 'color: #e74c3c;' : 'color: #27ae60;'}">${balance > 0 ? formatCurrency(balance) : 'R0.00'}</div>
                            </div>
                        </div>
                        
                        <div>
                            <small style="color: #6c757d; display: block; margin-bottom: 0.75rem;">
                                <i class="fas fa-history"></i> Payment History
                            </small>
                            ${data.payments.sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date)).map(p => {
                                const paymentTypeColor = p.payment_type === 'deposit' ? '#f39c12' : (p.payment_type === 'final' ? '#e74c3c' : '#27ae60');
                                const paymentTypeBg = p.payment_type === 'deposit' ? 'rgba(243, 156, 18, 0.1)' : (p.payment_type === 'final' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(39, 174, 96, 0.1)');
                                const paymentTypeText = PAYMENT_TYPES[p.payment_type] || p.payment_type;
                                
                                return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; margin-bottom: 0.5rem; border-left: 4px solid ${paymentTypeColor};">
                                        <div>
                                            <span style="font-weight: 600; font-size: 1rem;">${formatCurrency(parseFloat(p.payment_amount) || parseFloat(p.amount) || 0)}</span>
                                            <br>
                                            <span style="font-size: 0.7rem; padding: 0.125rem 0.5rem; border-radius: 12px; background: ${paymentTypeBg}; color: ${paymentTypeColor};">
                                                ${paymentTypeText}
                                            </span>
                                        </div>
                                        <div style="text-align: right;">
                                            <div style="font-size: 0.8rem; color: #6c757d;">
                                                <i class="fas fa-calendar-alt"></i> ${formatDate(p.payment_date)}
                                            </div>
                                            ${p.notes ? `<div style="font-size: 0.7rem; color: #999; margin-top: 0.25rem;"><i class="fas fa-sticky-note"></i> ${escapeHtml(p.notes)}</div>` : ''}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        
                        ${balance > 0 ? `
                            <div style="margin-top: 1rem; text-align: center;">
                                <button class="btn-primary-modal" onclick="openPaymentModal('${memberId}', true, '${serviceType}', ${balance}, ${totalAmount})" style="padding: 0.5rem 1.5rem; border-radius: 8px; border: none; background: linear-gradient(135deg, #025205 0%, #013803 100%); color: white; cursor: pointer;">
                                    <i class="fas fa-money-bill-wave"></i> Make Final Payment (${formatCurrency(balance)} remaining)
                                </button>
                            </div>
                        ` : `
                            <div style="margin-top: 1rem; text-align: center;">
                                <span style="background: rgba(39, 174, 96, 0.1); color: #27ae60; padding: 0.5rem 1.5rem; border-radius: 8px; border: 1px solid #27ae60;">
                                    <i class="fas fa-check-circle"></i> This service is fully paid
                                </span>
                            </div>
                        `}
                    </div>
                </div>
            `;
        }
        
        if (!specificTrip) {
            const overallBalance = grandTotalOwed - grandTotalPaid;
            html += `
                <div style="margin-top: 1rem; padding: 1rem; background: linear-gradient(135deg, #025205 0%, #013803 100%); border-radius: 12px; text-align: center; color: white;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem;">
                        <div>
                            <div style="font-size: 0.7rem; opacity: 0.9;">Total Owed</div>
                            <div style="font-size: 1rem; font-weight: 600;">${formatCurrency(grandTotalOwed)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; opacity: 0.9;">Total Paid</div>
                            <div style="font-size: 1rem; font-weight: 600;">${formatCurrency(grandTotalPaid)}</div>
                        </div>
                        <div>
                            <div style="font-size: 0.7rem; opacity: 0.9;">Overall Balance</div>
                            <div style="font-size: 1rem; font-weight: 600;">${formatCurrency(overallBalance)}</div>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    const memberPaymentsList = document.getElementById('memberPaymentsList');
    const viewModal = document.getElementById('viewPaymentsModal');
    
    if (memberPaymentsList) {
        memberPaymentsList.innerHTML = html;
    }
    
    if (viewModal) {
        viewModal.style.display = 'flex';
        viewModal.style.zIndex = '999';
    }
}

function closeViewPaymentsModal() {
    const modal = document.getElementById('viewPaymentsModal');
    if (modal) modal.style.display = 'none';
    currentSelectedMember = null;
    currentSelectedTrip = null;
}

// ========== UI UPDATE FUNCTIONS ==========
function updatePaymentSummary() {
    displayRecentPayments();
}

function displayRecentPayments() {
    const paymentsListDiv = document.getElementById('paymentsList');
    if (!paymentsListDiv) return;
    
    let filteredPayments = [...payments];
    
    if (currentFilterTrip) {
        filteredPayments = filteredPayments.filter(p => p.service_type === currentFilterTrip);
    }
    
    if (currentFilterDate) {
        filteredPayments = filteredPayments.filter(p => p.payment_date === currentFilterDate);
    }
    
    const recentPayments = filteredPayments
        .sort((a, b) => {
            const dateA = new Date(a.created_at || a.payment_date);
            const dateB = new Date(b.created_at || b.payment_date);
            return dateB - dateA;
        })
        .slice(0, 5);
    
    if (recentPayments.length === 0) {
        paymentsListDiv.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt" style="font-size: 2rem;"></i>
                <p>No payments recorded yet</p>
            </div>
        `;
    } else {
        paymentsListDiv.innerHTML = recentPayments.map(payment => {
            const member = members.find(m => String(m.member_id || m.id) === String(payment.member_id));
            const memberName = member ? `${member.firstname} ${member.surname}` : payment.member_name;
            
            return `
                <div class="payment-card">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${escapeHtml(memberName)}</strong>
                            <br>
                            <small>
                                <i class="fas fa-tag"></i> ${escapeHtml(payment.service_name)}
                                <br>
                                <i class="fas fa-calendar"></i> ${formatDate(payment.payment_date)}
                            </small>
                        </div>
                        <div class="text-end">
                            <div style="font-weight: 600; color: #025205;">${formatCurrency(payment.payment_amount || payment.amount || 0)}</div>
                            <small>${PAYMENT_TYPES[payment.payment_type] || payment.payment_type}</small>
                        </div>
                    </div>
                    ${payment.notes ? `<small style="color: #999; display: block; margin-top: 0.5rem;"><i class="fas fa-sticky-note"></i> ${escapeHtml(payment.notes)}</small>` : ''}
                </div>
            `;
        }).join('');
    }
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

// ========== EVENT LISTENERS ==========
function attachDynamicEventListeners() {
    const makePaymentBtns = document.querySelectorAll('.make-payment-btn');
    makePaymentBtns.forEach(btn => {
        btn.removeEventListener('click', handleMakePaymentClick);
        btn.addEventListener('click', handleMakePaymentClick);
    });
    
    const viewPaymentsBtns = document.querySelectorAll('.view-payments-btn');
    viewPaymentsBtns.forEach(btn => {
        btn.removeEventListener('click', handleViewPaymentsClick);
        btn.addEventListener('click', handleViewPaymentsClick);
    });
}

function handleMakePaymentClick(e) {
    e.stopPropagation();
    const memberId = e.currentTarget.getAttribute('data-member-id');
    if (memberId) {
        openPaymentModal(memberId, false);
    }
}

function handleViewPaymentsClick(e) {
    e.stopPropagation();
    const memberId = e.currentTarget.getAttribute('data-member-id');
    if (memberId) {
        viewMemberPayments(memberId);
    }
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
    
    const tripFilter = document.getElementById('tripFilter');
    if (tripFilter) tripFilter.addEventListener('change', applyFilters);
    
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);
    
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    if (resetFiltersBtn) resetFiltersBtn.addEventListener('click', resetFilters);
    
    const serviceType = document.getElementById('serviceType');
    if (serviceType) serviceType.addEventListener('change', updateTotalAmount);
    
    const closePaymentModalBtn = document.getElementById('closePaymentModalBtn');
    if (closePaymentModalBtn) closePaymentModalBtn.addEventListener('click', closePaymentModal);
    
    const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
    if (cancelPaymentBtn) cancelPaymentBtn.addEventListener('click', closePaymentModal);
    
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) confirmPaymentBtn.addEventListener('click', savePayment);
    
    const closeViewModalBtn = document.getElementById('closeViewModalBtn');
    if (closeViewModalBtn) closeViewModalBtn.addEventListener('click', closeViewPaymentsModal);
    
    const closeViewModalFooterBtn = document.getElementById('closeViewModalFooterBtn');
    if (closeViewModalFooterBtn) closeViewModalFooterBtn.addEventListener('click', closeViewPaymentsModal);
    
    // Report modal event listeners
    const viewStatusBtn = document.getElementById('viewPaymentStatusBtn');
    if (viewStatusBtn) viewStatusBtn.addEventListener('click', showPaymentStatusReport);
    
    const closeStatusModalBtn = document.getElementById('closeStatusModalBtn');
    if (closeStatusModalBtn) closeStatusModalBtn.addEventListener('click', closePaymentStatusModal);
    
    const closeStatusModalFooterBtn = document.getElementById('closeStatusModalFooterBtn');
    if (closeStatusModalFooterBtn) closeStatusModalFooterBtn.addEventListener('click', closePaymentStatusModal);
    
    const exportReportBtn = document.getElementById('exportReportBtn');
    if (exportReportBtn) exportReportBtn.addEventListener('click', exportPaymentReportToCSV);
    
    const applyReportFiltersBtn = document.getElementById('applyReportFiltersBtn');
    if (applyReportFiltersBtn) applyReportFiltersBtn.addEventListener('click', applyReportFilters);
    
    window.addEventListener('click', closeModalOnOutsideClick);
    document.addEventListener('keydown', closeAllModalsOnEscape);
}

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

// Make functions globally available
window.openPaymentModal = openPaymentModal;
window.viewMemberPayments = viewMemberPayments;
window.viewMemberPaymentsForTrip = viewMemberPaymentsForTrip;
window.closePaymentModal = closePaymentModal;
window.closeViewPaymentsModal = closeViewPaymentsModal;
window.savePayment = savePayment;
window.searchMembers = searchMembers;
window.clearSearch = clearSearch;
window.refreshAllData = refreshAllData;
window.hideMessage = hideMessage;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.showPaymentStatusReport = showPaymentStatusReport;
window.closePaymentStatusModal = closePaymentStatusModal;
window.exportPaymentReportToCSV = exportPaymentReportToCSV;
window.applyReportFilters = applyReportFilters;

// ========== INITIALIZATION ==========
function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) yearElement.textContent = new Date().getFullYear();
}

function setupMutationObserver() {
    const membersList = document.getElementById('membersList');
    if (!membersList) return;
    
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                attachDynamicEventListeners();
            }
        });
    });
    
    observer.observe(membersList, { childList: true, subtree: true });
}

async function init() {
    console.log('Initializing Payments Page...');
    await loadData();
    updateCurrentYear();
    setupEventListeners();
    setupMutationObserver();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}