export const required = (value) => String(value ?? "").trim().length > 0;
export const validAmount = (value) => Number(value) > 0 && Number.isFinite(Number(value));

export function validateCustomer(values) {
  if (!required(values.name) || !required(values.primaryContact) || !required(values.billId)) {
    return "Name, primary contact, and unique bill ID are required.";
  }
  return "";
}
