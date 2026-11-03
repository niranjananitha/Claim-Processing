/** India-specific formatting: rupees, IST dates/times. */

const IST = "Asia/Kolkata";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** ₹4,85,000 (Indian digit grouping). */
export function formatINR(amount: number | null | undefined): string {
  return inr.format(Number(amount) || 0);
}

/** Compact rupees for stat tiles: ₹85K, ₹4.9 L, ₹1.2 Cr. */
export function formatINRCompact(amount: number): string {
  const n = Number(amount) || 0;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return formatINR(n);
}

/** "2026-11-03" (a calendar date, no timezone) -> "03 Nov 2026". */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "—";
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "14:30:00" -> "2:30 pm". */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  return new Date(Date.UTC(1970, 0, 1, h, m)).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

/** Backend timestamps are naive UTC; show them in IST: "03 Nov 2026, 2:30 pm IST". */
export function formatDateTimeIST(utc: string | Date | null | undefined): string {
  if (!utc) return "—";
  const d =
    typeof utc === "string" ? new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(utc) ? utc : `${utc}Z`) : utc;
  if (Number.isNaN(d.getTime())) return String(utc);
  return `${d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: IST,
  })} IST`;
}

/** Today's date in IST as YYYY-MM-DD (for <input type="date"> defaults/max). */
export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: IST });
}

/** Current IST time as HH:MM (for <input type="time"> defaults). */
export function nowTimeIST(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: IST,
  });
}

export const VEHICLE_CATEGORY_LABEL: Record<string, string> = {
  two_wheeler: "Two Wheeler",
  four_wheeler: "Four Wheeler",
  cargo_truck: "Cargo Truck",
};

/** Indian states & union territories (RTO codes are stored on the claim). */
export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: "AN", name: "Andaman & Nicobar Islands" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "AR", name: "Arunachal Pradesh" },
  { code: "AS", name: "Assam" },
  { code: "BR", name: "Bihar" },
  { code: "CH", name: "Chandigarh" },
  { code: "CG", name: "Chhattisgarh" },
  { code: "DD", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "DL", name: "Delhi" },
  { code: "GA", name: "Goa" },
  { code: "GJ", name: "Gujarat" },
  { code: "HR", name: "Haryana" },
  { code: "HP", name: "Himachal Pradesh" },
  { code: "JK", name: "Jammu & Kashmir" },
  { code: "JH", name: "Jharkhand" },
  { code: "KA", name: "Karnataka" },
  { code: "KL", name: "Kerala" },
  { code: "LA", name: "Ladakh" },
  { code: "LD", name: "Lakshadweep" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "MH", name: "Maharashtra" },
  { code: "MN", name: "Manipur" },
  { code: "ML", name: "Meghalaya" },
  { code: "MZ", name: "Mizoram" },
  { code: "NL", name: "Nagaland" },
  { code: "OD", name: "Odisha" },
  { code: "PY", name: "Puducherry" },
  { code: "PB", name: "Punjab" },
  { code: "RJ", name: "Rajasthan" },
  { code: "SK", name: "Sikkim" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "TS", name: "Telangana" },
  { code: "TR", name: "Tripura" },
  { code: "UP", name: "Uttar Pradesh" },
  { code: "UK", name: "Uttarakhand" },
  { code: "WB", name: "West Bengal" },
];

export function stateName(code: string): string {
  return INDIAN_STATES.find((s) => s.code === code)?.name || code;
}
