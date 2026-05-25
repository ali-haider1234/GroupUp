/* ============================================================
   GroupUp — Dashboard Logic
   ============================================================ */

'use strict';

let cachedUsersByRoll = {};
let allUsers = [];
let pendingRequestUserIds = new Set();
let pendingRequestRollNos = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  initPageAnimation();
  initNavbarScroll();
  initUserMenu();

  // Update nav links
  const reqLink = document.querySelector('.nav-link[href="#"]');
  if (reqLink) reqLink.href = 'requests.html';

  // Check auth
  const user = Auth.getSession();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  let activeUser = user;
  if (supabaseClient && activeUser?.id) {
    const refreshed = await fetchProfileWithGroupInfo(activeUser.id);
    if (refreshed) {
      activeUser = refreshed;
      Auth.setSession(refreshed);
    }
  }

  renderNavUser(activeUser);
  renderMyProfileSidebar(activeUser);
  initFilters(activeUser);

  const students = supabaseClient
    ? await fetchProfilesWithGroupInfo()
    : Object.values(GroupUp.users);
  allUsers = students;
  await loadPendingRequests(activeUser);
  renderStudents(students, activeUser);
  renderStats(students);

  
});

/* ── Nav User ────────────────────────────────────────────── */
function renderNavUser(user) {
  const nameEl = document.getElementById('nav-user-name');
  const rollEl = document.getElementById('nav-user-roll');
  const avatarEl = document.getElementById('nav-avatar');

  if (nameEl) nameEl.textContent = user.name.split(' ')[0];
  if (rollEl) rollEl.textContent = user.rollNo;
  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
    } else {
      avatarEl.textContent = getInitials(user.name);
    }
  }
}

/* ── My Sidebar Profile ──────────────────────────────────── */
function renderMyProfileSidebar(user) {
  const nameEl   = document.getElementById('my-name');
  const rollEl   = document.getElementById('my-roll');
  const deptEl   = document.getElementById('my-dept-badge');
  const domainEl = document.getElementById('my-domain-badge');
  const fillEl   = document.getElementById('group-fill');
  const labelEl  = document.getElementById('group-label');
  const avatarEl = document.getElementById('my-avatar');

  if (nameEl)   nameEl.textContent   = user.name;
  if (rollEl)   rollEl.textContent   = user.rollNo;

  if (deptEl) {
    deptEl.textContent = user.department || 'No Dept';
    deptEl.className = `badge ${deptBadgeColor(user.department)}`;
  }

  if (domainEl) {
    domainEl.textContent = user.domain || 'No Domain';
    domainEl.className = 'badge badge-gray';
    if (user.domain) domainEl.style.display = 'inline-flex';
  }

  const count   = user.memberCount  || 1;
  const max     = user.maxMembers   || 3;
  const needed  = max - count;
  const pct     = Math.round((count / max) * 100);

  if (fillEl)  { fillEl.style.width = pct + '%'; }
  if (labelEl) { labelEl.textContent = `${count}/${max} members · need ${needed} more`; }

  if (avatarEl) {
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else {
      avatarEl.innerHTML = `<span style="font-size:24px">${getInitials(user.name)}</span>`;
    }
  }
}

/* ── Stats Bar ───────────────────────────────────────────── */
function renderStats(users = []) {
  document.getElementById('stat-total').textContent  = users.length;
  document.getElementById('stat-open').textContent   = users.filter(u => u.lookingFor === 'open').length;
  document.getElementById('stat-almost').textContent = users.filter(u => u.lookingFor === 'almost').length;
  document.getElementById('stat-full').textContent   = users.filter(u => u.lookingFor === 'full').length;
}

