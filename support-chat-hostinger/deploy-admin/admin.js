(function () {
  const SESSION_KEY = 'sw_support_admin';
  const loginView = document.getElementById('loginView');
  const adminApp = document.getElementById('adminApp');
  const pinInput = document.getElementById('pinInput');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const userListEl = document.getElementById('userList');
  const searchInput = document.getElementById('searchInput');
  const placeholder = document.getElementById('placeholder');
  const chatPanel = document.getElementById('chatPanel');
  const chatHeader = document.getElementById('chatHeader');
  const blockBtn = document.getElementById('blockBtn');
  const messagesEl = document.getElementById('messages');
  const quickRepliesEl = document.getElementById('quickReplies');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const imageInput = document.getElementById('imageInput');

  let allUsers = [];
  let selectedPhone = null;
  let selectedUser = null;
  let currentThread = null;
  let unsubscribeMessages = null;
  let unsubscribeThread = null;
  let sending = false;

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
  }

  function showAdmin() {
    loginView.classList.add('hidden');
    adminApp.classList.remove('hidden');
    loadUserList();
    setInterval(loadUserList, 30000);
  }

  async function tryLogin() {
    const pin = pinInput.value.trim();
    if (!pin) {
      showLoginError('Enter PIN');
      return;
    }
    loginBtn.disabled = true;
    try {
      const config = await SupportChat.getSupportConfig();
      if (pin !== config.adminPin) {
        showLoginError('Wrong PIN');
        return;
      }
      sessionStorage.setItem(SESSION_KEY, '1');
      showAdmin();
    } catch (e) {
      console.error(e);
      showLoginError('Could not connect to Firebase');
    } finally {
      loginBtn.disabled = false;
    }
  }

  loginBtn.addEventListener('click', tryLogin);
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') tryLogin();
  });

  if (sessionStorage.getItem(SESSION_KEY) === '1') showAdmin();

  SupportChat.ADMIN_QUICK_REPLIES.forEach((text) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'quick-chip';
    chip.textContent = text.length > 28 ? `${text.slice(0, 26)}…` : text;
    chip.title = text;
    chip.addEventListener('click', () => sendText(text));
    quickRepliesEl.appendChild(chip);
  });

  function updateBlockButton() {
    if (!selectedPhone) return;
    const blocked = !!currentThread?.blocked;
    blockBtn.textContent = blocked ? 'Unblock chat' : 'Block chat';
    blockBtn.classList.toggle('block-btn-active', blocked);
  }

  blockBtn.addEventListener('click', async () => {
    if (!selectedPhone) return;
    const willBlock = !currentThread?.blocked;
    const label = willBlock ? 'Block this user from sending messages?' : 'Unblock this chat?';
    if (!window.confirm(label)) return;
    try {
      await SupportChat.setThreadBlocked(selectedPhone, willBlock);
      currentThread = { ...currentThread, blocked: willBlock };
      updateBlockButton();
      loadUserList();
    } catch (e) {
      console.error(e);
      alert('Could not update block status');
    }
  });

  async function loadUserList() {
    try {
      allUsers = await SupportChat.loadAllUsersWithThreads();
      renderUserList();
    } catch (e) {
      console.error(e);
    }
  }

  function renderUserList() {
    const q = searchInput.value.trim().toLowerCase();
    const filtered = allUsers.filter((u) => {
      if (!q) return true;
      return (
        String(u.phone).includes(q) ||
        String(u.name || '').toLowerCase().includes(q) ||
        String(u.lastMessage || '').toLowerCase().includes(q)
      );
    });

    userListEl.innerHTML = '';
    if (!filtered.length) {
      userListEl.innerHTML = '<p class="empty-state">No messages yet — waiting for users to chat</p>';
      return;
    }

    filtered.forEach((u) => {
      const el = document.createElement('div');
      el.className = 'user-item' + (u.phone === selectedPhone ? ' active' : '');
      const unread = Number(u.unreadAdmin) || 0;
      const blockedTag = u.blocked ? ' <span class="badge badge-muted">blocked</span>' : '';
      el.innerHTML = `
        <div class="user-item-name">
          ${SupportChat.escapeHtml(u.name || 'User')}
          ${unread > 0 ? `<span class="badge">${unread}</span>` : ''}${blockedTag}
        </div>
        <div class="user-item-phone">+91 ${SupportChat.escapeHtml(u.phone)}</div>
        <div class="user-item-preview">${SupportChat.escapeHtml(u.lastMessage || 'No messages yet')}</div>
      `;
      el.addEventListener('click', () => selectUser(u));
      userListEl.appendChild(el);
    });
  }

  searchInput.addEventListener('input', renderUserList);

  function selectUser(user) {
    selectedPhone = user.phone;
    selectedUser = user;
    currentThread = user;
    chatHeader.textContent = `${user.name || 'User'} · +91 ${user.phone}`;
    placeholder.classList.add('hidden');
    chatPanel.classList.remove('hidden');
    chatPanel.style.display = 'flex';
    updateBlockButton();

    if (unsubscribeMessages) unsubscribeMessages();
    if (unsubscribeThread) unsubscribeThread();

    SupportChat.markThreadReadByAdmin(user.phone);
    unsubscribeThread = SupportChat.listenThread(user.phone, (thread) => {
      currentThread = thread || { phone: user.phone, blocked: false };
      updateBlockButton();
    });
    unsubscribeMessages = SupportChat.listenMessages(user.phone, renderMessages, console.error);
    renderUserList();
    loadUserList();
  }

  function renderMessages(list) {
    messagesEl.innerHTML = '';
    if (!list.length) {
      messagesEl.innerHTML = '<p class="empty-state">No messages yet</p>';
      return;
    }
    list.forEach((m) =>
      SupportChat.appendMessageBubble(messagesEl, m, { showWho: true, userLabel: 'User' })
    );
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function runSend(action) {
    if (!selectedPhone || sending) return;
    sending = true;
    sendBtn.disabled = true;
    attachBtn.disabled = true;
    try {
      await action();
      input.value = '';
    } catch (e) {
      console.error(e);
      if (e.code === 'FILE_TOO_LARGE') alert('Image must be 5 MB or smaller.');
      else if (e.code === 'INVALID_FILE') alert('Please choose an image file.');
      else alert('Could not send message');
    } finally {
      sending = false;
      sendBtn.disabled = false;
      attachBtn.disabled = false;
    }
  }

  async function sendText(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    await runSend(() => SupportChat.sendTextMessage(selectedPhone, trimmed, 'admin'));
  }

  async function sendImage(file) {
    const caption = input.value.trim();
    await runSend(() => SupportChat.sendImageMessage(selectedPhone, file, 'admin', caption));
    imageInput.value = '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendText(input.value);
  });

  attachBtn.addEventListener('click', () => imageInput.click());
  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (file) sendImage(file);
  });

  SupportChat.initFirebase();
})();
