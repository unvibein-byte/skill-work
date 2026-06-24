(function () {
  const params = new URLSearchParams(window.location.search);
  const phone = SupportChat.normalizePhone(params.get('phone') || params.get('userId') || '');
  const name = (params.get('name') || '').trim();
  const embed = params.get('embed') === '1';

  const errorEl = document.getElementById('error');
  const blockedBanner = document.getElementById('blockedBanner');
  const messagesEl = document.getElementById('messages');
  const emptyHint = document.getElementById('emptyHint');
  const quickRepliesEl = document.getElementById('quickReplies');
  const form = document.getElementById('composerForm');
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const imageInput = document.getElementById('imageInput');

  let chatBlocked = false;
  let sending = false;
  let unsubscribeThread = null;

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }

  function setComposerEnabled(enabled) {
    input.disabled = !enabled;
    sendBtn.disabled = !enabled || sending;
    attachBtn.disabled = !enabled || sending;
    if (!enabled) {
      input.placeholder = 'Chat blocked';
    } else {
      input.placeholder = 'Type a message…';
    }
  }

  function applyBlockedState(blocked) {
    chatBlocked = !!blocked;
    if (chatBlocked) {
      blockedBanner.classList.remove('hidden');
      setComposerEnabled(false);
    } else {
      blockedBanner.classList.add('hidden');
      setComposerEnabled(true);
    }
  }

  if (!phone || phone.length < 10) {
    showError('Missing phone number. Open this page from the 24hrwork app.');
    document.getElementById('app').classList.add('hidden');
    return;
  }

  if (name) {
    document.getElementById('headerSub').textContent = `Logged in as ${name} · +91 ${phone}`;
  } else {
    document.getElementById('headerSub').textContent = `+91 ${phone}`;
  }

  if (embed) document.body.style.background = '#fff';

  SupportChat.USER_QUICK_REPLIES.forEach((text) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'quick-chip';
    chip.textContent = text;
    chip.addEventListener('click', () => {
      if (chatBlocked) return;
      input.value = text;
      input.focus();
    });
    quickRepliesEl.appendChild(chip);
  });

  function renderMessages(list) {
    messagesEl.querySelectorAll('.msg').forEach((el) => el.remove());
    if (!list.length) {
      emptyHint.classList.remove('hidden');
      if (!messagesEl.contains(emptyHint)) messagesEl.appendChild(emptyHint);
    } else {
      emptyHint.classList.add('hidden');
      list.forEach((m) => SupportChat.appendMessageBubble(messagesEl, m));
    }
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function runSend(action) {
    if (sending || chatBlocked) return;
    sending = true;
    setComposerEnabled(true);
    try {
      await action();
      input.value = '';
    } catch (e) {
      console.error(e);
      if (e.code === 'CHAT_BLOCKED') {
        applyBlockedState(true);
        showError(e.message);
      } else if (e.code === 'FILE_TOO_LARGE') {
        showError('Image must be 5 MB or smaller.');
      } else if (e.code === 'INVALID_FILE') {
        showError('Please choose an image file.');
      } else {
        showError('Could not send. Try again.');
      }
    } finally {
      sending = false;
      if (!chatBlocked) setComposerEnabled(true);
    }
  }

  async function sendText(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    await runSend(() => SupportChat.sendTextMessage(phone, trimmed, 'user'));
  }

  async function sendImage(file) {
    const caption = input.value.trim();
    await runSend(() => SupportChat.sendImageMessage(phone, file, 'user', caption));
    imageInput.value = '';
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    sendText(input.value);
  });

  attachBtn.addEventListener('click', () => {
    if (!chatBlocked) imageInput.click();
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (file) sendImage(file);
  });

  SupportChat.initFirebase();
  unsubscribeThread = SupportChat.listenThread(phone, (thread) => {
    applyBlockedState(thread?.blocked);
  });
  SupportChat.listenMessages(phone, renderMessages, (err) => {
    console.error(err);
    showError('Connection error. Refresh the page.');
  });
})();