/* ── Filters ─────────────────────────────────────────────── */
function initFilters(currentUser) {
  const searchEl  = document.getElementById('filter-search');
  const deptEl    = document.getElementById('filter-dept');
  const domainEl  = document.getElementById('filter-domain');
  const statusEl  = document.getElementById('filter-status');

  // Chips
  document.querySelectorAll('.filter-chip[data-filter]').forEach(chip => {
    chip.addEventListener('click', () => {
      chip.classList.toggle('active');
      applyFilters();
    });
  });

  [searchEl, deptEl, domainEl, statusEl].forEach(el => {
    if (el) el.addEventListener('input', applyFilters);
  });

  function applyFilters() {
    const q       = searchEl?.value.toLowerCase().trim() || '';
    const dept    = deptEl?.value   || '';
    const domain  = domainEl?.value || '';
    const status  = statusEl?.value || '';
    const looking = document.querySelector('.filter-chip[data-filter="looking"]')?.classList.contains('active');

    let users = allUsers.filter(u => u.rollNo !== currentUser?.rollNo);

    // Always filter by department compatibility (CS sees CS+SE, EE sees only EE)
    if (currentUser) users = users.filter(u => GroupUp.canGroupWith(currentUser.department, u.department));

    if (q)      users = users.filter(u => u.name.toLowerCase().includes(q) || u.rollNo.toLowerCase().includes(q) || u.domain.toLowerCase().includes(q));
    if (dept)   users = users.filter(u => u.department === dept);
    if (domain) users = users.filter(u => u.domain === domain);
    if (status) users = users.filter(u => u.lookingFor === status);
    if (looking) users = users.filter(u => u.lookingFor !== 'full');

    renderStudents(users, currentUser);
  }
}

/* ── Students Grid ───────────────────────────────────────── */
function renderStudents(users, currentUser) {
  const grid   = document.getElementById('students-grid');
  const countEl = document.getElementById('student-count');
  if (!grid) return;

  cachedUsersByRoll = users.reduce((acc, user) => {
    acc[user.rollNo] = user;
    return acc;
  }, {});

  // Exclude self
  const filtered = users.filter(u => u.rollNo !== currentUser?.rollNo);
  if (countEl) countEl.textContent = `${filtered.length} students`;

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">No students found</div>
        <div class="empty-sub">Try adjusting your filters</div>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(u => buildStudentCard(u, currentUser)).join('');

  // Keyboard accessibility for cards
  grid.querySelectorAll('.student-card').forEach(card => {
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigateToProfile(card.dataset.roll);
      }
    });
  });

  // Connect button — quick connect from card (no page nav)
  grid.querySelectorAll('.btn-connect').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const roll   = btn.dataset.roll;
      const target = cachedUsersByRoll[roll];
      handleConnect(target, currentUser, btn);
    });
  });
}

// Navigate to student's full profile page
function navigateToProfile(rollNo) {
  window.location.href = `view-profile.html?roll=${rollNo}`;
}

window.navigateToProfile = navigateToProfile;

function buildStudentCard(u, currentUser) {
  const needed  = getMembersNeeded(u.memberCount, u.maxMembers);
  const compatible = currentUser ? GroupUp.canGroupWith(currentUser.department, u.department) : true;
  const statusCls = { open: 'open', almost: 'almost', full: 'full' }[u.lookingFor] || 'open';
  const isSelf = currentUser?.rollNo === u.rollNo;
  const isPending = supabaseClient
    ? pendingRequestUserIds.has(u.id)
    : pendingRequestRollNos.has(u.rollNo);

  // Build member dots
  let dots = '';
  for (let i = 0; i < u.maxMembers; i++) {
    if (i < u.memberCount) {
      dots += `<div class="member-dot" title="Member ${i+1}">${i === 0 ? getInitials(u.name) : '+'}</div>`;
    } else {
      dots += `<div class="member-dot empty" title="Open slot">+</div>`;
    }
  }

  const canConnect = compatible && u.lookingFor !== 'full' && !isSelf && !isPending;

  return `
    <div class="student-card" data-roll="${u.rollNo}" role="button" tabindex="0"
         aria-label="View ${u.name}'s profile"
         onclick="navigateToProfile('${u.rollNo}')">

      <div class="status-pill ${statusCls}">
        <div class="status-dot"></div>
        ${getStatusLabel(u.lookingFor)}
      </div>

      <div class="card-header">
        <div class="student-avatar" aria-hidden="true">
          ${u.avatar
            ? `<img src="${u.avatar}" alt="${u.name}" loading="lazy">`
            : `<span style="font-size:20px;color:var(--blue-400)">${getInitials(u.name)}</span>`}
        </div>
        <div class="student-info">
          <div class="student-name">${u.name}</div>
          <div class="student-roll">${u.rollNo}</div>
          <div style="margin-top:5px">
            <span class="badge ${deptBadgeColor(u.department)}">${u.department}</span>
            ${!compatible && currentUser ? `<span class="badge badge-gray" style="margin-left:4px" title="Dept. restriction applies">⚠ Restricted</span>` : ''}
          </div>
        </div>
      </div>

      <div class="student-domain">
        <span class="domain-icon">◎</span>
        <span>${u.domain || 'Domain not set'}</span>
      </div>

      <div class="members-indicator">
        <div class="members-dots">${dots}</div>
        <div class="members-text">
          <strong>${u.memberCount}/${u.maxMembers}</strong> members · <strong>${needed}</strong> spot${needed !== 1 ? 's' : ''} left
        </div>
      </div>

      <div class="card-actions" onclick="event.stopPropagation()">
        <a href="view-profile.html?roll=${u.rollNo}" class="btn btn-outline btn-sm" aria-label="View ${u.name}'s full profile">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View Profile
        </a>
        ${canConnect
          ? `<button class="btn btn-primary btn-sm btn-connect" data-roll="${u.rollNo}"
               aria-label="Send connect request to ${u.name}">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
               Connect
             </button>`
          : `<button class="btn btn-sm" style="background:var(--gray-100);color:var(--gray-400);cursor:not-allowed;flex:1" disabled aria-disabled="true">
               ${isPending ? '⏳ Pending' : u.lookingFor === 'full' ? '🔒 Full' : isSelf ? '👤 You' : '⛔ Restricted'}
             </button>`
        }
      </div>
    </div>`;
}

