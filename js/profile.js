/* ============================================================
   GroupUp — Profile Page Logic
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initPageAnimation();
  initNavbarScroll();
  initUserMenu();

  const user = Auth.getSession();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  renderNavUser(user);
  renderAvatarDisplay(user);
  populateForm(user);
  initAvatarEditor(user);
  initSkillsTags();
  initDomainDropdown();
  initSaveActions(user);
  initLookingToggles();

  
});

/* ── Nav User ────────────────────────────────────────────── */
function renderNavUser(user) {
  const nameEl   = document.getElementById('nav-user-name');
  const rollEl   = document.getElementById('nav-user-roll');
  const avatarEl = document.getElementById('nav-avatar');
  if (nameEl)   nameEl.textContent = user.name.split(' ')[0];
  if (rollEl)   rollEl.textContent = user.rollNo;
  if (avatarEl) {
    avatarEl.innerHTML = user.avatar
      ? `<img src="${user.avatar}" alt="${user.name}">`
      : getInitials(user.name);
  }
}

function renderAvatarDisplay(user) {
  const displayEl = document.getElementById('avatar-display');
  if (!displayEl) return;

  if (user.avatar) {
    displayEl.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
  } else {
    displayEl.innerHTML = `<span id="avatar-initials">${getInitials(user.name)}</span>`;
  }
}

/* ── Populate Form ───────────────────────────────────────── */
function populateForm(user) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  set('profile-name',     user.name);
  set('profile-roll',     user.rollNo);
  set('profile-email',    user.email);
  set('profile-dept',     user.department);
  set('profile-domain',   user.domain);
  set('profile-bio',      user.bio);
  set('profile-semester', user.semester);
  set('profile-max',      user.maxMembers || 3);

  // Side card
  const sideNameEl  = document.getElementById('side-name');
  const sideRollEl  = document.getElementById('side-roll');
  const sideDeptEl  = document.getElementById('side-dept');
  const sideDomainEl = document.getElementById('side-domain');

  if (sideNameEl)  sideNameEl.textContent  = user.name;
  if (sideRollEl)  sideRollEl.textContent  = user.rollNo;
  if (sideDeptEl)  { sideDeptEl.textContent = user.department || '—'; sideDeptEl.className = `badge ${deptBadgeColor(user.department)}`; }
  if (sideDomainEl) { sideDomainEl.textContent = user.domain || '—'; }

  renderAvatarDisplay(user);

  // Group status
  renderGroupStatus(user);

  // Skills
  if (user.skills?.length) {
    user.skills.forEach(s => addSkillTag(s));
  }

  // Looking for
  const lookingVal = user.lookingFor || 'open';
  document.querySelectorAll('.toggle-option').forEach(opt => {
    if (opt.dataset.val === lookingVal) opt.classList.add('selected');
  });
}

function renderGroupStatus(user) {
  const countEl = document.getElementById('gs-count');
  const neededEl = document.getElementById('gs-needed');
  const statusEl = document.getElementById('gs-status');
  const fillEl   = document.getElementById('gs-fill');

  const count  = user.memberCount || 1;
  const max    = user.maxMembers  || 3;
  const needed = max - count;

  if (countEl)  countEl.textContent  = `${count} / ${max}`;
  if (neededEl) neededEl.textContent = needed > 0 ? `${needed} more` : 'Complete!';
  if (statusEl) {
    statusEl.textContent  = getStatusLabel(user.lookingFor || 'open');
    statusEl.className    = `group-status-val ${user.lookingFor}`;
  }
  if (fillEl)   fillEl.style.width = `${(count / max) * 100}%`;
}

