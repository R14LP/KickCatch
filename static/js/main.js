const T = {
    en: {
        loginHint: "Connect your Kick account to get started",
        btnLogin: "Login with Kick",
        loginDiffAcc: "+ Connect different account",
        optStart: "Start", optEnd: "End", optRandom: "Random",
        btnOpen: "Open", btnBonk: "Bonk!", btnBan: "Ban",
        btnSpamDelete: "Clear Spam", btnHide: "Hide", btnShow: "Show",
        banPlaceholder: "Username...",
        deletePrompt: "Delete account '{user}'?",
        btnDelete: "Delete", btnCancel: "Cancel",
        lastOpened: "Last: {n}",
        spamAlert: "Spam removed: {users} ({n} links deleted)",
        banSuccess: "Banned {user}", banFail: "Ban failed",
        notAuth: "No authenticated account",
        filterAll: "All",
    },
    tr: {
        loginHint: "Başlamak için Kick hesabını bağla",
        btnLogin: "Kick ile Giriş Yap",
        loginDiffAcc: "+ Farklı hesap bağla",
        optStart: "Baştan", optEnd: "Sondan", optRandom: "Rastgele",
        btnOpen: "Aç", btnBonk: "Bonk!", btnBan: "Banla",
        btnSpamDelete: "Spam Sil", btnHide: "Gizle", btnShow: "Göster",
        banPlaceholder: "Kullanıcı adı...",
        deletePrompt: "'{user}' hesabını sil?",
        btnDelete: "Sil", btnCancel: "İptal",
        lastOpened: "Son: {n}",
        spamAlert: "Spam silindi: {users} ({n} link)",
        banSuccess: "{user} banlandı", banFail: "Ban başarısız",
        notAuth: "Giriş yapılmış hesap yok",
        filterAll: "Hepsi",
    }
};

let lang = 'en';
let linksQueue = [];
let lastOpened = [];
let pusher = null;
let chatChannel = null;
let savedAccounts = [];
let accountToDelete = null;
let activeUser = null;
let activeBroadcasterId = null;
let linksHidden = false;
let activeFilter = 'all';

const $ = id => document.getElementById(id);

const loginScreen       = $('login-screen');
const savedProfilesView = $('saved-profiles-view');
const newLoginView      = $('new-login-view');
const profilesList      = $('profiles-list');
const btnShowNewLogin   = $('btn-show-new-login');
const btnBackProfiles   = $('btn-back-profiles');
const mainApp           = $('main-app');
const activeUserBadge   = $('active-user-badge');
const loginStatus       = $('login-status');
const loginLangToggle   = $('login-lang-toggle');
const appLangToggle     = $('app-lang-toggle');
const btnOauthLogin     = $('btn-oauth-login');
const optStart          = $('opt-start');
const optEnd            = $('opt-end');
const optRandom         = $('opt-random');
const btnOpen           = $('btn-open');
const btnBonk           = $('btn-bonk');
const btnSpamDelete     = $('btn-spam-delete');
const btnHideLinks      = $('btn-hide-links');
const banWrapper        = $('ban-wrapper');
const banInput          = $('ban-input');
const btnBan            = $('btn-ban');
const linksContainer    = $('links-container');
const linkCountInput    = $('link-count');
const linkOrderSelect   = $('link-order');
const emoteContainer    = $('emote-container');
const bonkNames         = $('bonk-names');
const deleteModal       = $('delete-modal');
const deleteModalText   = $('delete-modal-text');
const btnConfirmDelete  = $('btn-confirm-delete');
const btnCancelDelete   = $('btn-cancel-delete');
const lastOpenedBadge   = $('last-opened-badge');
const lastOpenedCount   = $('last-opened-count');
const spamAlert         = $('spam-alert');
const spamAlertText     = $('spam-alert-text');
const spamAlertClose    = $('spam-alert-close');

