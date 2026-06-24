# Deploy to user.24hrwork.space & admin.24hrwork.space

## Step 1 — Build upload folders (on your PC)

Open terminal in `support-chat-hostinger` and run:

```bash
npm run build:deploy
```

This creates two folders:

| Folder | Upload to |
|--------|-----------|
| `deploy-user/` | **user.24hrwork.space** |
| `deploy-admin/` | **admin.24hrwork.space** |

Each folder contains `index.html`, app JS/CSS, and a `shared/` folder (Firebase + chat logic).

---

## Step 2 — Create subdomains in Hostinger

1. Log in to **Hostinger hPanel**
2. Open your domain **24hrwork.space**
3. Go to **Domains → Subdomains** (or **Websites → Subdomains**)
4. Create:
   - `user` → document root e.g. `domains/24hrwork.space/public_html/user` or auto path `public_html` for subdomain
   - `admin` → document root for admin subdomain

Hostinger usually creates folders like:

- `public_html` (main site)
- Or separate roots: `user.24hrwork.space` folder and `admin.24hrwork.space` folder

Note the **exact folder path** for each subdomain (File Manager shows it).

---

## Step 3 — Upload files

### user.24hrwork.space

1. File Manager → open the folder for **user** subdomain (often `domains/user.24hrwork.space/public_html` or similar)
2. Delete default `index.php` / old files if any
3. Upload **everything inside** `deploy-user/` (not the folder itself):

```
public_html/   (user subdomain root)
├── index.html
├── user.js
├── user.css
├── .htaccess
└── shared/
    ├── firebase-config.js
    ├── chat-core.js
    └── chat.css
```

4. Open https://user.24hrwork.space/ — you should see the chat page (add `?phone=9876543210&name=Test` to test)

### admin.24hrwork.space

1. File Manager → folder for **admin** subdomain
2. Upload **everything inside** `deploy-admin/`:

```
public_html/   (admin subdomain root)
├── index.html
├── admin.js
├── admin.css
├── .htaccess
└── shared/
    ├── firebase-config.js
    ├── chat-core.js
    └── chat.css
```

3. Open https://admin.24hrwork.space/ — sign in with your Firebase `adminPin`

**Tip:** Zip `deploy-user` on PC → upload zip → Extract in File Manager (faster than many small files).

---

## Step 4 — Firebase (SkillWork app)

Firestore → **config** → **support**:

| Field | Value |
|--------|--------|
| `supportUrl` | `https://user.24hrwork.space/` |
| `pageTitle` | `Contact Support` |
| `adminPin` | your secret PIN (change default!) |

The app opens:  
`https://user.24hrwork.space/?phone=…&name=…&embed=1`

---

## Step 5 — SSL (HTTPS)

In hPanel → **SSL** → enable **Free SSL** for both subdomains. Wait a few minutes until https works.

---

## Step 6 — Firebase rules (required)

**Firestore** — allow chat (tighten later for production):

```
support_threads/{phone}  → read, write
support_threads/{phone}/messages/{id}  → read, write
config/support  → read
users/{id}  → read (admin user list)
```

**Storage** — for images:

```
support_chat/{phone}/{file}  → read, write (images under 5MB)
```

See `DEPLOYMENT.md` for example rule snippets.

---

## Checklist

- [ ] `npm run build:deploy` ran successfully
- [ ] `deploy-user` uploaded to user subdomain root
- [ ] `deploy-admin` uploaded to admin subdomain root
- [ ] https://user.24hrwork.space/ loads
- [ ] https://admin.24hrwork.space/ loads and PIN works
- [ ] Firebase `supportUrl` = `https://user.24hrwork.space/`
- [ ] SSL enabled on both subdomains
- [ ] Test from SkillWork app → Settings → Contact Support

---

## Troubleshooting

| Problem | Fix |
|--------|-----|
| Blank page | Browser F12 → Console: 404 on `shared/...`? Re-upload `shared` folder next to `index.html` |
| Chat not in app iframe | `.htaccess` on user subdomain; `frame-ancestors *` header |
| Images fail | Enable Firebase Storage + storage rules |
| Admin empty list | User must send at least one message first |
