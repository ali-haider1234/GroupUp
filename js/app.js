/* ============================================================
   GroupUp — Core Utilities & App State
   ============================================================ */

'use strict';

const SUPABASE_URL = 'https://miqkwrrxwuzgqywqxors.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_tfqe1c5OFyAzQYEGkW2nAg_Vbdwi6EZ';
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  })
  : null;

// ── App State (simulates Supabase session) ──────────────────
const GroupUp = {
  version: '1.0.0',

  // Simulated current user (replace with Supabase auth)
  currentUser: null,

  // Mock user store (disabled; Supabase is the source of truth)
  users: {},

  // Department rules
  canGroupWith(dept1, dept2) {
    // CS/SE/AI can group together; EE only within EE
    const left = normalizeDept(dept1);
    const right = normalizeDept(dept2);
    const csSeAiGroup = ['CS', 'SE', 'AI'];
    if (!left || !right) return false;
    if (left === 'EE') return right === 'EE';
    if (csSeAiGroup.includes(left)) return csSeAiGroup.includes(right);
    return left === right;
  },

  departments: ['CS', 'SE', 'AI', 'EE'],

  domains: [
    'Artificial Intelligence',
    'Machine Learning',
    'Data Science',
    'Web Development',
    'Mobile Development',
    'Cybersecurity',
    'Cloud Computing',
    'Game Development',
    'Embedded Systems',
    'Power Systems',
    'Computer Vision',
    'NLP / Chatbots',
    'Blockchain',
    'IoT',
    'Robotics',
    'AR / VR'
  ]
};

// ── Toast Notifications ─────────────────────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toast-container') || (() => {
    const el = document.createElement('div');
    el.id = 'toast-container';
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon" style="font-size:16px;font-weight:700">${icons[type]}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('exiting');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ── Validation ──────────────────────────────────────────────
const Validate = {
  rollNo(value) {
    const pattern = /^\d{2}F-\d{4}$/;
    return pattern.test(value.trim());
  },

  email(rollNo) {
    // Derive expected email from roll no
    const match = rollNo.match(/^(\d{2})F-(\d{4})$/);
    if (!match) return null;
    return `f${match[1]}${match[2]}@cfd.nu.edu.pk`;
  },

  studentEmail(email) {
    // Allow any @cfd.nu.edu.pk or @nu.edu.pk email
    return /^[fF]\d{6}@(cfd\.)?nu\.edu\.pk$/.test(email.trim());
  },

  password(pw) {
    const checks = {
      length:  pw.length >= 8,
      upper:   /[A-Z]/.test(pw),
      number:  /\d/.test(pw),
      special: /[!@#$%^&*]/.test(pw)
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score, strength: score <= 1 ? 'weak' : score <= 3 ? 'medium' : 'strong' };
  }
};

// ── Auth State ──────────────────────────────────────────────
const Auth = {
  async login(rollNo, password) {
    if (!supabaseClient) {
      return { ok: false, msg: 'Login unavailable. Supabase is not configured.' };
    }

    const email = Validate.email(rollNo);
    if (!email) return { ok: false, msg: 'Invalid roll number format.' };

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) return { ok: false, msg: error.message };

    const profile = await this.fetchProfile(data.user?.id);
    if (!profile) {
      return { ok: false, msg: 'Profile not found for this account.' };
    }

    this.setSession(profile);
    return { ok: true, user: profile };
  },

  async signup(data) {
    if (!supabaseClient) {
      if (GroupUp.users[data.rollNo]) {
        return { ok: false, msg: 'This roll number is already registered.' };
      }
      const newUser = {
        id: 'u' + Date.now(),
        rollNo: data.rollNo,
        name: data.name,
        email: data.email,
        department: data.department || '',
        domain: '',
        skills: [],
        bio: '',
        lookingFor: 'open',
        memberCount: 1,
        maxMembers: 3,
        avatar: null,
        joined: new Date().toISOString().slice(0,7),
        semester: parseInt(data.semester) || 5
      };
      GroupUp.users[data.rollNo] = newUser;
      this.setSession(newUser);
      return { ok: true, user: newUser };
    }

    const { data: signUpData, error } = await supabaseClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          roll_no: data.rollNo,
          full_name: data.name,
          department: data.department || null,
          semester: parseInt(data.semester) || null
        }
      }
    });

    if (error) return { ok: false, msg: error.message };

    const userId = signUpData.user?.id || null;
    if (userId && signUpData.session) {
      await supabaseClient
        .from('profiles')
        .update({
          semester: parseInt(data.semester) || null,
          department: data.department || null
        })
        .eq('user_id', userId);

      const profile = await this.fetchProfile(userId);
      if (profile) this.setSession(profile);
    }

    return { ok: true, msg: signUpData.session ? '' : 'Check your email to verify your account.' };
  },

  async requestPasswordReset(email, redirectTo) {
    if (!supabaseClient) {
      sessionStorage.setItem('groupup_reset_email', email);
      return { ok: true, msg: 'Reset link generated (mock).', redirect: 'reset-password.html' };
    }

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  },

  async resetPassword(newPassword, sessionParams = {}) {
    if (!supabaseClient) {
      sessionStorage.removeItem('groupup_reset_email');
      return { ok: true };
    }

    if (sessionParams.accessToken && sessionParams.refreshToken) {
      const { error: sessionError } = await supabaseClient.auth.setSession({
        access_token: sessionParams.accessToken,
        refresh_token: sessionParams.refreshToken
      });
      if (sessionError) return { ok: false, msg: sessionError.message };
    } else {
      const { data } = await supabaseClient.auth.getSession();
      if (!data?.session) {
        return { ok: false, msg: 'Reset link expired. Please request a new one.' };
      }
    }

    const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, msg: error.message };
    return { ok: true };
  },

  setSession(user) {
    GroupUp.currentUser = user;
    sessionStorage.setItem('groupup_user', JSON.stringify(user));
  },

  getSession() {
    if (GroupUp.currentUser) return GroupUp.currentUser;
    const stored = sessionStorage.getItem('groupup_user');
    if (stored) {
      GroupUp.currentUser = JSON.parse(stored);
      return GroupUp.currentUser;
    }
    return null;
  },

  async logout() {
    if (supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    GroupUp.currentUser = null;
    sessionStorage.removeItem('groupup_user');
  },

  async fetchProfile(userId) {
    if (!supabaseClient || !userId) return null;
    return fetchProfileWithGroupInfo(userId);
  }
};

