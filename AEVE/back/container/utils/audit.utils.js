const { AuditLog } = require('../Models');

async function logAudit({ actor_id, actor_role, action, details }) {
  const MAX_RETRIES = 5; // number of retry attempts
  const RETRY_DELAY = 200; // delay in milliseconds between retries

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await AuditLog.create({
        actor_id,
        actor_role,
        action,
        details,
        created_at: new Date(),
      });

      // Success — stop retrying
      return;
    } catch (err) {
      // If database is locked, retry after short delay
      if (err?.original?.code === 'SQLITE_BUSY' && attempt < MAX_RETRIES) {
        console.warn(
          `⚠️ SQLite busy, retrying audit log (${attempt}/${MAX_RETRIES}) in ${RETRY_DELAY}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
      } else {
        console.error('❌ Failed to log audit event:', err);
        break;
      }
    }
  }
}

module.exports = { logAudit };