const trashSVG = `<svg viewBox="0 0 24 24" width="15" height="15"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;

function t(key, vars = {}) {
    let s = T[lang][key] || key;
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v);
    return s;
}

function updateLang() {
    document.querySelector('.login-hint') && (document.querySelector('.login-hint').textContent = t('loginHint'));
    if (btnOauthLogin) btnOauthLogin.textContent = t('btnLogin');
    if (btnShowNewLogin) btnShowNewLogin.textContent = t('loginDiffAcc');
    if (optStart) optStart.textContent = t('optStart');
    if (optEnd) optEnd.textContent = t('optEnd');
    if (optRandom) optRandom.textContent = t('optRandom');
    if (btnOpen) btnOpen.textContent = t('btnOpen');
    if (btnBonk) btnBonk.textContent = t('btnBonk');
    if (btnBan) btnBan.textContent = t('btnBan');
    if (btnSpamDelete) btnSpamDelete.textContent = t('btnSpamDelete');
    if (banInput) banInput.placeholder = t('banPlaceholder');
    if (btnConfirmDelete) btnConfirmDelete.textContent = t('btnDelete');
    if (btnCancelDelete) btnCancelDelete.textContent = t('btnCancel');
    if (btnHideLinks) btnHideLinks.textContent = linksHidden ? t('btnShow') : t('btnHide');
    const btnFilterAll = $('btn-filter-all');
    if (btnFilterAll) btnFilterAll.textContent = t('filterAll');
    if (accountToDelete && deleteModalText) {
        deleteModalText.textContent = t('deletePrompt', { user: accountToDelete });
    }
    if (loginLangToggle) loginLangToggle.value = lang;
    if (appLangToggle) appLangToggle.value = lang;
}

loginLangToggle?.addEventListener('change', e => { lang = e.target.value; updateLang(); });
appLangToggle?.addEventListener('change', e => { lang = e.target.value; updateLang(); });

async function loadAccounts() {
    const res = await fetch('/auth/accounts');
    const data = await res.json();
    savedAccounts = data.accounts || [];
}

function initLoginScreen() {
    if (savedAccounts.length > 0) {
        savedProfilesView.classList.remove('hidden');
        newLoginView.classList.add('hidden');
        btnBackProfiles?.classList.remove('hidden');
        renderProfiles();
    } else {
        savedProfilesView.classList.add('hidden');
        newLoginView.classList.remove('hidden');
        btnBackProfiles?.classList.add('hidden');
    }
}

function renderProfiles() {
    profilesList.innerHTML = '';
    savedAccounts.forEach(acc => {
        const div = document.createElement('div');
        div.className = 'profile-card';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'profile-name';
        nameSpan.textContent = `@${acc.username}`;
        nameSpan.addEventListener('click', () => connectToKick(acc.username));

        const trash = document.createElement('button');
        trash.className = 'trash-btn';
        trash.innerHTML = trashSVG;
        trash.addEventListener('click', e => {
            e.stopPropagation();
            accountToDelete = acc.username;
            deleteModalText.textContent = t('deletePrompt', { user: acc.username });
            deleteModal.classList.remove('hidden');
        });

        div.appendChild(nameSpan);
        div.appendChild(trash);
        profilesList.appendChild(div);
    });
}

btnShowNewLogin?.addEventListener('click', () => {
    savedProfilesView.classList.add('hidden');
    newLoginView.classList.remove('hidden');
});

btnBackProfiles?.addEventListener('click', () => {
    savedProfilesView.classList.remove('hidden');
    newLoginView.classList.add('hidden');
});

btnOauthLogin?.addEventListener('click', () => { window.location.href = '/auth/login'; });

btnCancelDelete?.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
    accountToDelete = null;
});

btnConfirmDelete?.addEventListener('click', async () => {
    await fetch('/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: accountToDelete })
    });
    deleteModal.classList.add('hidden');
    accountToDelete = null;
    await loadAccounts();
    initLoginScreen();
});

async function connectToKick(username) {
    try {
        const res = await fetch('/api/get_room', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username })
        });
        const data = await res.json();
        if (!data.id) throw new Error('Room not found');

        activeUser = username;
        activeBroadcasterId = data.broadcaster_id || null;
        activeUserBadge.textContent = `@${username}`;

        if (pusher) pusher.disconnect();
        pusher = new Pusher('32cbd69e4b950bf97679', { cluster: 'us2', forceTLS: true });
        chatChannel = pusher.subscribe(`chatrooms.${data.id}.v2`);

        chatChannel.bind('App\\Events\\ChatMessageEvent', eventData => {
            const urls = (eventData.content || '').match(/(https?:\/\/[^\s]+)/g);
            if (!urls) return;
            const sender = eventData.sender || {};
            const isSub = !!(sender.is_subscribed || (sender.identity && sender.identity.badge));
            const uname = sender.username || sender.slug || sender.name || '?';
            urls.forEach(url => {
                linksQueue.push({
                    id: Date.now() + Math.random(),
                    username: uname,
                    url,
                    opened: false,
                    isSub,
                    time: new Date(),
                });
            });
            renderLinks();
        });

        loginScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
    } catch (e) {
        console.error(e);
        alert('Connection failed: ' + e.message);
    }
}

function matchesFilter(url) {
    if (activeFilter === 'all') return true;
    try {
        const host = new URL(url).hostname.toLowerCase().replace('www.', '');
        const filters = activeFilter.split(' ');
        return filters.some(f => host.includes(f));
    } catch { return false; }
}

document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderLinks();
    });
});

btnSpamDelete?.addEventListener('click', () => {
    const seenUrls = new Set();
    const toDelete = new Set();
    const spamUsers = new Set();

    [...linksQueue].forEach(link => {
        if (link.opened) return;
        if (seenUrls.has(link.url)) {
            toDelete.add(link.id);
            spamUsers.add(link.username);
        } else {
            seenUrls.add(link.url);
        }
    });

    if (toDelete.size === 0) return;

    const users = [...spamUsers].join(', ');
    const count = toDelete.size;
    linksQueue = linksQueue.filter(l => !toDelete.has(l.id));

    spamAlertText.textContent = t('spamAlert', { users, n: count });
    spamAlert.classList.remove('hidden');
    renderLinks();
});

spamAlertClose?.addEventListener('click', () => spamAlert.classList.add('hidden'));

function getFavicon(url) {
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch { return null; }
}

function timeStr(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderLinks() {
    if (linksHidden) return;
    const visible = linksQueue.filter(l => matchesFilter(l.url));
    linksContainer.innerHTML = '';
    visible.forEach(link => {
        const div = document.createElement('div');
        div.className = 'link-block';
        if (link.opened) div.classList.add('opened');

        const favicon = getFavicon(link.url);
        const faviconHTML = favicon
            ? `<img class="link-favicon" src="${favicon}" onerror="this.style.display='none'">`
            : '';

        div.innerHTML = `
            <div class="link-username ${link.opened ? 'dimmed' : ''}">
                ${link.username}
                ${link.isSub ? '<span class="sub-badge">SUB</span>' : ''}
            </div>
            <div class="link-url">
                ${faviconHTML}
                <span class="link-url-text">${link.url}</span>
            </div>
            <div class="link-time">${timeStr(link.time)}</div>
        `;

        div.addEventListener('click', e => {
            if (e.ctrlKey || e.metaKey) return;
            if (!link.opened) openLink(link);
        });

        linksContainer.appendChild(div);
    });
}

function openLink(linkObj) {
    const a = document.createElement('a');
    a.href = linkObj.url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    linkObj.opened = true;
    lastOpened = [linkObj];
    updateLastOpenedBadge();
    renderLinks();
}

function updateLastOpenedBadge() {
    if (lastOpened.length > 0) {
        lastOpenedCount.textContent = t('lastOpened', { n: lastOpened.length });
        lastOpenedBadge.classList.remove('hidden');
    } else {
        lastOpenedBadge.classList.add('hidden');
    }
}

linkCountInput?.addEventListener('change', function () {
    let v = parseInt(this.value);
    if (isNaN(v) || v < 1) this.value = 1;
    else if (v > 10) this.value = 10;
});

btnOpen?.addEventListener('click', () => {
    let count = parseInt(linkCountInput.value);
    const order = linkOrderSelect.value;
    const available = linksQueue.filter(l => !l.opened && matchesFilter(l.url));
    if (!available.length) return;
    if (count > available.length) count = available.length;

    let toOpen = [];
    if (order === 'start') toOpen = available.slice(0, count);
    else if (order === 'end') toOpen = available.slice(-count);
    else toOpen = [...available].sort(() => 0.5 - Math.random()).slice(0, count);

    lastOpened = [...toOpen];
    toOpen.forEach(link => {
        link.opened = true;
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });

    updateLastOpenedBadge();
    renderLinks();
});

btnBonk?.addEventListener('click', () => {
    if (!lastOpened.length) return;
    bonkNames.innerHTML = lastOpened.map((l, i) => `<div>${i + 1}. ${l.username}</div>`).join('');
    emoteContainer.classList.remove('hidden');
    setTimeout(() => emoteContainer.classList.add('hidden'), 4000);
});

btnBan?.addEventListener('click', () => {
    banWrapper.classList.toggle('show-search');
    if (banWrapper.classList.contains('show-search')) banInput.focus();
});

banInput?.addEventListener('keydown', async e => {
    if (e.key !== 'Enter') return;
    const target = banInput.value.trim();
    if (!target || !activeUser) { alert(t('notAuth')); return; }

    const res = await fetch('/api/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            mod_username: activeUser,
            broadcaster_id: activeBroadcasterId,
            target_username: target,
            reason: 'Banned via KickCatch',
        })
    });
    const data = await res.json();
    alert(data.ok ? t('banSuccess', { user: target }) : t('banFail'));
    banInput.value = '';
    banWrapper.classList.remove('show-search');
});

btnHideLinks?.addEventListener('click', () => {
    linksHidden = !linksHidden;
    btnHideLinks.textContent = linksHidden ? t('btnShow') : t('btnHide');
    linksContainer.style.display = linksHidden ? 'none' : '';
});

async function init() {
    await loadAccounts();
    const params = new URLSearchParams(window.location.search);
    const loggedIn = params.get('logged_in');
    if (loggedIn) {
        window.history.replaceState({}, '', '/');
        loginStatus.textContent = `✓ Connected as @${loggedIn}`;
        loginStatus.classList.remove('hidden', 'error');
        await loadAccounts();
        setTimeout(() => connectToKick(loggedIn), 600);
        return;
    }
    initLoginScreen();
    updateLang();
}

init();
