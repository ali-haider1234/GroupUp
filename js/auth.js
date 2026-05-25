/* ============================================================
   GroupUp — Auth Page Logic (Signup + Login)
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;
  initPageAnimation();
  initNavbarScroll();

  if (page === 'signup') initSignup();
  if (page === 'login')  initLogin();
  if (page === 'forgot') initForgotPassword();
  if (page === 'reset')  initResetPassword();
});

/* ════════════════════════════════════════════════════════════
   INPUT HELPERS
   ════════════════════════════════════════════════════════════ */
function formatRollInput(input) {
  const prev = input.value;
  const prevPos = input.selectionStart ?? prev.length;
  const cleaned = prev.toUpperCase().replace(/[^0-9F]/g, '');

  const year = cleaned.replace(/[^0-9]/g, '').slice(0, 2);
  const afterYear = cleaned.slice(year.length);
  const hasF = afterYear.includes('F');
  const serial = afterYear.replace(/[^0-9]/g, '').slice(0, 4);

  let formatted = year;
  if (hasF) {
    formatted += 'F';
    if (year.length === 2) formatted += '-';
    formatted += serial;
  }

  input.value = formatted;

  if (hasF && year.length === 2) {
    const dashIndex = formatted.indexOf('-');
    if (dashIndex !== -1 && !prev.includes('-') && prevPos >= dashIndex) {
      input.setSelectionRange(dashIndex + 1, dashIndex + 1);
    }
  }

  return formatted;
}

/* ════════════════════════════════════════════════════════════
   SIGNUP LOGIC
   ════════════════════════════════════════════════════════════ */
