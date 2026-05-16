// ========== DASHBOARD PAGE - MAIN APPLICATION ==========
let members = [];
let visits = [];
let visitsStartDate = null, visitsEndDate = null;
let regStartDate = null, regEndDate = null;
let currentGenderFilter = 'all';

// Chart instances
let kganyaFemaleChoirChart, kganyaMokhukhuChart, kganyaCommitteeMembersChart;
let memberGenderChart, memberAgeChart, memberCommitteeChart, memberActivityChart;
let visitGenderChart, visitAgeChart, visitCommitteeChart, visitActivityChart;
let kganyaSubscribersChart, kganyaGenderChart, kganyaVsNonChart, kganyaExecutiveChart;
let employmentGenderChart, employmentCommitteeChart, educationLevelChart;
let trainedGenderChart, trainedCommitteeChart;

// ========== NEW: Calculate age from Date of Birth ==========
function calculateAgeFromDOB(dateOfBirth) {
    if (!dateOfBirth) return null;
    
    let birthDate;
    
    // Handle different date formats
    if (typeof dateOfBirth === 'string') {
        // Try parsing YYYY-MM-DD
        if (dateOfBirth.includes('-')) {
            birthDate = new Date(dateOfBirth);
        }
        // Try parsing DD/MM/YYYY
        else if (dateOfBirth.includes('/')) {
            let parts = dateOfBirth.split('/');
            birthDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        else {
            birthDate = new Date(dateOfBirth);
        }
    } else if (dateOfBirth instanceof Date) {
        birthDate = dateOfBirth;
    } else {
        return null;
    }
    
    // Check if date is valid
    if (isNaN(birthDate.getTime())) {
        return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// ========== Age Group Function (commented out old version, using new approach) ==========
// function getAgeGroup(age) {
//     if (age === null) return 'Unknown';
//     if (age <= 4) return '1-4'; if (age <= 9) return '5-9'; if (age <= 14) return '10-14';
//     if (age <= 19) return '15-19'; if (age <= 24) return '20-24'; if (age <= 29) return '25-29';
//     if (age <= 34) return '30-34'; if (age <= 39) return '35-39'; if (age <= 44) return '40-44';
//     if (age <= 49) return '45-49'; return '50+';
// }

function getAgeGroup(age) {
    if (age === null || age === undefined || isNaN(age)) return 'Unknown';
    if (age <= 4) return '1-4';
    if (age <= 9) return '5-9';
    if (age <= 14) return '10-14';
    if (age <= 19) return '15-19';
    if (age <= 24) return '20-24';
    if (age <= 29) return '25-29';
    if (age <= 34) return '30-34';
    if (age <= 39) return '35-39';
    if (age <= 44) return '40-44';
    if (age <= 49) return '45-49';
    return '50+';
}

// Helper function to get age group directly from DOB
function getAgeGroupFromDOB(dateOfBirth) {
    const age = calculateAgeFromDOB(dateOfBirth);
    return getAgeGroup(age);
}

// Helper function to calculate percentages
function calculatePercentage(value, total) {
    if (total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
}

// Chart.js Data Labels Plugin - Forces data labels on top of bars
Chart.register({
    id: 'dataLabels',
    afterDatasetsDraw(chart, args, options) {
        const { ctx } = chart;
        ctx.save();
        
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            const meta = chart.getDatasetMeta(datasetIndex);
            if (!meta.hidden) {
                meta.data.forEach((element, index) => {
                    const value = dataset.data[index];
                    if (value !== undefined && value !== null && value !== 0) {
                        let x, y;
                        let displayValue = value;
                        
                        // For bar charts - position label ON TOP of the bar
                        if (chart.config.type === 'bar') {
                            // Get the bar's position
                            const barX = element.x;
                            const barY = element.y;
                            const barHeight = element.height;
                            
                            // Position label ABOVE the bar
                            x = barX;
                            y = barY - barHeight / 2 - 8;
                            
                            // For grouped bar charts, adjust x position for multiple datasets
                            if (meta.data.length > 1 && datasetIndex > 0) {
                                const barWidth = element.width || 30;
                                const offset = (datasetIndex - 0.5) * (barWidth * 0.9);
                                x = barX + offset;
                            }
                            
                            ctx.font = `bold ${options.fontSize || 12}px 'Inter'`;
                            ctx.fillStyle = '#1a2e1a';
                            ctx.shadowBlur = 0;
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                        } 
                        // For pie/doughnut charts
                        else if (chart.config.type === 'pie' || chart.config.type === 'doughnut') {
                            const midAngle = element.startAngle + (element.endAngle - element.startAngle) / 2;
                            const radius = element.outerRadius * 0.65;
                            x = element.x + Math.cos(midAngle) * radius;
                            y = element.y + Math.sin(midAngle) * radius;
                            ctx.font = `bold ${options.fontSize || 13}px 'Inter'`;
                            ctx.fillStyle = '#ffffff';
                            ctx.shadowBlur = 2;
                            ctx.shadowColor = 'rgba(0,0,0,0.3)';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                        }
                        // For line charts
                        else {
                            const position = element.tooltipPosition();
                            x = position.x;
                            y = position.y - 10;
                            ctx.font = `bold ${options.fontSize || 12}px 'Inter'`;
                            ctx.fillStyle = '#333';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'bottom';
                        }
                        
                        ctx.fillText(displayValue, x, y);
                    }
                });
            }
        });
        ctx.restore();
    }
});

function showMessage(msg, type) {
    const container = document.getElementById("errorMessageContainer");
    const span = document.getElementById("errorText");
    if (!container) return;
    span.innerText = msg;
    container.style.display = "block";
    container.style.background = type === "success" ? "#d1e7dd" : "#f8d7da";
    container.style.color = type === "success" ? "#0f5132" : "#a71d2a";
    container.style.borderLeftColor = type === "success" ? "#198754" : "#dc3545";
    setTimeout(() => container.style.display = "none", 3000);
}

function updateCurrentYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) yearElement.textContent = new Date().getFullYear();
}

