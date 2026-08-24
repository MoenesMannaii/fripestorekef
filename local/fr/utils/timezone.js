/**
 * 🇹🇳 Tunisia Timezone Utilities
 * Handles conversion between UTC (backend) and Africa/Tunis (frontend display)
 * 
 * Install dependencies: npm install date-fns-tz date-fns
 */
const { utcToZonedTime, formatInTimeZone, parse } = require('date-fns-tz');
const { isValid } = require('date-fns'); // ✅ isValid comes from 'date-fns', NOT 'date-fns-tz'

const TUNISIA_TZ = 'Africa/Tunis';

/**
 * Format a UTC ISO string or Date object to Tunisia local time for display
 * @param {string|Date} utcDate - UTC timestamp from backend
 * @param {string} formatStr - date-fns format string (default: 'yyyy-MM-dd HH:mm:ss')
 * @returns {string} Formatted date in Tunisia timezone
 */
function formatTunisiaLocal(utcDate, formatStr = 'yyyy-MM-dd HH:mm:ss') {
  if (!utcDate) return '';
  
  const dateObj = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  
  // ✅ Simple native date validation (no external dependency needed)
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return '';
  }
  
  return formatInTimeZone(dateObj, TUNISIA_TZ, formatStr);
}

/**
 * Get today's date in Tunisia local format (YYYY-MM-DD) for date pickers
 * @returns {string} Today's date in Tunisia timezone, e.g., '2026-03-07'
 */
function getTodayTunisia() {
  return formatInTimeZone(new Date(), TUNISIA_TZ, 'yyyy-MM-dd');
}

/**
 * Get yesterday's date in Tunisia local format
 * @returns {string} Yesterday's date in Tunisia timezone
 */
function getYesterdayTunisia() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatInTimeZone(yesterday, TUNISIA_TZ, 'yyyy-MM-dd');
}

/**
 * Parse a local Tunisia date string into a UTC Date object for API requests
 * @param {string} localDateStr - Date in 'YYYY-MM-DD' format (Tunisia local)
 * @returns {Date} UTC Date object
 */
function parseTunisiaDateToLocalUTC(localDateStr) {
  const parsed = parse(localDateStr, 'yyyy-MM-dd', new Date(), { timeZone: TUNISIA_TZ });
  return parsed;
}

/**
 * Format a date range for display in Tunisia timezone
 * @param {Object} period - { startDate, endDate, isSingleDay } from backend
 * @returns {string} Human-readable date range, e.g., "7 Mar 2026" or "7-8 Mar 2026"
 */
function formatPeriodDisplay(period) {
  if (!period?.startDate) return '';
  
  const start = formatInTimeZone(new Date(period.startDate), TUNISIA_TZ, 'd MMM yyyy');
  
  if (period.isSingleDay) {
    return start;
  }
  
  const end = formatInTimeZone(new Date(period.endDate), TUNISIA_TZ, 'd MMM yyyy');
  if (period.startDate.slice(0, 7) === period.endDate.slice(0, 7)) {
    const startDay = formatInTimeZone(new Date(period.startDate), TUNISIA_TZ, 'd');
    const endDay = formatInTimeZone(new Date(period.endDate), TUNISIA_TZ, 'd MMM yyyy');
    return `${startDay}-${endDay}`;
  }
  
  return `${start} - ${end}`;
}

/**
 * Check if a UTC timestamp falls within today in Tunisia timezone
 * @param {string|Date} utcTimestamp 
 * @returns {boolean}
 */
function isTodayTunisia(utcTimestamp) {
  if (!utcTimestamp) return false;
  
  const dateObj = typeof utcTimestamp === 'string' ? new Date(utcTimestamp) : utcTimestamp;
  
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    return false;
  }
  
  const todayStr = getTodayTunisia();
  const dateStr = formatInTimeZone(dateObj, TUNISIA_TZ, 'yyyy-MM-dd');
  
  return todayStr === dateStr;
}

/**
 * Convert backend period object to frontend-friendly format with Tunisia times
 * @param {Object} period - { startDate, endDate, isSingleDay } from backend
 * @returns {Object} Enhanced period with display-ready Tunisia dates
 */
function enhancePeriodWithTunisia(period) {
  if (!period) return null;
  
  return {
    ...period,
    displayRange: formatPeriodDisplay(period),
    startLocal: formatTunisiaLocal(period.startDate, 'yyyy-MM-dd HH:mm:ss'),
    endLocal: formatTunisiaLocal(period.endDate, 'yyyy-MM-dd HH:mm:ss'),
    isToday: isTodayTunisia(period.endDate)
  };
}

module.exports = {
  TUNISIA_TZ,
  formatTunisiaLocal,
  getTodayTunisia,
  getYesterdayTunisia,
  parseTunisiaDateToLocalUTC,
  formatPeriodDisplay,
  isTodayTunisia,
  enhancePeriodWithTunisia
};