function initSignup() {
  const form       = document.getElementById('signup-form');
  const step1El    = document.getElementById('step-1');
  const step2El    = document.getElementById('step-2');
  const step3El    = document.getElementById('step-3');
  const nextBtn1   = document.getElementById('next-step-1');
  const nextBtn2   = document.getElementById('next-step-2');
  const backBtn2   = document.getElementById('back-step-2');
  const backBtn3   = document.getElementById('back-step-3');
  const submitBtn  = document.getElementById('submit-signup');

  let currentStep  = 1;
  const steps      = [step1El, step2El, step3El];

  function goTo(stepNum) {
    steps.forEach((s, i) => {
      if (!s) return;
      s.style.display = (i + 1 === stepNum) ? 'flex' : 'none';
    });
    currentStep = stepNum;
    updateStepper(stepNum);
  }

  function updateStepper(active) {
    document.querySelectorAll('.step').forEach((el, idx) => {
      el.classList.remove('active', 'done');
      if (idx + 1 < active)  el.classList.add('done');
      if (idx + 1 === active) el.classList.add('active');
    });
    document.querySelectorAll('.step-line').forEach((el, idx) => {
      el.classList.toggle('done', idx + 1 < active);
    });
  }

  goTo(1);

  // ── Live Roll No Preview ─────────────────────────────────
  const rollInput  = document.getElementById('roll-no');
  const rollPreview = document.getElementById('roll-preview');
  const emailInput = document.getElementById('student-email');

  if (rollInput) {
    rollInput.addEventListener('input', () => {
      const val = formatRollInput(rollInput);

      if (rollPreview) {
        rollPreview.textContent = val || '23F-0000';
      }

      // Auto-fill email
      if (Validate.rollNo(val) && emailInput) {
        const expected = Validate.email(val);
        emailInput.value = expected;
        emailInput.dispatchEvent(new Event('input'));
      }
    });

    // Format on blur
    rollInput.addEventListener('blur', () => {
      const raw = rollInput.value.replace(/\s/g,'').toUpperCase();
      // Try to auto-format if typed without dash
      const noFmt = raw.match(/^(\d{2})F(\d{4})$/);
      if (noFmt) rollInput.value = `${noFmt[1]}F-${noFmt[2]}`;
    });
  }

  // ── Password Strength ────────────────────────────────────
  const pwInput    = document.getElementById('password');
  const pw2Input   = document.getElementById('confirm-password');

  if (pwInput) {
    const bars   = document.querySelectorAll('.strength-bar');
    const label  = document.querySelector('.strength-label');

    pwInput.addEventListener('input', () => {
      const { score, strength } = Validate.password(pwInput.value);
      bars.forEach((b, i) => {
        b.classList.remove('filled-weak','filled-medium','filled-strong');
        if (i < score) b.classList.add(`filled-${strength}`);
      });
      if (label) {
        label.textContent = pwInput.value ? strength.charAt(0).toUpperCase() + strength.slice(1) : '';
        label.className = `strength-label ${pwInput.value ? strength : ''}`;
      }
    });
  }

  // ── Password Toggle ──────────────────────────────────────
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const isText = target.type === 'text';
      target.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  // ── Step Navigation ──────────────────────────────────────
  if (nextBtn1) {
    nextBtn1.addEventListener('click', () => {
      const roll  = document.getElementById('roll-no').value.trim();
      const name  = document.getElementById('full-name').value.trim();
      const email = document.getElementById('student-email').value.trim();

      let valid = true;

      if (!name) {
        showFieldError('full-name', 'Please enter your full name.');
        valid = false;
      } else clearFieldError('full-name');

      if (!Validate.rollNo(roll)) {
        showFieldError('roll-no', 'Format must be: 23F-0000');
        valid = false;
      } else clearFieldError('roll-no');

      if (!Validate.studentEmail(email)) {
        showFieldError('student-email', 'Must be your official FAST email, e.g. f230001@cfd.nu.edu.pk');
        valid = false;
      } else clearFieldError('student-email');

      if (valid) goTo(2);
    });
  }

  if (nextBtn2) {
    nextBtn2.addEventListener('click', () => {
      const pw  = document.getElementById('password').value;
      const pw2 = document.getElementById('confirm-password').value;
      let valid = true;

      const { score } = Validate.password(pw);
      if (score < 2) {
        showFieldError('password', 'Password too weak. Use at least 8 chars, 1 uppercase, 1 number.');
        valid = false;
      } else clearFieldError('password');

      if (pw !== pw2) {
        showFieldError('confirm-password', 'Passwords do not match.');
        valid = false;
      } else clearFieldError('confirm-password');

      if (valid) goTo(3);
    });
  }

  if (backBtn2) backBtn2.addEventListener('click', () => goTo(1));
  if (backBtn3) backBtn3.addEventListener('click', () => goTo(2));

  // ── Submit ───────────────────────────────────────────────
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const semester = document.getElementById('semester').value;
      const dept = document.getElementById('dept-signup').value;
      if (!semester) {
        showFieldError('semester', 'Please select your semester.');
        return;
      } else {
        clearFieldError('semester');
      }
      if (!dept) {
        showFieldError('dept-signup', 'Please select your department.');
        return;
      } else {
        clearFieldError('dept-signup');
      }

      setButtonLoading(submitBtn, true);

      const result = await Auth.signup({
        rollNo:   document.getElementById('roll-no').value.trim(),
        name:     document.getElementById('full-name').value.trim(),
        email:    document.getElementById('student-email').value.trim(),
        password: document.getElementById('password').value,
        semester: semester,
        department: dept
      });

      setButtonLoading(submitBtn, false);

      if (result.ok) {
        const msg = result.msg || 'Account created! Redirecting…';
        showToast(msg, 'success');
        if (!result.msg) window.location.href = 'dashboard.html';
      } else {
        showToast(result.msg, 'error');
      }
    });
  }

  
}

/* ════════════════════════════════════════════════════════════
   LOGIN LOGIC
   ════════════════════════════════════════════════════════════ */
function initLogin() {
  const submitBtn = document.getElementById('submit-login');
  const rollInput = document.getElementById('login-roll');
  const pwInput   = document.getElementById('login-password');

  // ── Password Toggle ──────────────────────────────────────
  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const isText = target.type === 'text';
      target.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  // ── Enter key submit ─────────────────────────────────────
  [rollInput, pwInput].forEach(el => {
    if (!el) return;
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') submitBtn?.click();
    });
  });

  // ── Roll No Formatting ──────────────────────────────────
  if (rollInput) {
    rollInput.addEventListener('input', () => {
      formatRollInput(rollInput);
    });
  }

  // ── Submit ───────────────────────────────────────────────
  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const roll = rollInput?.value.trim() || '';
      const pw   = pwInput?.value || '';
      let valid  = true;

      if (!Validate.rollNo(roll)) {
        showFieldError('login-roll', 'Format: 23F-0000');
        valid = false;
      } else clearFieldError('login-roll');

      if (!pw) {
        showFieldError('login-password', 'Please enter your password.');
        valid = false;
      } else clearFieldError('login-password');

      if (!valid) return;

      setButtonLoading(submitBtn, true);

      const result = await Auth.login(roll, pw);
      setButtonLoading(submitBtn, false);

      if (result.ok) {
        showToast(`Welcome back, ${result.user.name}!`, 'success');
        window.location.href = 'dashboard.html';
      } else {
        showToast(result.msg, 'error');
        showFieldError('login-roll', result.msg);
      }
    });
  }

}

