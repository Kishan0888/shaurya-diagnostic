// Mirrors server/utils/invoiceCalc.js so every screen shows the same numbers
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sumPrices = (list) =>
  Array.isArray(list) ? list.reduce((s, i) => s + (Number(i?.price) || 0), 0) : 0;

export function calcInvoice(inv = {}) {
  const gross = round2(
    inv.grossAmount ?? (sumPrices(inv.items) || sumPrices(inv.selectedTests) || inv.subtotal || inv.amount || 0)
  );
  const discount = Math.min(Math.max(round2(inv.discount), 0), gross);
  const net = round2(gross - discount);
  let paid;
  if (inv.amountPaid !== undefined && inv.amountPaid !== null) paid = round2(inv.amountPaid);
  else paid = inv.isPaid === false ? 0 : net;
  paid = Math.min(Math.max(paid, 0), net);
  const balance = round2(net - paid);
  const status = balance <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Unpaid';
  return { grossAmount: gross, discount, netAmount: net, amountPaid: paid, balanceAmount: balance, paymentStatus: status };
}

export const inr = (n) =>
  `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const statusBadge = (status) =>
  status === 'Paid' ? 'badge-green' : status === 'Partial' ? 'badge-yellow' : 'badge-red';
