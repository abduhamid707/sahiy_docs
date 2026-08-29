import { TicketTier } from "@/lib/constants";

// Muddatgacha 4 soatdan kam vaqt qolsa - "Diqqat" (sariq) darajasi boshlanadi.
export const WARNING_THRESHOLD_MS = 4 * 60 * 60 * 1000;

type TierInput = {
  status: string;
  deadlineAt: string | Date;
  resolvedAt?: string | Date | null;
};

// Ticketning ko'rinadigan holati saqlanmaydi - har doim deadlineAt va joriy vaqtdan
// hisoblanadi. Shunda UI background job ishlamagan taqdirda ham har doim to'g'ri ko'rsatadi.
export function getTicketTier(ticket: TierInput): TicketTier {
  if (ticket.status === "RESOLVED") return "RESOLVED";

  const msLeft = new Date(ticket.deadlineAt).getTime() - Date.now();
  if (msLeft < 0) return "OVERDUE";
  if (msLeft <= WARNING_THRESHOLD_MS) return "WARNING";
  return "OPEN";
}

// Intl.toLocaleString("uz-UZ") server (Node) va brauzerda turli ICU ma'lumotlari tufayli
// har xil natija berishi mumkin (hydration mismatch). Shu sabab qo'lda, deterministik formatlaymiz.
export function formatDeadline(date: string | Date) {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
