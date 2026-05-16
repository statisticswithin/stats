// ========== LOGIN PAGE - MAIN APPLICATION ==========

// ── Branch data ─────────────────────────────────────────────────────────────
const branchOptions = {
    main: [
        { value: "FP0",  label: "FP0: MINISTER" },
        { value: "FP1",  label: "FP1: LUHLOKOHLA" },
        { value: "FP10", label: "FP10: NTFONJENI" },
        { value: "FP2",  label: "FP2: EZULWINI" },
        { value: "FP3",  label: "FP3: PIGGS PEAK" },
        { value: "FP4",  label: "FP4: NHLANGANO" },
        { value: "FP5",  label: "FP5: MHLANGATANE" },
        { value: "FP6",  label: "FP6: MBABANE" },
        { value: "FP7",  label: "FP7: TSHANENI/SOHHOYE" },
        { value: "FP8",  label: "FP8: SITEKI" },
        { value: "FP9",  label: "FP9: LUBULINI" },
        { value: "Other",  label: "Other" }
    ],
    sub: [
        { value: "FP1_MALINDZA",    label: "FP1: MALINDZA" },
        { value: "FP10_NTFONJENI",  label: "FP10: NTFONJENI" },
        { value: "FP2_MAPHALALENI", label: "FP2: MAPHALALENI" },
        { value: "FP4_LULAKENI",    label: "FP4: LULAKENI" },
        { value: "FP5_MPOFU",       label: "FP5: MPOFU" },
        { value: "FP5_SIDZAKENI",   label: "FP5: SIDZAKENI" },
        { value: "FP5_SITSATSAWENI",label: "FP5: SITSATSAWENI" },
        { value: "FP6_JUBUKWENI",   label: "FP6: JUBUKWENI" },
        { value: "FP7_NKAMBENI",    label: "FP7: NKAMBENI" },
        { value: "FP7_SIDVOKODVO",  label: "FP7: SIDVOKODVO" },
        { value: "FP7_TSAMBOKHULU", label: "FP7: TSAMBOKHULU" },
        { value: "FP8_MPOLONJENI",  label: "FP8: MPOLONJENI" },
        { value: "FP9_MATSANJENI",  label: "FP9: MATSANJENI" },
        { value: "FP9_THESALONIKA", label: "FP9: THESALONIKA" },
        { value: "Other", label: "Other" }
    ]
};

// ── Element references ───────────────────────────────────────────────────────
const loginForm          = document.getElementById('loginForm');
const usernameInput      = document.getElementById('username');
const passwordInput      = document.getElementById('password');
const loginBtn           = document.getElementById('loginBtn');
const togglePasswordBtn  = document.getElementById('togglePassword');
const messageDiv         = document.getElementById('loginMessage');
const branchLevelSelect  = document.getElementById('login_branch_level');
const branchSelect       = document.getElementById('login_branch');

// ── Populate branch dropdown based on level ──────────────────────────────────
function populateBranches(level) {
    branchSelect.innerHTML = '<option value="">Select Branch</option>';

    if (!level || !branchOptions[level]) {
        branchSelect.disabled = true;
        return;
    }

    branchOptions[level].forEach(function (opt) {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        branchSelect.appendChild(option);
    });

    branchSelect.disabled = false;
}

if (branchLevelSelect) {
    branchLevelSelect.addEventListener('change', function () {
        populateBranches(this.value);
    });
}

// ── Utility ──────────────────────────────────────────────────────────────────
function showMessage(message, type) {
    if (!messageDiv) return;
    messageDiv.style.display = 'flex';
    messageDiv.className = `alert-message alert-${type}`;
    messageDiv.innerHTML = `<i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'}"></i><span>${message}</span>`;
    setTimeout(() => { messageDiv.style.display = 'none'; }, 4000);
}

// ── Toggle Password Visibility ────────────────────────────────────────────────
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        const icon = togglePasswordBtn.querySelector('i');
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
    });
}

// ── Form Submission ───────────────────────────────────────────────────────────
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const username    = usernameInput.value.trim();
        const password    = passwordInput.value;
        const branchLevel = branchLevelSelect ? branchLevelSelect.value : '';
        const branch      = branchSelect      ? branchSelect.value      : '';

        // Validate branch fields
        if (!branchLevel) {
            showMessage('Please select a Branch Level', 'error');
            branchLevelSelect.focus();
            return;
        }
        if (!branch) {
            showMessage('Please select a Branch', 'error');
            branchSelect.focus();
            return;
        }
        if (!username || !password) {
            showMessage('Please enter username and password', 'error');
            return;
        }

        const originalBtnHTML = loginBtn.innerHTML;
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<span class="spinner"></span> Authenticating...';

        try {
            if (typeof api === 'undefined' || !api.authenticate) {
                console.error('API client not available');
                showMessage('Authentication service unavailable. Please contact administrator.', 'error');
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnHTML;
                return;
            }

            const result = await api.authenticate(username, password);
            console.log('Login response:', result);

            if (result.success) {
                // ── Store branch selection so register page can auto-fill ──
                localStorage.setItem('user_branch_level', branchLevel);
                localStorage.setItem('user_branch', branch);

                // Store the human-readable label too (useful for display)
                const branchLabel = branchSelect.options[branchSelect.selectedIndex]
                    ? branchSelect.options[branchSelect.selectedIndex].text
                    : branch;
                localStorage.setItem('user_branch_label', branchLabel);

                showMessage(`Welcome ${username}! Redirecting...`, 'success');

                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);

            } else {
                showMessage(result.error || 'Invalid username or password', 'error');
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalBtnHTML;
                passwordInput.value = '';
                passwordInput.focus();
            }

        } catch (error) {
            console.error('Login error:', error);
            showMessage('Authentication failed. Please try again or contact administrator.', 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalBtnHTML;
            passwordInput.value = '';
            passwordInput.focus();
        }
    });
}

// ── Check if already logged in ────────────────────────────────────────────────
function checkAuth() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        window.location.href = 'home.html';
    }
}
checkAuth();

// ── Focus scale effects ───────────────────────────────────────────────────────
document.querySelectorAll('.form-control-glass').forEach(function (input) {
    input.addEventListener('focus', function () {
        this.parentElement.style.transform = 'scale(1.01)';
    });
    input.addEventListener('blur', function () {
        this.parentElement.style.transform = 'scale(1)';
    });
});