// ========== REMOVED: calculateAgeFromPin function (no longer needed) ==========
// Age is now calculated from date_of_birth field

async function loadData() {
    showMessage('Loading data from server...', 'success');
    try {
        const membersResult = await api.getMembers();
        if (membersResult.success && membersResult.data) members = membersResult.data;
        else members = [];
        
        const visitsResult = await api.getVisits();
        if (visitsResult.success && visitsResult.data) visits = visitsResult.data;
        else visits = [];
        
        updateAllDashboards();
        showMessage(`Loaded ${members.length} members and ${visits.length} visits`, 'success');
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading data', 'error');
    }
}

function updateAllDashboards() {
    updateVisitsStatistics();
    updateTotalStatisticsAndCharts();
    updateKganyaStatistics();
    updateAdditionalKganyaStatistics();
    updateSkillsStatistics();
}

function updateVisitsStatistics() {
    let filteredVisits = [...visits];
    if (visitsStartDate) filteredVisits = filteredVisits.filter(v => v.visit_date >= visitsStartDate);
    if (visitsEndDate) filteredVisits = filteredVisits.filter(v => v.visit_date <= visitsEndDate);
    
    const memberMap = new Map();
    members.forEach(m => memberMap.set(m.member_id, m));
    
    let total = 0, female = 0, male = 0, mokhukhu = 0, femaleChoir = 0, sundaySchool = 0, executive = 0;
    filteredVisits.forEach(v => {
        const m = memberMap.get(v.member_id);
        if (m) {
            total++;
            if (m.gender === 'Female') female++;
            if (m.gender === 'Male') male++;
            if (m.church_activity === 'mokhukhu') mokhukhu++;
            if (m.church_activity === 'female_choir') femaleChoir++;
            if (m.church_activity === 'sunday_school') sundaySchool++;
            if (m.in_executive_committee === true || m.in_executive_committee === 'TRUE') executive++;
        }
    });
    document.getElementById('totalVisitsCount').innerText = total;
    document.getElementById('femaleVisitsCount').innerText = female;
    document.getElementById('maleVisitsCount').innerText = male;
    document.getElementById('mokhukhuVisitsCount').innerText = mokhukhu;
    document.getElementById('femaleChoirVisitsCount').innerText = femaleChoir;
    document.getElementById('sundaySchoolVisitsCount').innerText = sundaySchool;
    document.getElementById('executiveVisitsCount').innerText = executive;
}

