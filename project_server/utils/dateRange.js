// Date helpers that always work in Indian Standard Time (UTC+05:30),
// regardless of the timezone of the server (e.g. Render runs in UTC).
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// 'YYYY-MM-DD' for the IST calendar day of a JS Date
const istDateStr = (d = new Date()) =>
  new Date(d.getTime() + IST_OFFSET_MS).toISOString().split('T')[0];

const isValidDateStr = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

// UTC instant at which the IST day 'YYYY-MM-DD' starts
const istDayStart = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS);
};

// Build an inclusive IST range from 'from' / 'to' strings (defaults to today)
const getIstRange = (from, to) => {
  const today = istDateStr();
  let fromStr = isValidDateStr(from) ? from : today;
  let toStr = isValidDateStr(to) ? to : fromStr;
  if (fromStr > toStr) [fromStr, toStr] = [toStr, fromStr];
  const start = istDayStart(fromStr);
  const end = new Date(istDayStart(toStr).getTime() + DAY_MS - 1);
  return { fromStr, toStr, start, end };
};

// List of 'YYYY-MM-DD' strings between two dates (inclusive)
const listDays = (fromStr, toStr) => {
  const days = [];
  let t = istDayStart(fromStr).getTime();
  const last = istDayStart(toStr).getTime();
  while (t <= last) {
    days.push(istDateStr(new Date(t)));
    t += DAY_MS;
  }
  return days;
};

module.exports = { IST_OFFSET_MS, istDateStr, istDayStart, getIstRange, listDays, isValidDateStr };