/* ════════════════════════════════════════════════════════════
   FORGOT PASSWORD LOGIC
   ════════════════════════════════════════════════════════════ */
function initForgotPassword() {
  const emailInput = document.getElementById('reset-email');
  const submitBtn  = document.getElementById('submit-forgot');

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const email = emailInput?.value.trim() || '';
      if (!Validate.studentEmail(email)) {
        showFieldError('reset-email', 'Enter your FAST email, e.g. f230001@cfd.nu.edu.pk');
        return;
      }
      clearFieldError('reset-email');

      setButtonLoading(submitBtn, true);

      const redirectBase = (window.location.origin && window.location.origin !== 'null')
        ? window.location.origin
        : window.location.href.replace(/\/[^\/]*$/, '');
      const redirectTo = `${redirectBase}/reset-password.html`;

      let result = { ok: true, msg: '' };
      if (typeof Auth.requestPasswordReset === 'function') {
        result = await Auth.requestPasswordReset(email, redirectTo);
      }

      setButtonLoading(submitBtn, false);

      if (result.ok) {
        showToast(result.msg || 'Reset link sent. Check your email.', 'success');
        if (result.redirect) {
          window.location.href = result.redirect;
        }
      } else {
        showToast(result.msg || 'Unable to send reset link.', 'error');
      }
    });
  }
}

/* ════════════════════════════════════════════════════════════
   RESET PASSWORD LOGIC
   ════════════════════════════════════════════════════════════ */
function initResetPassword() {
  const pwInput  = document.getElementById('new-password');
  const pw2Input = document.getElementById('confirm-new-password');
  const submitBtn = document.getElementById('submit-reset');

  document.querySelectorAll('.toggle-pw').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (!target) return;
      const isText = target.type === 'text';
      target.type = isText ? 'password' : 'text';
      btn.textContent = isText ? '👁' : '🙈';
    });
  });

  if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
      const pw  = pwInput?.value || '';
      const pw2 = pw2Input?.value || '';

      const { score } = Validate.password(pw);
      if (score < 2) {
        showFieldError('new-password', 'Password too weak. Use at least 8 chars, 1 uppercase, 1 number.');
        return;
      }
      clearFieldError('new-password');

      if (pw !== pw2) {
        showFieldError('confirm-new-password', 'Passwords do not match.');
        return;
      }
      clearFieldError('confirm-new-password');

      setButtonLoading(submitBtn, true);

      let result = { ok: true, msg: '' };
      if (typeof Auth.resetPassword === 'function') {
        const hash = window.location.hash.replace(/^#/, '');
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        result = await Auth.resetPassword(pw, { accessToken, refreshToken });
      }

      setButtonLoading(submitBtn, false);

      if (result.ok) {
        showToast(result.msg || 'Password updated. Please sign in.', 'success');
        window.location.href = 'login.html';
      } else {
        showToast(result.msg || 'Unable to reset password.', 'error');
      }
    });
  }
}

/* ── Helpers ────────────────────────────────────────────────── */
function showFieldError(fieldId, msg) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.add('error');
  let errEl = field.parentElement.querySelector('.form-error');
  if (!errEl) errEl = field.closest('.form-group')?.querySelector('.form-error');
  if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
}

function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.remove('error');
  let errEl = field.parentElement.querySelector('.form-error');
  if (!errEl) errEl = field.closest('.form-group')?.querySelector('.form-error');
  if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible'); }
}

function setButtonLoading(btn, isLoading) {
  if (isLoading) {
    btn.dataset.origText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> Checking…`;
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.origText || btn.innerHTML;
    btn.disabled = false;
  }
}

function fakeDelay() {
  return Promise.resolve();
}
