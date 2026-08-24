const express = require("express");
const si = require("systeminformation");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const router = express.Router();

// Ensure config dir exists
const configDir = path.join(__dirname, "../config");
if (!fs.existsSync(configDir)) {
  fs.mkdirSync(configDir, { recursive: true });
}
const filePath = path.join(configDir, "device.json");

// Define Admin Secret Code from env
const ADMIN_SECRET_CODE = process.env.ADMIN_SECRET_CODE || '_0x1002ap66';

// Helper: Get stored config
function getStoredConfig() {
  if (fs.existsSync(filePath)) {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading device.json", e);
      return {};
    }
  }
  return {};
}

// Helper: Save config
function saveConfig(deviceId, templateMode) {
  const config = {
    VALID_DEVICE_ID: deviceId,
    TEMPLATE_MODE: templateMode
  };
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
}

// Helper: Get robust current device info
async function getDeviceId() {
  try {
    const uuidData = await si.uuid();
    const system = await si.system();
    // Combine OS UUID and System UUID for maximum stability (fallback to mac if needed)
    return `${system.uuid || 'NO-SYS'}-${uuidData.os || uuidData.macs[0] || 'NO-OS'}`;
  } catch (error) {
    console.error("Error getting robust device ID:", error);
    return "UNKNOWN-DEVICE-ID";
  }
}

// ✅ GET /api/device/check
router.get("/check", async (req, res) => {
  try {
    const config = getStoredConfig();
    const validDeviceId = config.VALID_DEVICE_ID;
    const deviceId = await getDeviceId();

    // Check if the current device matches the stored one
    const valid = !!validDeviceId && deviceId === validDeviceId;

    return res.json({
      valid,
      deviceId, // optional, for debugging or UI
      templateMode: config.TEMPLATE_MODE || "restaurant", // default to restaurant if not set
      hasPermanentTemplate: !!config.TEMPLATE_MODE
    });
  } catch (error) {
    console.error("Device check error:", error);
    res.status(500).json({ valid: false, error: "Server error during device check" });
  }
});

// ✅ POST /api/device/unlock
// Sets up the POS for this hardware device and template
router.post("/unlock", async (req, res) => {
  try {
    const { secretCode, templateMode } = req.body;

    // Retrieve existing config to see if a template is already locked
    const config = getStoredConfig();
    const existingMode = config.TEMPLATE_MODE;

    // Force the existing mode if it was already set, preventing any attempt to change it
    const finalTemplateMode = existingMode || templateMode;

    if (!secretCode || !finalTemplateMode) {
      return res.status(400).json({ success: false, message: "Code secret et modèle (template) requis." });
    }

    if (secretCode !== ADMIN_SECRET_CODE) {
      return res.status(401).json({ success: false, message: "Code secret incorrect." });
    }

    const deviceId = await getDeviceId();
    saveConfig(deviceId, finalTemplateMode);

    res.json({
      success: true,
      message: existingMode
        ? "Appareil re-lié au réseau avec succès (Le mode logiciel permanent a été conservé)."
        : "POS configuré et verrouillé pour cet appareil avec succès.",
      deviceId,
      templateMode: finalTemplateMode
    });
  } catch (error) {
    console.error("Error saving setup:", error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la sauvegarde." });
  }
});

module.exports = router;