/* ── Avatar Editor ───────────────────────────────────────── */
function initAvatarEditor(user) {
  const editBtn    = document.getElementById('avatar-edit-btn');
  const overlay    = document.getElementById('avatar-modal-overlay');
  const closeBtn   = document.getElementById('avatar-modal-close');
  const applyBtn   = document.getElementById('avatar-apply');
  const fileInput  = document.getElementById('avatar-file');
  const uploadZone = document.getElementById('upload-zone');
  const viewport   = document.getElementById('avatar-viewport');
  const viewImg    = document.getElementById('avatar-view-img');
  const zoomSlider = document.getElementById('zoom-slider');
  const previewEl  = document.getElementById('avatar-display');
  const removeBtn  = document.getElementById('avatar-remove');

  let imgSrc = user.avatar || null;
  let zoom   = 1;
  let posX   = 0, posY = 0;
  let isDragging = false;
  let startX = 0, startY = 0;

  function openModal() {
    imgSrc = user.avatar || null;
    zoom = 1; posX = 0; posY = 0;
    if (zoomSlider) zoomSlider.value = 100;
    overlay.classList.add('open');
    if (imgSrc) {
      viewImg.src = imgSrc;
      viewImg.style.display = 'block';
      applyTransform();
    } else {
      viewImg.style.display = 'none';
    }
  }

  function closeModal() {
    overlay.classList.remove('open');
  }

  if (editBtn)  editBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  // Upload zone
  if (uploadZone && fileInput) {
    uploadZone.addEventListener('click', () => fileInput.click());

    ['dragover', 'dragenter'].forEach(ev => {
      uploadZone.addEventListener(ev, e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    });
    ['dragleave', 'drop'].forEach(ev => {
      uploadZone.addEventListener(ev, e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        if (ev === 'drop') loadFile(e.dataTransfer.files[0]);
      });
    });

    fileInput.addEventListener('change', () => loadFile(fileInput.files[0]));
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please select an image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      imgSrc = e.target.result;
      zoom = 1; posX = 0; posY = 0;
      if (zoomSlider) zoomSlider.value = 100;
      viewImg.src = imgSrc;
      viewImg.style.display = 'block';
      applyTransform();
    };
    reader.readAsDataURL(file);
  }

  // Zoom
  if (zoomSlider) {
    zoomSlider.addEventListener('input', () => {
      zoom = zoomSlider.value / 100;
      applyTransform();
    });
  }

  // D-Pad movement
  const STEP = 10;
  document.querySelectorAll('.dpad-btn[data-dir]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dir = btn.dataset.dir;
      if (dir === 'up')    posY -= STEP;
      if (dir === 'down')  posY += STEP;
      if (dir === 'left')  posX -= STEP;
      if (dir === 'right') posX += STEP;
      applyTransform();
    });
  });

  // Drag pan in viewport
  if (viewport && viewImg) {
    viewport.addEventListener('mousedown', e => {
      if (!imgSrc) return;
      isDragging = true;
      startX = e.clientX - posX;
      startY = e.clientY - posY;
      viewport.classList.add('grabbing');
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      posX = e.clientX - startX;
      posY = e.clientY - startY;
      applyTransform();
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      viewport?.classList.remove('grabbing');
    });

    // Touch
    viewport.addEventListener('touchstart', e => {
      if (!imgSrc) return;
      const t = e.touches[0];
      isDragging = true;
      startX = t.clientX - posX;
      startY = t.clientY - posY;
      e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const t = e.touches[0];
      posX = t.clientX - startX;
      posY = t.clientY - startY;
      applyTransform();
    });

    document.addEventListener('touchend', () => { isDragging = false; });
  }

  function applyTransform() {
    if (!viewImg) return;
    viewImg.style.transform = `translate(${posX}px, ${posY}px) scale(${zoom})`;
  }

  // Reset
  const resetBtn = document.getElementById('avatar-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      zoom = 1; posX = 0; posY = 0;
      if (zoomSlider) zoomSlider.value = 100;
      applyTransform();
    });
  }

  // Apply → crop to circle via canvas
  const applyLabel = applyBtn ? applyBtn.innerHTML : '';

  if (applyBtn) {
    applyBtn.addEventListener('click', async () => {
      if (!imgSrc) { showToast('Please upload an image first.', 'error'); return; }

      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE; canvas.height = SIZE;
      const ctx = canvas.getContext('2d');

      const img = new Image();
      img.onload = async () => {
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.save();
        ctx.beginPath();
        ctx.arc(SIZE/2, SIZE/2, SIZE/2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const scaledW = img.naturalWidth  * zoom;
        const scaledH = img.naturalHeight * zoom;
        const drawX   = (SIZE - scaledW) / 2 + posX * zoom;
        const drawY   = (SIZE - scaledH) / 2 + posY * zoom;

        ctx.drawImage(img, drawX, drawY, scaledW, scaledH);
        ctx.restore();

        const result = canvas.toDataURL('image/webp', 0.92);

        // Update preview
        if (previewEl) {
          previewEl.innerHTML = `<img src="${result}" alt="Profile photo">`;
        }

        let avatarPath = null;
        if (supabaseClient && user?.id) {
          applyBtn.disabled = true;
          applyBtn.innerHTML = '<span class="spinner"></span> Uploading…';
          avatarPath = await uploadAvatarImage(user.id, result);
          if (avatarPath) {
            await supabaseClient
              .from('profiles')
              .update({ avatar_path: avatarPath })
              .eq('user_id', user.id);
          } else {
            showToast('Avatar upload failed. Try again.', 'error');
          }
          applyBtn.disabled = false;
          applyBtn.innerHTML = applyLabel || 'Apply';
        }

        user.avatar = avatarPath ? getAvatarUrl(avatarPath) : result;
        GroupUp.currentUser.avatar = user.avatar;
        sessionStorage.setItem('groupup_user', JSON.stringify(GroupUp.currentUser));

        renderNavUser(user);
        renderAvatarDisplay(user);

        closeModal();
        showToast('Profile photo updated!', 'success');
      };
      img.src = imgSrc;
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', async () => {
      if (!user.avatar && !imgSrc) {
        showToast('No profile photo to remove.', 'error');
        return;
      }

      imgSrc = null;
      zoom = 1; posX = 0; posY = 0;
      if (zoomSlider) zoomSlider.value = 100;
      if (viewImg) {
        viewImg.src = '';
        viewImg.style.display = 'none';
      }

      if (supabaseClient && user?.id) {
        const { error } = await supabaseClient
          .from('profiles')
          .update({ avatar_path: null })
          .eq('user_id', user.id);
        if (error) {
          showToast(error.message || 'Failed to remove photo.', 'error');
          return;
        }
      }

      user.avatar = null;
      GroupUp.currentUser.avatar = null;
      sessionStorage.setItem('groupup_user', JSON.stringify(GroupUp.currentUser));

      renderNavUser(user);
      renderAvatarDisplay(user);

      closeModal();
      showToast('Profile photo removed.', 'success');
    });
  }
}

