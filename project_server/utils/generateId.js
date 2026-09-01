const generatePatientId = (count) => `SDC${String(count + 1).padStart(5, '0')}`;
const generateInvoiceNumber = (count) => {
  const year = new Date().getFullYear().toString().slice(-2);
  return `SDC-INV-${year}-${String(count + 1).padStart(4, '0')}`;
};
const generateEmployeeId = (count) => `EMP${String(count + 1).padStart(4, '0')}`;

module.exports = { generatePatientId, generateInvoiceNumber, generateEmployeeId };
