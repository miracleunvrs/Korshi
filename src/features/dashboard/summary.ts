type Transaction = { occurredOn: string; direction: "income" | "expense"; amount: number };
type Vote = { status: string; startsAt: string; endsAt: string };

/** Summaries only describe records actually received from the backend. */
export function monthlyTransactions(transactions: Transaction[]) {
  const months = new Map<string, { key: string; label: string; income: number; expense: number }>();
  for (const item of transactions) {
    const localized = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(item.occurredOn);
    const isoDate = localized ? `${localized[3]}-${localized[2]}-${localized[1]}` : item.occurredOn.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !Number.isFinite(item.amount)) continue;
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) continue;
    const key = isoDate.slice(0, 7);
    const month = months.get(key) ?? {
      key,
      label: date.toLocaleDateString("ru-RU", { month: "short", year: "numeric", timeZone: "UTC" }),
      income: 0,
      expense: 0,
    };
    month[item.direction] += item.amount;
    months.set(key, month);
  }
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
}

/** Formats an ISO timestamp for display; unparseable values are shown as-is. */
export function dateTimeLabel(value: string | undefined) {
  if (!value) return "";
  const time = Date.parse(value);
  return Number.isNaN(time) ? value : new Date(time).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function activeVotes<T extends Vote>(votes: T[], now = Date.now()): T[] {
  return votes.filter((vote) => vote.status === "active" &&
    Date.parse(vote.startsAt) <= now && Date.parse(vote.endsAt) > now);
}