/* ── Skills Tags ─────────────────────────────────────────── */
function initSkillsTags() {
  const wrap  = document.getElementById('skills-wrap');
  const input = document.getElementById('skills-input');
  if (!wrap || !input) return;

  input.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
      e.preventDefault();
      addSkillTag(input.value.trim());
      input.value = '';
    }
    if (e.key === 'Backspace' && !input.value) {
      const tags = wrap.querySelectorAll('.skill-tag');
      tags[tags.length - 1]?.remove();
    }
  });

  wrap.addEventListener('click', () => input.focus());
}

function addSkillTag(skill) {
  const wrap = document.getElementById('skills-wrap');
  const input = document.getElementById('skills-input');
  if (!wrap || !skill.trim()) return;

  const tag = document.createElement('span');
  tag.className = 'skill-tag';
  tag.innerHTML = `${skill} <span class="skill-tag-remove" title="Remove">×</span>`;
  tag.querySelector('.skill-tag-remove').addEventListener('click', () => tag.remove());
  wrap.insertBefore(tag, input);
}

/* ── Domain dropdown population ─────────────────────────── */
function initDomainDropdown() {
  const sel = document.getElementById('profile-domain');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = `<option value="">Select project domain</option>`;
  GroupUp.domains.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    if (d === cur) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ── Looking-For Toggles ─────────────────────────────────── */
function initLookingToggles() {
  document.querySelectorAll('.toggle-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.toggle-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

/* ── Save Actions ────────────────────────────────────────── */
function initSaveActions(user) {
  const saveBtn = document.getElementById('save-profile');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async () => {
    const name    = document.getElementById('profile-name')?.value.trim();
    const dept    = document.getElementById('profile-dept')?.value;
    const domain  = document.getElementById('profile-domain')?.value;
    const bio     = document.getElementById('profile-bio')?.value.trim();
    const semester= document.getElementById('profile-semester')?.value;
    const maxM    = parseInt(document.getElementById('profile-max')?.value) || 3;
    const looking = document.querySelector('.toggle-option.selected')?.dataset.val || 'open';

    const skills = [...document.querySelectorAll('#skills-wrap .skill-tag')].map(t =>
      t.textContent.replace('×', '').trim()
    );

    if (!name) { showToast('Name cannot be empty.', 'error'); return; }
    if (!dept) { showToast('Please select your department.', 'error'); return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving…';

    if (supabaseClient && user?.id) {
      const updates = {
        full_name: name,
        department: dept,
        domain: domain || null,
        bio: bio || null,
        semester: semester ? parseInt(semester) : null,
        skills,
        looking_for: looking,
        max_members: maxM
      };

      const { error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        showToast(error.message || 'Failed to save profile.', 'error');
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Save Changes';
        return;
      }

      await ensureGroupForUser({
        user_id: user.id,
        domain: updates.domain,
        looking_for: updates.looking_for,
        max_members: updates.max_members
      });

      await supabaseClient
        .from('groups')
        .update({
          domain: updates.domain,
          status: updates.looking_for,
          max_members: updates.max_members
        })
        .eq('owner_id', user.id);

      const refreshed = await fetchProfileWithGroupInfo(user.id);
      if (refreshed) Object.assign(user, refreshed);
    } else {
      Object.assign(user, { name, department: dept, domain, bio, semester, maxMembers: maxM, lookingFor: looking, skills });
      Object.assign(GroupUp.users[user.rollNo], user);
    }

    Object.assign(GroupUp.currentUser, user);
    sessionStorage.setItem('groupup_user', JSON.stringify(GroupUp.currentUser));

    renderNavUser(user);
    renderAvatarDisplay(user);

    // Re-render side card
    document.getElementById('side-name').textContent   = name;
    const deptBadge = document.getElementById('side-dept');
    if (deptBadge) { deptBadge.textContent = dept; deptBadge.className = `badge ${deptBadgeColor(dept)}`; }
    document.getElementById('side-domain').textContent = domain || '—';
    renderGroupStatus(user);

    saveBtn.disabled = false;
    saveBtn.innerHTML = '✓ Save Changes';
    showToast('Profile saved successfully!', 'success');
  });
}

/* ── User Menu ───────────────────────────────────────────── */
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
