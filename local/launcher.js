// launcher.js
const { spawn } = require("child_process");
const path = require("path");

// ✅ Start a detached (background) process
function startDetached(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    detached: true,
    stdio: "ignore",
    
    shell: true,
  });
  child.unref();
  return child.pid;
}

// ✅ Open browser on Windows
function openBrowser(url) {
  spawn('start "" "' + url + '"', { shell: true });
}

// ✅ Project root
const projectDir = __dirname;

// ✅ Detect language (default: Arabic)
const lang = (process.argv[2] || "ar").toLowerCase();

console.log(`🚀 Starting ${lang === "ar" ? "Arabic" : "French"} version...`);

// ✅ Start backend (port 4000)
startDetached("npm", ["run", "server"], projectDir);

// ✅ Start frontend (port 3000)
if (lang === "ar") {
  startDetached("npm", ["run", "ar"], projectDir);
} else {
  startDetached("npm", ["run", "fr"], projectDir);
}

// ✅ Wait a few seconds, then open browser
setTimeout(() => {
  openBrowser("http://localhost:3000");
  process.exit(0);
}, 6000);
