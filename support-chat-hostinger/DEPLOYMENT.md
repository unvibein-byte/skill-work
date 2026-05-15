# SkillWork Support Chat — Hostinger deployment

## Folder layout

```
support-chat-hostinger/
├── shared/           ← Firebase + shared chat logic (both apps use this)
│   ├── firebase-config.js
│   ├── chat-core.js
│   └── chat.css
├── user/             ← End-user chat (opened from SkillWork app)
│   ├── index.html
│   ├── user.js
│   └── user.css
├── admin/            ← Support team inbox
│   ├── index.html
│   ├── admin.js
│   └── admin.css
├── index.html        ← Redirects to user/
├── .htaccess
└── package.json
```

Upload the **entire** `support-chat-hostinger` folder to Hostinger.

## URLs

| App | URL |
|-----|-----|
| User chat | `https://yourdomain.com/user/` |
| Admin | `https://yourdomain.com/admin/` |

Set Firebase `config/support.supportUrl` to the **user** URL, e.g.  
`https://support.yourdomain.com/user/`

The SkillWork app opens:  
`supportUrl?phone=…&name=…&embed=1`

## Run locally

```bash
cd support-chat-hostinger
npm start
```

| Page | URL |
|------|-----|
| User | http://localhost:5174/user/?phone=9876543210&name=Test |
| Admin | http://localhost:5174/admin/ |

## Firebase setup

Firestore → **config** → **support**:

| Field | Example |
|--------|---------|
| `supportUrl` | `https://support.yourdomain.com/user/` |
| `pageTitle` | `Contact Support` |
| `adminPin` | your-secret-pin |

See earlier sections in this file for Storage rules, Firestore rules, and indexes.

## Admin usage

1. Open `/admin/`
2. Sign in with `adminPin`
3. Reply with text, images (📷), or quick replies
4. **Block chat** to stop a user from sending

## User features

- Text + images (📷, max 5 MB)
- Blocked users see a banner and cannot send
