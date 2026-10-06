// Single source of truth for invoice money calculations.
// Works for new invoices and for older invoices saved before
// amountPaid / balanceAmount fields existed.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const sumPrices = (list) =>
  Array.isArray(list) ? list.reduce((s, i) => s + (Number(i?.price) || 0), 0) : 0;

const calcInvoice = (inv = {}) => {
  const gross = round2(
    sumPrices(inv.items) || sumPrices(inv.selectedTests) || inv.subtotal || inv.amount || 0
  );
  const discount = Math.min(Math.max(round2(inv.discount), 0), gross);
  const net = round2(gross - discount);

  // Old invoices had no amountPaid → treat as fully paid unless marked unpaid
  let paid;
  if (inv.amountPaid !== undefined && inv.amountPaid !== null) paid = round2(inv.amountPaid);
  else paid = inv.isPaid === false ? 0 : net;
  paid = Math.min(Math.max(paid, 0), net);

  const balance = round2(net - paid);
  const status = balance <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';

  return { grossAmount: gross, discount, netAmount: net, amountPaid: paid, balanceAmount: balance, paymentStatus: status };
};

// Returns a plain object with the calculated fields merged in
const normalizeInvoice = (doc) => {
  if (!doc) return doc;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const c = calcInvoice(obj);
  return {
    ...obj,
    ...c,
    amount: c.grossAmount,
    subtotal: c.grossAmount,
    totalAmount: c.netAmount,
    isPaid: c.balanceAmount <= 0,
    testName: obj.testName || (obj.items || []).map((i) => i.testName).join(', '),
  };
};

module.exports = { calcInvoice, normalizeInvoice, round2 };
