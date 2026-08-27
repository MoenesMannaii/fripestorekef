# FripeStore POS — Electron App

> A fully offline Point of Sale system built with Next.js + Express, packaged as a Windows desktop app.

---

## 📦 Where is the `.exe`?

After running the build, the deliverable files are here:

```
electron-app/
└── dist/
    ├── FripeStore-POS-v1.0.0.zip        ← Send this to your client
    └── FripeStore POS-win32-x64/
        └── FripeStore POS.exe            ← The app launcher
```

**To give the app to a client:**
1. Copy `FripeStore-POS-v1.0.0.zip` to a USB drive or send it
2. On the client PC: extract the zip anywhere (e.g. `C:\FripeStore\`)
3. Double-click `FripeStore POS.exe`
4. Done — no installation, no browser, no Node.js needed

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

## 🔧 What if I want to make changes to the app?

The source code lives in:
```
fripestorekef/
├── local/
│   ├── fr/          ← Frontend (Next.js / React)
│   └── back/        ← Backend (Express / SQLite)
└── electron-app/    ← Electron wrapper (main.js, splash, assets)
```

### Step-by-step to update and rebuild:

**1. Make your code changes** in `local/fr/` (frontend) or `local/back/` (backend)

**2. Rebuild the app** — run this from the root folder:
```powershell
# Open PowerShell in: C:\Users\7ALAZOUN\Desktop\fripestorekef\
powershell -ExecutionPolicy Bypass -File BUILD.ps1
```

**3. The new `.exe` will be in** `electron-app/dist/FripeStore POS-win32-x64/`

### If you only changed the frontend:
Delete `electron-app/frontend/out/` so the build script rebuilds it, then run `BUILD.ps1`.

### If you only changed the backend:
Copy the changed files into `electron-app/backend/` and re-run the packager step.

---

## 🏗️ How to start a NEW POS project (Restaurant, Store, etc.)

You can reuse this entire setup as a base for a new business. Here's how:

### Option A — Quick Clone (same tech, new data)
1. Copy the entire `fripestorekef/` folder
2. Rename it (e.g. `restoproject/`)
3. Change the app name in `electron-app/package.json`:
   ```json
   {
     "name": "my-resto-pos",
     "version": "1.0.0",
     "author": "Your Name",
     "build": {
       "appId": "com.yourname.restopos",
       "productName": "Resto POS"
     }
   }
   ```
4. Change the splash screen title in `electron-app/splash.html`
5. Replace `electron-app/assets/icon.ico` with your new icon
6. Modify the frontend pages and backend controllers for your new business
7. Run `BUILD.ps1` to get a new `.exe`

### Option B — Full Reset (fresh database + new UI)
1. Follow Option A above
2. Edit the database schema in:
   `electron-app/backend/container/database/init.js`
3. The database will auto-create fresh on first launch
4. Reset the default admin password in `init.js` (line ~147):
   ```js
   bcrypt.hashSync('YourNewPassword', 10)
   ```

### Typical customizations per business type:

| Business | Changes needed |
|---|---|
| **Restaurant** | Add table/menu management pages, kitchen display |
| **Clothing Store** | Add size/color variants, fitting room tracking |
| **Pharmacy** | Add expiry dates, prescription tracking |
| **Cafe** | Simplify UI, add quick-order buttons |

---

## 🏃 How to run in development (without building)

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

> In dev mode the app runs in a browser window, not Electron.
> Use this for fast development — changes reflect instantly without rebuilding.

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
│   ├── backend/               ← Copy of back/ (used in packaged app)
│   ├── frontend/out/          ← Built Next.js static files
│   ├── resources/node/        ← Bundled node.exe (for client machines)
│   └── dist/                  ← Build output → your deliverable .exe
│
└── BUILD.ps1                  ← One-click build script
```

---

## 🔑 Default Login Credentials

| Field | Value |
|---|---|
| Email | `admin@aeve.com` |
| Password | `admin2K26` |
| PIN | `0000` |

> Change these before delivering to a client!
> Edit: `electron-app/backend/container/database/init.js`

---

## ❓ Common Issues

| Problem | Solution |
|---|---|
| `Cannot find module '@so-ric/colorspace'` (or other missing module) | Incomplete or interrupted `node_modules` install. Open terminal in the backend folder (`resources\app\backend` or `electron-app\backend`) and run `npm install`, or run `BUILD.ps1` from root to rebuild cleanly. |
| Shows `{"message":"Offline POS Backend"}` instead of UI | The backend could not locate the compiled static frontend files (`frontend/out`). Rebuild with `BUILD.ps1` or copy `frontend/out` into the app's `resources\app\frontend\out` directory. |
| App opens but shows blank page | Wait 5-10 seconds for backend to start, then refresh |
| Cash drawer does not open | Check USB/COM port connection — works natively on Windows |
| Printer not found | App continues without printer — cash drawer still works |
| Database lost after reinstall | Data is in `AppData\Roaming\FripeStore POS\` — backup that folder |
| Build fails with Visual Studio error | Use `BUILD.ps1` — it uses system Node.js, no VS needed |