/* ── Connect Action (from card quick-connect) ────────────── */

async function handleConnect(target, currentUser, btn) {
  if (!currentUser) {
    showToast('Please log in to connect.', 'error');
    return;
  }
  const isPending = supabaseClient
    ? pendingRequestUserIds.has(target?.id)
    : pendingRequestRollNos.has(target?.rollNo);
  if (isPending) {
    showToast('Request already pending.', 'info');
    return;
  }
  if (!GroupUp.canGroupWith(currentUser.department, target.department)) {
    showToast(`⛔ Dept. rule: ${currentUser.department} cannot group with ${target.department}.`, 'error');
    return;
  }
  if (target.lookingFor === 'full') {
    showToast('This group is already complete.', 'error');
    return;
  }

  // Visual feedback on button
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>';
  }

  if (supabaseClient && currentUser?.id && target?.id) {
    const result = await sendConnectionRequest(currentUser.id, target.id);
    if (!result.ok) {
      showToast(result.msg || 'Failed to send request.', 'error');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Connect';
      }
      return;
    }
    pendingRequestUserIds.add(target.id);
  } else if (target?.rollNo) {
    pendingRequestRollNos.add(target.rollNo);
  }

  if (btn) {
    btn.innerHTML = '⏳ Pending';
    btn.style.background = 'var(--blue-700)';
  }

  // Track in session
  const sent = JSON.parse(sessionStorage.getItem('sent_requests') || '[]');
  if (!sent.includes(target.rollNo)) {
    sent.push(target.rollNo);
    sessionStorage.setItem('sent_requests', JSON.stringify(sent));
  }

  showToast(`✓ Request sent to ${target.name}!`, 'success');
}

async function loadPendingRequests(currentUser) {
  pendingRequestUserIds = new Set();
  pendingRequestRollNos = new Set();

  if (supabaseClient && currentUser?.id) {
    const { data, error } = await supabaseClient
      .from('connection_requests')
      .select('to_user_id')
      .eq('from_user_id', currentUser.id)
      .eq('status', 'pending');
    if (!error && data) {
      data.forEach(row => pendingRequestUserIds.add(row.to_user_id));
    }
    return;
  }

  const sent = JSON.parse(sessionStorage.getItem('sent_requests') || '[]');
  sent.forEach(roll => pendingRequestRollNos.add(roll));
}

window.handleConnect = handleConnect;

/* ── User Menu Dropdown ──────────────────────────────────── */
function initUserMenu() {
  initDropdown('#nav-user-trigger', '#user-dropdown');

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
      window.location.href = 'login.html';
    });
  }
}