function getFilteredMembersByRegistration() {
    let filtered = [...members];
    if (regStartDate) filtered = filtered.filter(m => (m.created_at || '').split('T')[0] >= regStartDate);
    if (regEndDate) filtered = filtered.filter(m => (m.created_at || '').split('T')[0] <= regEndDate);
    if (currentGenderFilter !== 'all') filtered = filtered.filter(m => m.gender === currentGenderFilter);
    return filtered;
}

function getFilteredVisitsForCharts() {
    let filtered = [...visits];
    if (visitsStartDate) filtered = filtered.filter(v => v.visit_date >= visitsStartDate);
    if (visitsEndDate) filtered = filtered.filter(v => v.visit_date <= visitsEndDate);
    return filtered;
}

function updateTotalStatisticsAndCharts() {
    const filteredMembers = getFilteredMembersByRegistration();
    const maleCount = filteredMembers.filter(m => m.gender === 'Male').length;
    const femaleCount = filteredMembers.filter(m => m.gender === 'Female').length;
    const committeeCount = filteredMembers.filter(m => m.in_executive_committee === true || m.in_executive_committee === 'TRUE').length;
    const totalMembersCount = filteredMembers.length;
    
    document.getElementById('totalMembersCount').innerText = totalMembersCount;
    document.getElementById('genderRatioDisplay').innerText = `${maleCount}:${femaleCount}`;
    document.getElementById('committeeMembersCount').innerText = committeeCount;
    document.getElementById('totalVisitsOverall').innerText = visits.length;
    
    // ========== UPDATED: Member Distributions using Date of Birth ==========
    const memberAgeGroups = { '1-4':0,'5-9':0,'10-14':0,'15-19':0,'20-24':0,'25-29':0,'30-34':0,'35-39':0,'40-44':0,'45-49':0,'50+':0,'Unknown':0 };
    const memberCommittees = { 'In Committee':0, 'Not in Committee':0 };
    const memberActivities = { 'Mokhukhu':0, 'Female Choir':0, 'Male Choir':0, 'Sunday School':0, 'Other':0 };
    
    filteredMembers.forEach(m => {
        // Calculate age from date_of_birth instead of PIN
        const age = calculateAgeFromDOB(m.date_of_birth);
        const ageGroup = getAgeGroup(age);
        if (memberAgeGroups[ageGroup] !== undefined) memberAgeGroups[ageGroup]++;
        else memberAgeGroups['Unknown']++;
        
        if (m.in_executive_committee === true || m.in_executive_committee === 'TRUE') memberCommittees['In Committee']++;
        else memberCommittees['Not in Committee']++;
        
        const act = m.church_activity;
        if (act === 'mokhukhu') memberActivities['Mokhukhu']++;
        else if (act === 'female_choir') memberActivities['Female Choir']++;
        else if (act === 'male_choir') memberActivities['Male Choir']++;
        else if (act === 'sunday_school') memberActivities['Sunday School']++;
        else memberActivities['Other']++;
    });
    
    if (memberGenderChart) memberGenderChart.destroy();
    memberGenderChart = new Chart(document.getElementById('memberGenderChart'), { 
        type: 'pie', 
        data: { labels: ['Male', 'Female'], datasets: [{ data: [maleCount, femaleCount], backgroundColor: ['#2e7d32', '#ffc107'] }] }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
    
    const ageGroupLabels = Object.keys(memberAgeGroups);
    const ageGroupData = Object.values(memberAgeGroups);
    if (memberAgeChart) memberAgeChart.destroy();
    memberAgeChart = new Chart(document.getElementById('memberAgeChart'), { 
        type: 'bar', 
        data: { labels: ageGroupLabels, datasets: [{ label: 'Members', data: ageGroupData, backgroundColor: '#1e3c72', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { display: false }, dataLabels: { fontSize: 11 } } } 
    });
    
    if (memberCommitteeChart) memberCommitteeChart.destroy();
    memberCommitteeChart = new Chart(document.getElementById('memberCommitteeChart'), { 
        type: 'pie', 
        data: { labels: Object.keys(memberCommittees), datasets: [{ data: Object.values(memberCommittees), backgroundColor: ['#2e7d32', '#6c757d'] }] }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
    
    const activityLabels = Object.keys(memberActivities);
    const activityData = Object.values(memberActivities);
    if (memberActivityChart) memberActivityChart.destroy();
    memberActivityChart = new Chart(document.getElementById('memberActivityChart'), { 
        type: 'bar', 
        data: { labels: activityLabels, datasets: [{ label: 'Members', data: activityData, backgroundColor: '#17a2b8', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { display: false }, dataLabels: { fontSize: 11 } } } 
    });
    
    // ========== UPDATED: Visit Distributions using Date of Birth ==========
    const memberMap = new Map();
    members.forEach(m => memberMap.set(m.member_id, m));
    const filteredVisits = getFilteredVisitsForCharts();
    const visitGender = { 'Male': 0, 'Female': 0 };
    const visitAgeGroups = { '1-4':0,'5-9':0,'10-14':0,'15-19':0,'20-24':0,'25-29':0,'30-34':0,'35-39':0,'40-44':0,'45-49':0,'50+':0,'Unknown':0 };
    const visitCommittees = { 'In Committee':0, 'Not in Committee':0 };
    const visitActivities = { 'Mokhukhu':0, 'Female Choir':0, 'Male Choir':0, 'Sunday School':0, 'Other':0 };
    
    filteredVisits.forEach(v => {
        const m = memberMap.get(v.member_id);
        if (m) {
            if (m.gender === 'Male') visitGender['Male']++;
            if (m.gender === 'Female') visitGender['Female']++;
            // Calculate age from date_of_birth instead of PIN
            const age = calculateAgeFromDOB(m.date_of_birth);
            const ageGroup = getAgeGroup(age);
            if (visitAgeGroups[ageGroup] !== undefined) visitAgeGroups[ageGroup]++;
            else visitAgeGroups['Unknown']++;
            if (m.in_executive_committee === true || m.in_executive_committee === 'TRUE') visitCommittees['In Committee']++;
            else visitCommittees['Not in Committee']++;
            const act = m.church_activity;
            if (act === 'mokhukhu') visitActivities['Mokhukhu']++;
            else if (act === 'female_choir') visitActivities['Female Choir']++;
            else if (act === 'male_choir') visitActivities['Male Choir']++;
            else if (act === 'sunday_school') visitActivities['Sunday School']++;
            else visitActivities['Other']++;
        }
    });
    
    if (visitGenderChart) visitGenderChart.destroy();
    visitGenderChart = new Chart(document.getElementById('visitGenderChart'), { 
        type: 'pie', 
        data: { labels: ['Male', 'Female'], datasets: [{ data: Object.values(visitGender), backgroundColor: ['#2e7d32', '#ffc107'] }] }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
    
    if (visitAgeChart) visitAgeChart.destroy();
    visitAgeChart = new Chart(document.getElementById('visitAgeChart'), { 
        type: 'bar', 
        data: { labels: Object.keys(visitAgeGroups), datasets: [{ label: 'Visits', data: Object.values(visitAgeGroups), backgroundColor: '#1e3c72', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { display: false }, dataLabels: { fontSize: 11 } } } 
    });
    
    if (visitCommitteeChart) visitCommitteeChart.destroy();
    visitCommitteeChart = new Chart(document.getElementById('visitCommitteeChart'), { 
        type: 'pie', 
        data: { labels: Object.keys(visitCommittees), datasets: [{ data: Object.values(visitCommittees), backgroundColor: ['#2e7d32', '#6c757d'] }] }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
    
    if (visitActivityChart) visitActivityChart.destroy();
    visitActivityChart = new Chart(document.getElementById('visitActivityChart'), { 
        type: 'bar', 
        data: { labels: Object.keys(visitActivities), datasets: [{ label: 'Visits', data: Object.values(visitActivities), backgroundColor: '#17a2b8', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { display: false }, dataLabels: { fontSize: 11 } } } 
    });
}

function updateKganyaStatistics() {
    const kganyaYes = members.filter(m => m.kganya_member === 'Yes').length;
    const kganyaNo = members.filter(m => m.kganya_member === 'No' || !m.kganya_member).length;
    document.getElementById('kganyaSubscribersCount').innerText = kganyaYes;
    
    if (kganyaSubscribersChart) kganyaSubscribersChart.destroy();
    kganyaSubscribersChart = new Chart(document.getElementById('kganyaSubscribersChart'), { 
        type: 'pie', 
        data: { labels: ['Pays Kganya', 'Does Not Pay'], datasets: [{ data: [kganyaYes, kganyaNo], backgroundColor: ['#2e7d32', '#dc3545'] }] }, 
        options: { responsive: true, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
    
    const maleKganya = members.filter(m => m.gender === 'Male' && m.kganya_member === 'Yes').length;
    const maleNonKganya = members.filter(m => m.gender === 'Male' && (m.kganya_member === 'No' || !m.kganya_member)).length;
    const femaleKganya = members.filter(m => m.gender === 'Female' && m.kganya_member === 'Yes').length;
    const femaleNonKganya = members.filter(m => m.gender === 'Female' && (m.kganya_member === 'No' || !m.kganya_member)).length;
    
    if (kganyaGenderChart) kganyaGenderChart.destroy();
    kganyaGenderChart = new Chart(document.getElementById('kganyaGenderChart'), { 
        type: 'bar', 
        data: { 
            labels: ['Male', 'Female'], 
            datasets: [
                { label: 'Pays Kganya', data: [maleKganya, femaleKganya], backgroundColor: '#2e7d32', borderRadius: 4 }, 
                { label: 'Does Not Pay', data: [maleNonKganya, femaleNonKganya], backgroundColor: '#dc3545', borderRadius: 4 }
            ] 
        }, 
        options: { 
            responsive: true, 
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, 
            plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 12 } } 
        } 
    });
    
    if (kganyaVsNonChart) kganyaVsNonChart.destroy();
    kganyaVsNonChart = new Chart(document.getElementById('kganyaVsNonChart'), { 
        type: 'bar', 
        data: { labels: ['Pays Kganya', 'Does Not Pay'], datasets: [{ label: 'Count', data: [kganyaYes, kganyaNo], backgroundColor: ['#2e7d32', '#dc3545'], borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
    
    const execMembers = members.filter(m => m.in_executive_committee === true || m.in_executive_committee === 'TRUE');
    const execKganya = execMembers.filter(m => m.kganya_member === 'Yes').length;
    const execNonKganya = execMembers.filter(m => m.kganya_member === 'No' || !m.kganya_member).length;
    
    if (kganyaExecutiveChart) kganyaExecutiveChart.destroy();
    kganyaExecutiveChart = new Chart(document.getElementById('kganyaExecutiveChart'), { 
        type: 'bar', 
        data: { labels: ['Pays Kganya', 'Does Not Pay'], datasets: [{ label: 'Executive Committee', data: [execKganya, execNonKganya], backgroundColor: ['#2e7d32', '#dc3545'], borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } } } 
    });
}

function updateAdditionalKganyaStatistics() {
    // Female Choir members
    const femaleChoirMembers = members.filter(m => m.church_activity === 'female_choir');
    const femaleChoirKganya = femaleChoirMembers.filter(m => m.kganya_member === 'Yes').length;
    const femaleChoirNonKganya = femaleChoirMembers.filter(m => m.kganya_member === 'No' || !m.kganya_member).length;
    
    // Mokhukhu members
    const mokhukhuMembers = members.filter(m => m.church_activity === 'mokhukhu');
    const mokhukhuKganya = mokhukhuMembers.filter(m => m.kganya_member === 'Yes').length;
    const mokhukhuNonKganya = mokhukhuMembers.filter(m => m.kganya_member === 'No' || !m.kganya_member).length;
    
    // Committee Members
    const committeeMembers = members.filter(m => m.in_executive_committee === true || m.in_executive_committee === 'TRUE');
    const committeeKganya = committeeMembers.filter(m => m.kganya_member === 'Yes').length;
    const committeeNonKganya = committeeMembers.filter(m => m.kganya_member === 'No' || !m.kganya_member).length;
    
    if (kganyaFemaleChoirChart) kganyaFemaleChoirChart.destroy();
    kganyaFemaleChoirChart = new Chart(document.getElementById('kganyaFemaleChoirChart'), {
        type: 'bar',
        data: {
            labels: ['Pays Kganya', 'Does Not Pay'],
            datasets: [{
                label: 'Female Choir Members',
                data: [femaleChoirKganya, femaleChoirNonKganya],
                backgroundColor: ['#2e7d32', '#dc3545'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: 'Number of Members' } } },
            plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } }
        }
    });
    
    if (kganyaMokhukhuChart) kganyaMokhukhuChart.destroy();
    kganyaMokhukhuChart = new Chart(document.getElementById('kganyaMokhukhuChart'), {
        type: 'bar',
        data: {
            labels: ['Pays Kganya', 'Does Not Pay'],
            datasets: [{
                label: 'Mokhukhu Members',
                data: [mokhukhuKganya, mokhukhuNonKganya],
                backgroundColor: ['#2e7d32', '#dc3545'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: 'Number of Members' } } },
            plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } }
        }
    });
    
    if (kganyaCommitteeMembersChart) kganyaCommitteeMembersChart.destroy();
    kganyaCommitteeMembersChart = new Chart(document.getElementById('kganyaCommitteeMembersChart'), {
        type: 'bar',
        data: {
            labels: ['Pays Kganya', 'Does Not Pay'],
            datasets: [{
                label: 'Committee Members',
                data: [committeeKganya, committeeNonKganya],
                backgroundColor: ['#2e7d32', '#dc3545'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, title: { display: true, text: 'Number of Members' } } },
            plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 14 } }
        }
    });
}

function updateSkillsStatistics() {
    const statuses = ['employed', 'self_employed', 'unemployed', 'student', 'retired'];
    const statusLabels = ['Employed', 'Self-Employed', 'Unemployed', 'Student', 'Retired'];
    const maleData = statuses.map(s => members.filter(m => m.gender === 'Male' && m.employment_status === s).length);
    const femaleData = statuses.map(s => members.filter(m => m.gender === 'Female' && m.employment_status === s).length);
    
    if (employmentGenderChart) employmentGenderChart.destroy();
    employmentGenderChart = new Chart(document.getElementById('employmentGenderChart'), { 
        type: 'bar', 
        data: { labels: statusLabels, datasets: [{ label: 'Male', data: maleData, backgroundColor: '#2e7d32', borderRadius: 4 }, { label: 'Female', data: femaleData, backgroundColor: '#ffc107', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 11 } } } 
    });
    
    const execMembers = members.filter(m => m.in_executive_committee === true || m.in_executive_committee === 'TRUE');
    const nonExecMembers = members.filter(m => !(m.in_executive_committee === true || m.in_executive_committee === 'TRUE'));
    const execData = statuses.map(s => execMembers.filter(m => m.employment_status === s).length);
    const nonExecData = statuses.map(s => nonExecMembers.filter(m => m.employment_status === s).length);
    
    if (employmentCommitteeChart) employmentCommitteeChart.destroy();
    employmentCommitteeChart = new Chart(document.getElementById('employmentCommitteeChart'), { 
        type: 'bar', 
        data: { labels: statusLabels, datasets: [{ label: 'In Committee', data: execData, backgroundColor: '#2e7d32', borderRadius: 4 }, { label: 'Not in Committee', data: nonExecData, backgroundColor: '#6c757d', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 11 } } } 
    });
    
    const eduLevels = ['primary', 'secondary', 'certificate', 'diploma', 'degree', 'postgraduate', 'masters', 'doctorate'];
    const eduLabels = ['Primary', 'Secondary', 'Certificate', 'Diploma', 'Degree', 'Postgrad', 'Masters', 'Doctorate'];
    const eduData = eduLevels.map(l => members.filter(m => m.education_level === l).length);
    
    if (educationLevelChart) educationLevelChart.destroy();
    educationLevelChart = new Chart(document.getElementById('educationLevelChart'), { 
        type: 'bar', 
        data: { labels: eduLabels, datasets: [{ label: 'Count', data: eduData, backgroundColor: '#1e3c72', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { display: false }, dataLabels: { fontSize: 11 } } } 
    });
    
    const trainedYesMale = members.filter(m => m.gender === 'Male' && m.formally_trained_on_skills === 'yes').length;
    const trainedNoMale = members.filter(m => m.gender === 'Male' && (m.formally_trained_on_skills !== 'yes')).length;
    const trainedYesFemale = members.filter(m => m.gender === 'Female' && m.formally_trained_on_skills === 'yes').length;
    const trainedNoFemale = members.filter(m => m.gender === 'Female' && (m.formally_trained_on_skills !== 'yes')).length;
    
    if (trainedGenderChart) trainedGenderChart.destroy();
    trainedGenderChart = new Chart(document.getElementById('trainedGenderChart'), { 
        type: 'bar', 
        data: { labels: ['Male', 'Female'], datasets: [{ label: 'Trained', data: [trainedYesMale, trainedYesFemale], backgroundColor: '#2e7d32', borderRadius: 4 }, { label: 'Not Trained', data: [trainedNoMale, trainedNoFemale], backgroundColor: '#dc3545', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 12 } } } 
    });
    
    const trainedYesExec = execMembers.filter(m => m.formally_trained_on_skills === 'yes').length;
    const trainedNoExec = execMembers.filter(m => m.formally_trained_on_skills !== 'yes').length;
    const trainedYesNonExec = nonExecMembers.filter(m => m.formally_trained_on_skills === 'yes').length;
    const trainedNoNonExec = nonExecMembers.filter(m => m.formally_trained_on_skills !== 'yes').length;
    
    if (trainedCommitteeChart) trainedCommitteeChart.destroy();
    trainedCommitteeChart = new Chart(document.getElementById('trainedCommitteeChart'), { 
        type: 'bar', 
        data: { labels: ['In Committee', 'Not in Committee'], datasets: [{ label: 'Trained', data: [trainedYesExec, trainedYesNonExec], backgroundColor: '#2e7d32', borderRadius: 4 }, { label: 'Not Trained', data: [trainedNoExec, trainedNoNonExec], backgroundColor: '#dc3545', borderRadius: 4 }] }, 
        options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }, plugins: { legend: { position: 'bottom' }, dataLabels: { fontSize: 12 } } } 
    });
    
    const qualificationCounts = new Map();
    members.forEach(m => {
        if (m.qualification) {
            const qual = m.qualification;
            if (!qualificationCounts.has(qual)) qualificationCounts.set(qual, { total:0, male:0, female:0, inCommittee:0 });
            const entry = qualificationCounts.get(qual);
            entry.total++;
            if (m.gender === 'Male') entry.male++;
            if (m.gender === 'Female') entry.female++;
            if (m.in_executive_committee === true || m.in_executive_committee === 'TRUE') entry.inCommittee++;
        }
    });
    const sorted = Array.from(qualificationCounts.entries()).sort((a,b) => b[1].total - a[1].total);
    const tbody = document.getElementById('qualificationsTableBody');
    tbody.innerHTML = '';
    sorted.forEach(([qual, counts]) => {
        const row = tbody.insertRow();
        row.insertCell(0).innerText = qual;
        row.insertCell(1).innerText = counts.total;
        row.insertCell(2).innerText = counts.male;
        row.insertCell(3).innerText = counts.female;
        row.insertCell(4).innerText = counts.inCommittee;
    });
    if (sorted.length === 0) tbody.innerHTML = '<tr><td colspan="5" class="text-center">No qualification data available</td></tr>';
}

function setupEventListeners() {
    document.getElementById('applyVisitsFilterBtn')?.addEventListener('click', () => {
        visitsStartDate = document.getElementById('visitsStartDate').value || null;
        visitsEndDate = document.getElementById('visitsEndDate').value || null;
        updateVisitsStatistics();
        updateTotalStatisticsAndCharts();
        showMessage('Visits filter applied', 'success');
    });
    document.getElementById('applyRegFilterBtn')?.addEventListener('click', () => {
        regStartDate = document.getElementById('regStartDate').value || null;
        regEndDate = document.getElementById('regEndDate').value || null;
        updateTotalStatisticsAndCharts();
        showMessage('Registration date filter applied', 'success');
    });
    document.getElementById('applyGenderFilterBtn')?.addEventListener('click', () => {
        currentGenderFilter = document.getElementById('genderFilter').value;
        updateTotalStatisticsAndCharts();
        showMessage('Gender filter applied', 'success');
    });
}

async function init() {
    updateCurrentYear();
    setupEventListeners();
    await loadData();
}

init();