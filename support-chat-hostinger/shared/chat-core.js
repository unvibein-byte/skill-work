/* global firebase, SKILLWORK_FIREBASE_CONFIG */

(function (global) {
  const COL_THREADS = 'support_threads';
  const COL_MESSAGES = 'messages';
  const CONFIG_DOC = { collection: 'config', id: 'support' };
  const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

  let db = null;
  let storage = null;
  let configCache = null;

  function normalizePhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return digits.slice(-10);
  }

  function initFirebase() {
    if (!global.firebase?.apps?.length) {
      global.firebase.initializeApp(SKILLWORK_FIREBASE_CONFIG);
    }
    if (!db) db = global.firebase.firestore();
    return db;
  }

  function initStorage() {
    initFirebase();
    if (!storage) storage = global.firebase.storage();
    return storage;
  }

  async function getSupportConfig() {
    if (configCache) return configCache;
    initFirebase();
    const snap = await db.collection(CONFIG_DOC.collection).doc(CONFIG_DOC.id).get();
    const d = snap.exists ? snap.data() : {};
    configCache = {
      adminPin: String(d.adminPin || d.supportAdminPin || 'skillwork2026'),
      pageTitle: d.pageTitle || 'Contact Support',
    };
    return configCache;
  }

  function threadRef(phone) {
    return db.collection(COL_THREADS).doc(normalizePhone(phone));
  }

  function messagesRef(phone) {
    return threadRef(phone).collection(COL_MESSAGES);
  }

  function getLastMessagePreview(payload) {
    if (payload.type === 'image') {
      const cap = String(payload.text || '').trim();
      return cap ? `📷 ${cap}` : '📷 Image';
    }
    return String(payload.text || '').trim();
  }

  async function ensureThread(phone, name) {
    initFirebase();
    const id = normalizePhone(phone);
    if (!id || id.length < 10) throw new Error('Invalid phone number');
    const ref = threadRef(id);
    const snap = await ref.get();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    if (!snap.exists) {
      await ref.set({
        phone: id,
        name: (name || '').trim() || 'User',
        lastMessage: '',
        lastMessageAt: now,
        unreadAdmin: 0,
        unreadUser: 0,
        blocked: false,
        createdAt: now,
      });
    } else if (name && name.trim()) {
      await ref.set({ name: name.trim() }, { merge: true });
    }
    return id;
  }

  async function getThread(phone) {
    initFirebase();
    const snap = await threadRef(phone).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data() };
  }

  function listenThread(phone, onUpdate, onError) {
    initFirebase();
    return threadRef(phone).onSnapshot(
      (snap) => onUpdate(snap.exists ? { id: snap.id, ...snap.data() } : null),
      onError || console.error
    );
  }

  async function assertUserCanSend(phone) {
    const thread = await getThread(phone);
    if (thread?.blocked) {
      const err = new Error('This chat has been blocked by support.');
      err.code = 'CHAT_BLOCKED';
      throw err;
    }
  }

  async function uploadChatImage(phone, file) {
    if (!file || !file.type.startsWith('image/')) {
      const err = new Error('Please choose an image file.');
      err.code = 'INVALID_FILE';
      throw err;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const err = new Error('Image must be 5 MB or smaller.');
      err.code = 'FILE_TOO_LARGE';
      throw err;
    }

    initStorage();
    const id = normalizePhone(phone);
    const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '') || 'jpg';
    const path = `support_chat/${id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const ref = storage.ref(path);
    await ref.put(file, { contentType: file.type });
    const imageUrl = await ref.getDownloadURL();
    return { imageUrl, imagePath: path };
  }

  async function sendMessage(phone, payload, sender) {
    initFirebase();
    const id = await ensureThread(phone);
    const isAdmin = sender === 'admin';

    if (!isAdmin) await assertUserCanSend(id);

    const type = payload.type === 'image' ? 'image' : 'text';
    let msg;

    if (type === 'image') {
      if (!payload.imageUrl) throw new Error('Missing image URL');
      msg = {
        type: 'image',
        text: String(payload.text || '').trim(),
        imageUrl: payload.imageUrl,
        imagePath: payload.imagePath || '',
        sender: isAdmin ? 'admin' : 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false,
      };
    } else {
      const trimmed = String(payload.text || '').trim();
      if (!trimmed) return null;
      msg = {
        type: 'text',
        text: trimmed,
        sender: isAdmin ? 'admin' : 'user',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        read: false,
      };
    }

    const preview = getLastMessagePreview(msg);
    await messagesRef(id).add(msg);

    const threadUpdate = {
      lastMessage: preview,
      lastMessageAt: firebase.firestore.FieldValue.serverTimestamp(),
      phone: id,
    };

    if (isAdmin) {
      threadUpdate.unreadUser = firebase.firestore.FieldValue.increment(1);
      threadUpdate.unreadAdmin = 0;
      threadUpdate.lastSender = 'admin';
    } else {
      threadUpdate.unreadAdmin = firebase.firestore.FieldValue.increment(1);
      threadUpdate.lastSender = 'user';
      threadUpdate.hasUserMessage = true;
    }

    await threadRef(id).set(threadUpdate, { merge: true });
    return true;
  }

  async function sendTextMessage(phone, text, sender) {
    return sendMessage(phone, { type: 'text', text }, sender);
  }

  async function sendImageMessage(phone, file, sender, caption) {
    const { imageUrl, imagePath } = await uploadChatImage(phone, file);
    return sendMessage(
      phone,
      { type: 'image', text: caption || '', imageUrl, imagePath },
      sender
    );
  }

  async function setThreadBlocked(phone, blocked) {
    initFirebase();
    const id = normalizePhone(phone);
    await threadRef(id).set(
      {
        blocked: !!blocked,
        blockedAt: blocked
          ? firebase.firestore.FieldValue.serverTimestamp()
          : null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  }

  function listenMessages(phone, onUpdate, onError) {
    initFirebase();
    const id = normalizePhone(phone);
    return messagesRef(id)
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          onUpdate(list);
        },
        onError || console.error
      );
  }

  /** Only chats where the user has sent at least one message. */
  async function loadAllUsersWithThreads() {
    initFirebase();
    const nameByPhone = new Map();

    try {
      const usersSnap = await db.collection('users').get();
      usersSnap.forEach((doc) => {
        const data = doc.data() || {};
        const p = normalizePhone(doc.id || data.phone);
        if (p && p.length >= 10) {
          nameByPhone.set(p, data.name || data.displayName || 'User');
        }
      });
    } catch (e) {
      console.warn('Could not load users collection for names', e);
    }

    const threadsSnap = await db.collection(COL_THREADS).get();
    const chats = [];

    threadsSnap.forEach((doc) => {
      const data = doc.data() || {};
      const p = normalizePhone(doc.id);
      if (!p || p.length < 10) return;
      if (!(data.hasUserMessage === true || data.lastSender === 'user')) return;

      chats.push({
        ...data,
        phone: p,
        name: data.name || nameByPhone.get(p) || 'User',
        hasChat: true,
      });
    });

    return chats.sort((a, b) => {
      const ta = a.lastMessageAt?.toMillis?.() ?? 0;
      const tb = b.lastMessageAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
  }

  async function markThreadReadByAdmin(phone) {
    initFirebase();
    await threadRef(phone).set({ unreadAdmin: 0 }, { merge: true });
  }

  function formatTime(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** Build DOM bubble for a message (text or image). */
  function appendMessageBubble(container, m, options) {
    const opts = options || {};
    const isUser = m.sender === 'user';
    const div = document.createElement('div');
    div.className = `msg ${isUser ? 'user' : 'admin'}`;

    let body = '';
    if (m.type === 'image' && m.imageUrl) {
      const safeUrl = escapeHtml(m.imageUrl);
      body = `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer"><img class="msg-image" src="${safeUrl}" alt="Image" loading="lazy" /></a>`;
      if (m.text && String(m.text).trim()) {
        body += `<div class="msg-caption">${escapeHtml(String(m.text).trim())}</div>`;
      }
    } else {
      body = `<div>${escapeHtml(m.text || '')}</div>`;
    }

    const who = opts.showWho
      ? ` · ${isUser ? opts.userLabel || 'User' : 'You'}`
      : '';
    div.innerHTML = `${body}<div class="msg-meta">${formatTime(m.createdAt)}${who}</div>`;
    container.appendChild(div);
    return div;
  }

  global.SupportChat = {
    normalizePhone,
    initFirebase,
    getSupportConfig,
    ensureThread,
    getThread,
    listenThread,
    sendMessage,
    sendTextMessage,
    sendImageMessage,
    setThreadBlocked,
    listenMessages,
    loadAllUsersWithThreads,
    markThreadReadByAdmin,
    formatTime,
    escapeHtml,
    appendMessageBubble,
    MAX_IMAGE_BYTES,
    USER_QUICK_REPLIES: [
      'Hello',
      'Hi',
      'I need help with payment',
      'KYC verification issue',
      'Withdrawal problem',
      'My account is blocked',
      'Thank you',
    ],
    ADMIN_QUICK_REPLIES: [
      'Hello! How can we help you today?',
      'Hi there! Thanks for reaching out.',
      'Please share your registered mobile number.',
      'We are checking your account. Please wait a moment.',
      'Your payment is being verified.',
      'KYC documents received. Review within 24–48 hours.',
      'Your withdrawal will be processed soon.',
      'This issue has been resolved. Anything else?',
      'Sorry for the inconvenience. We are on it.',
    ],
  };
})(window);