function mapProfileToUser(profile, options = {}) {
  const group = options.group || null;
  const memberCount = Number.isFinite(options.memberCount) ? options.memberCount : 1;
  const groupId = options.groupId || group?.id || null;
  return {
    id: profile.user_id,
    rollNo: profile.roll_no,
    name: profile.full_name,
    email: profile.email,
    department: normalizeDept(profile.department),
    domain: profile.domain || group?.domain || '',
    skills: profile.skills || [],
    bio: profile.bio,
    lookingFor: group?.status || profile.looking_for || 'open',
    memberCount: memberCount || 1,
    maxMembers: group?.max_members || profile.max_members || 3,
    avatar: getAvatarUrl(profile.avatar_path),
    joined: profile.created_at ? profile.created_at.slice(0, 7) : '',
    semester: profile.semester || null,
    groupId
  };
}

function getAvatarUrl(path) {
  if (!path) return null;
  if (!supabaseClient) return path;
  const { data } = supabaseClient.storage.from('avatars').getPublicUrl(path);
  return data?.publicUrl || null;
}

function normalizeDept(value) {
  return (value || '').toString().trim().toUpperCase();
}

async function ensureGroupForUser(profile) {
  if (!supabaseClient || !profile?.user_id) return null;
  const { data: existing, error: existingError } = await supabaseClient
    .from('groups')
    .select('*')
    .eq('owner_id', profile.user_id)
    .maybeSingle();
  if (existing && !existingError) return existing;

  const { data: created, error: createError } = await supabaseClient
    .from('groups')
    .insert({
      owner_id: profile.user_id,
      domain: profile.domain || null,
      status: profile.looking_for || 'open',
      max_members: profile.max_members || 3
    })
    .select('*')
    .single();
  if (createError) return null;
  return created;
}

async function fetchProfileWithGroupInfo(userId) {
  const { data: profile, error: profileError } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (profileError || !profile) return null;

  let { data: memberRow } = await supabaseClient
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
    .maybeSingle();

  let group = null;
  if (!memberRow?.group_id) {
    group = await ensureGroupForUser(profile);
    memberRow = group ? { group_id: group.id } : null;
  } else {
    const { data: groupData } = await supabaseClient
      .from('groups')
      .select('*')
      .eq('id', memberRow.group_id)
      .single();
    group = groupData || null;
  }

  let memberCount = 1;
  if (memberRow?.group_id) {
    const { count } = await supabaseClient
      .from('group_members')
      .select('group_id', { count: 'exact', head: true })
      .eq('group_id', memberRow.group_id);
    memberCount = count || 1;
  }

  return mapProfileToUser(profile, {
    group,
    groupId: memberRow?.group_id || group?.id || null,
    memberCount
  });
}

async function fetchGroupMaps() {
  const [groupsResult, membersResult] = await Promise.all([
    supabaseClient.from('groups').select('id, owner_id, domain, status, max_members'),
    supabaseClient.from('group_members').select('group_id, user_id')
  ]);

  if (groupsResult.error || membersResult.error) {
    return { groupById: {}, groupIdByUserId: {}, memberCountByGroupId: {} };
  }

  const groupById = {};
  groupsResult.data.forEach(group => {
    groupById[group.id] = group;
  });

  const groupIdByUserId = {};
  const memberCountByGroupId = {};
  membersResult.data.forEach(member => {
    groupIdByUserId[member.user_id] = member.group_id;
    memberCountByGroupId[member.group_id] = (memberCountByGroupId[member.group_id] || 0) + 1;
  });

  return { groupById, groupIdByUserId, memberCountByGroupId };
}

