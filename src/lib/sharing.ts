export type CalendarEvent = {
  id: string;
  title: string;
  date: string | Date;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  location?: string | null;
  description?: string | null;
};

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function asDate(value: string | Date): Date {
  return value instanceof Date ? new Date(value.getTime()) : new Date(value);
}

function datePart(value: string | Date): string {
  return asDate(value).toISOString().slice(0, 10).replace(/-/g, "");
}

function timePart(value: string | Date): string {
  const date = asDate(value);
  return `${String(date.getUTCHours()).padStart(2, "0")}${String(date.getUTCMinutes()).padStart(2, "0")}00`;
}

function nextDate(value: string | Date): string {
  const date = asDate(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return datePart(date);
}

export function createCalendarFile(event: CalendarEvent): string {
  const day = datePart(event.date);
  const hasTime = Boolean(event.startTime);
  const start = hasTime ? `DTSTART:${day}T${timePart(event.startTime!)}` : `DTSTART;VALUE=DATE:${day}`;
  const end = event.endTime
    ? `DTEND:${day}T${timePart(event.endTime)}`
    : hasTime
      ? ""
      : `DTEND;VALUE=DATE:${nextDate(event.date)}`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mesa Buffet//Eventos//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.id}@mesa-buffet`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    start,
    end,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadCalendarFile(event: CalendarEvent): void {
  const blob = new Blob([createCalendarFile(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${event.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-")}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function createWhatsAppUrl(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 15) throw new Error("WhatsApp inválido.");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
