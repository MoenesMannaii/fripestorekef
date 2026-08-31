# AEVE — Logiciel Point de Vente Intelligent

> A fully offline Point of Sale system built with Next.js + Express, packaged as a Windows desktop app.

---

## 📦 Where is the build output?

After running the build, look inside:

```
electron-app/
└── dist/
    ├── FripeStore POS Setup 1.0.0.exe   ← Installer — send this to client
    └── win-unpacked/
        └── FripeStore POS.exe            ← Portable launcher (no install needed)
```

**To give the app to a client:**
1. Copy `FripeStore POS Setup 1.0.0.exe` to a USB drive and run it on the client PC, **or**
2. Zip the entire `win-unpacked/` folder, extract it anywhere (e.g. `C:\FripeStore\`), and double-click `FripeStore POS.exe`
3. Done — no browser, no Node.js installation required

---

## 💻 What does the client need?

| Requirement | Details |
|---|---|
| **Windows** | Windows 10 or 11 (64-bit) |
| **Node.js** | NOT needed — bundled inside the app |
| **Browser** | NOT needed — Electron is the window |
| **Internet** | NOT needed — fully offline |
| **Database** | Auto-created on first launch in AppData |

> The database is saved at:
> `C:\Users\<username>\AppData\Roaming\FripeStore POS\database\offline_pos.db`
> It persists across app updates and reinstalls.

---

## 🔧 Making changes and rebuilding

The source code lives in:
```
fripestorekef/
├── local/
│   ├── fr/          ← Frontend (Next.js / React)
│   └── back/        ← Backend (Express / SQLite)
└── electron-app/    ← Electron wrapper (main.js, splash, assets)
```

### Step-by-step to update and rebuild:

**1. Make your code changes** in `local/fr/` (frontend) or `local/back/` (backend).

**2. Rebuild the app** — open PowerShell in the project root and run:
```powershell
powershell -ExecutionPolicy Bypass -File BUILD.ps1
```

**3. The new installer and package** will appear in `electron-app/dist/`.

> [!NOTE]
> - **Frontend changes**: `BUILD.ps1` skips recompiling the frontend if `electron-app/frontend/out/index.html` already exists. **Delete `electron-app/frontend/`** before running the script if you changed any frontend code.
> - **Backend changes**: `BUILD.ps1` automatically copies `local/back/` into `electron-app/backend/` on every build. No manual syncing needed.

---

## 🏃 Development mode (without building)

```powershell
# Terminal 1 — Start the backend
cd local/back
npm install
npm start

# Terminal 2 — Start the frontend
cd local/fr
npm install
npm run dev

# Open browser at http://localhost:3000
```

> In dev mode the app runs in a browser tab, not Electron.
> Use this for fast iteration — hot-reload, no rebuild required.

---

## 📁 Project Structure

```
fripestorekef/
│
├── local/
│   ├── fr/                    ← Next.js Frontend
│   │   ├── app/               ← Pages (page.tsx files)
│   │   ├── components/        ← Reusable UI components
│   │   └── next.config.mjs    ← Config (output: 'export')
│   │
│   └── back/                  ← Express Backend
│       ├── index.js           ← Server entry point
│       └── container/
│           ├── Controllers/   ← Business logic
│           ├── Models/        ← Database models (Sequelize)
│           ├── Routes/        ← API endpoints
│           └── database/      ← SQLite init + schema
│
├── electron-app/              ← Electron Wrapper
│   ├── main.js                ← Electron entry (spawns backend, opens window)
│   ├── splash.html            ← Loading screen
│   ├── backend/               ← Auto-generated copy of back/ (do not edit directly)
│   ├── frontend/out/          ← Auto-generated built Next.js static files
│   ├── resources/node/        ← Bundled node.exe (for client machines)
│   └── dist/                  ← Build output → deliverable installer + app
│
└── BUILD.ps1                  ← One-click build script
```

---

## 🏗️ Starting a NEW POS project

Reuse this as a base for a new business:

1. Copy the entire `fripestorekef/` folder and rename it (e.g. `restoproject/`)
2. In `electron-app/package.json`, update:
   ```json
   {
     "name": "my-resto-pos",
     "build": {
       "appId": "com.yourname.restopos",
       "productName": "Resto POS"
     }
   }
   ```
3. Update the splash screen title in `electron-app/splash.html`
4. Replace `electron-app/aeve_logo.png` with your logo (used to auto-generate the icon)
5. Edit the database schema in `local/back/container/database/init.js`
6. Modify the frontend pages and backend controllers for your business
7. Run `BUILD.ps1` to get a new packaged `.exe`

---

## 🔑 Default Login Credentials

| Field | Value |
|---|---|
| Email | `admin@aeve.com` |
| Password | `admin2K26` |
| PIN | `0000` |

> **Change these before delivering to a client!**
> Edit: `local/back/container/database/init.js`

---

## ❓ Common Issues

| Problem | Solution |
|---|---|
| Opens but shows the UI correctly on first use but not after | Wait 5–10 seconds for the backend to start, then the window reloads automatically |
| App opens but shows blank white page | Close and reopen — the backend may need a few seconds on first launch |
| Shows `{"message":"Offline POS Backend"}` | Frontend static files are missing. Run `BUILD.ps1` from scratch (delete `electron-app/frontend/` first) |
| `Cannot find module '...'` error at startup | Incomplete install. Re-run `BUILD.ps1` to reinstall backend dependencies cleanly |
| Cash drawer does not open | Check USB/COM port connection — works natively on Windows |
| Printer not found | App continues without printer — cash drawer still works |
| Database lost after reinstall | Data is in `AppData\Roaming\FripeStore POS\` — back up that folder before reinstalling |
| Build fails with icon error | The `electron-app/aeve_logo.png` may be missing or corrupt. Ensure it is a valid PNG |