async function fetchProfilesWithGroupInfo() {
  if (!supabaseClient) return Object.values(GroupUp.users);
  const { data: profiles, error } = await supabaseClient.from('profiles').select('*');
  if (error || !profiles) return [];

  const { groupById, groupIdByUserId, memberCountByGroupId } = await fetchGroupMaps();

  return profiles.map(profile => {
    const groupId = groupIdByUserId[profile.user_id];
    const group = groupId ? groupById[groupId] : null;
    const memberCount = groupId ? memberCountByGroupId[groupId] || 1 : 1;
    return mapProfileToUser(profile, { group, groupId, memberCount });
  });
}

async function fetchProfilesByUserIds(userIds) {
  if (!supabaseClient || !userIds?.length) return [];
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .in('user_id', userIds);
  if (error || !data) return [];
  return data.map(profile => mapProfileToUser(profile));
}

async function fetchProfileByRollNo(rollNo) {
  if (!supabaseClient || !rollNo) return null;
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .eq('roll_no', rollNo)
    .single();
  if (error || !data) return null;
  const { groupById, groupIdByUserId, memberCountByGroupId } = await fetchGroupMaps();
  const groupId = groupIdByUserId[data.user_id];
  const group = groupId ? groupById[groupId] : null;
  const memberCount = groupId ? memberCountByGroupId[groupId] || 1 : 1;
  return mapProfileToUser(data, { group, groupId, memberCount });
}

async function fetchRequestsForUser(userId) {
  if (!supabaseClient || !userId) return { incoming: [], sent: [] };
  const [incomingResult, sentResult] = await Promise.all([
    supabaseClient
      .from('connection_requests')
      .select('*')
      .eq('to_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabaseClient
      .from('connection_requests')
      .select('*')
      .eq('from_user_id', userId)
      .order('created_at', { ascending: false })
  ]);

  return {
    incoming: incomingResult.data || [],
    sent: sentResult.data || []
  };
}

async function sendConnectionRequest(fromUserId, toUserId) {
  if (!supabaseClient) return { ok: false, msg: 'Supabase client not available.' };
  const { error } = await supabaseClient
    .from('connection_requests')
    .insert({ from_user_id: fromUserId, to_user_id: toUserId, status: 'pending' });
  if (error) return { ok: false, msg: error.message };
  return { ok: true };
}

async function updateRequestStatus(requestId, status) {
  if (!supabaseClient) return { ok: false, msg: 'Supabase client not available.' };
  const { error } = await supabaseClient
    .from('connection_requests')
    .update({ status })
    .eq('id', requestId);
  if (error) return { ok: false, msg: error.message };
  return { ok: true };
}

async function addMemberToGroup(groupId, userId) {
  if (!supabaseClient || !groupId || !userId) return { ok: false, msg: 'Missing group or user.' };
  const { error } = await supabaseClient
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member' });
  if (error) return { ok: false, msg: error.message };
  return { ok: true };
}

async function uploadAvatarImage(userId, dataUrl) {
  if (!supabaseClient || !userId || !dataUrl) return null;
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) return null;
  const path = `${userId}/${Date.now()}.webp`;
  const { error } = await supabaseClient
    .storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/webp', upsert: true });
  if (error) return null;
  return path;
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  if (parts.length !== 2) return null;
  const byteString = atob(parts[1]);
  const mimeMatch = parts[0].match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/webp';
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

// ── Navbar Scroll Effect ────────────────────────────────────
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 8);
  }, { passive: true });
}

// ── Page Entry Animation ────────────────────────────────────
function initPageAnimation() {
  document.body.classList.add('page-enter');
}

// ── Generic Dropdown ────────────────────────────────────────
function initDropdown(triggerSel, dropdownSel) {
  const trigger = document.querySelector(triggerSel);
  const dropdown = document.querySelector(dropdownSel);
  if (!trigger || !dropdown) return;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
}

// ── Utility Helpers ─────────────────────────────────────────
function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
}

function formatDept(dept) {
  const labels = {
    CS: 'Computer Science',
    SE: 'Software Engineering',
    AI: 'Artificial Intelligence',
    EE: 'Electrical Engineering'
  };
  return labels[dept] || dept;
}

function getMembersNeeded(memberCount, maxMembers = 3) {
  return Math.max(0, maxMembers - memberCount);
}

function getStatusLabel(lookingFor) {
  return { open: 'Looking', almost: 'Almost Full', full: 'Group Complete' }[lookingFor] || 'Open';
}

function deptBadgeColor(dept) {
  return { CS: 'badge-blue', SE: 'badge-green', AI: 'badge-purple', EE: 'badge-orange' }[dept] || 'badge-gray';
}
