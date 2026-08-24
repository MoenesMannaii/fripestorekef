console.log(">>> RUNNING UPDATED DEVICEINFO FILE <<<");

const si = require("systeminformation");

async function getSystemInfo() {
  try {
    const system = await si.system();
    const baseboard = await si.baseboard();

    console.log("System Info:", system);
    console.log("Baseboard Info:", baseboard);

    const uuid = system.uuid;
    const memMax = baseboard.memMax;

    const deviceId = `${uuid}-${memMax}`;

    console.log("Device ID:", uuid,memMax);
  } catch (err) {
    console.error("Error getting system info:", err);
  }
}

getSystemInfo();
