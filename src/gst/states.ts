/**
 * Indian state codes as used in GSTIN (first two digits) and for
 * place-of-supply decisions. Static legal reference data — never invented
 * by AI, never stored per-transaction.
 */
export const STATE_CODES: ReadonlyMap<string, string> = new Map([
  ['01', 'Jammu & Kashmir'],
  ['02', 'Himachal Pradesh'],
  ['03', 'Punjab'],
  ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'],
  ['06', 'Haryana'],
  ['07', 'Delhi'],
  ['08', 'Rajasthan'],
  ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'],
  ['11', 'Sikkim'],
  ['12', 'Arunachal Pradesh'],
  ['13', 'Nagaland'],
  ['14', 'Manipur'],
  ['15', 'Mizoram'],
  ['16', 'Tripura'],
  ['17', 'Meghalaya'],
  ['18', 'Assam'],
  ['19', 'West Bengal'],
  ['20', 'Jharkhand'],
  ['21', 'Odisha'],
  ['22', 'Chhattisgarh'],
  ['23', 'Madhya Pradesh'],
  ['24', 'Gujarat'],
  ['26', 'Dadra & Nagar Haveli and Daman & Diu'],
  ['27', 'Maharashtra'],
  ['29', 'Karnataka'],
  ['30', 'Goa'],
  ['31', 'Lakshadweep'],
  ['32', 'Kerala'],
  ['33', 'Tamil Nadu'],
  ['34', 'Puducherry'],
  ['35', 'Andaman & Nicobar Islands'],
  ['36', 'Telangana'],
  ['37', 'Andhra Pradesh'],
  ['38', 'Ladakh'],
]);

/** Resolves the state name for a GSTIN/place-of-supply state code. */
export function stateNameFromCode(code: string): string | null {
  return STATE_CODES.get(code) ?? null;
}

/** Extracts the two-digit state code from a GSTIN (first two characters). */
export function stateCodeFromGstin(gstin: string): string | null {
  const prefix = gstin.slice(0, 2);
  return STATE_CODES.has(prefix) ? prefix : null;
}
