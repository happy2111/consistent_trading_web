export { cn } from "cn";

export function parseDecimal(val: unknown): number {
  if (val == null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  }
  if (
    typeof val === "object" &&
    val !== null &&
    "s" in val &&
    "e" in val &&
    "d" in val &&
    Array.isArray((val as Record<string, unknown>).d)
  ) {
    const dObj = val as { s: number; e: number; d: number[] };
    if (dObj.d.length === 0 || (dObj.d.length === 1 && dObj.d[0] === 0)) return 0;
    const sign = dObj.s === -1 ? -1 : 1;
    let digits = String(dObj.d[0]);
    for (let i = 1; i < dObj.d.length; i++) {
      digits += String(dObj.d[i]).padStart(7, "0");
    }
    const exp = dObj.e;
    if (exp >= digits.length - 1) {
      digits = digits.padEnd(exp + 1, "0");
    } else if (exp >= 0) {
      digits = digits.slice(0, exp + 1) + "." + digits.slice(exp + 1);
    } else {
      digits = "0." + "0".repeat(-exp - 1) + digits;
    }
    const res = sign * parseFloat(digits);
    return isNaN(res) ? 0 : res;
  }
  return 0;
}
