type AssessmentCursor = {
  id: string;
  playerId: string | null;
  playerName?: string | null;
  type: string;
  templateId?: string | null;
  notes?: string | null;
  date: string;
  createdAt: Date;
  score: number;
};

function normalizeNotes(notes: string | null | undefined) {
  return notes?.trim().toLocaleLowerCase() ?? "";
}

function historyKey(
  playerId: string | null,
  playerName: string | null | undefined,
  type: string,
  templateId?: string | null,
  notes?: string | null
) {
  const kind = templateId ? `template:${templateId}` : `type:${type}`;
  return `${playerId ?? `manual:${playerName?.trim().toLocaleLowerCase() ?? ""}`}\0${kind}\0${normalizeNotes(notes)}`;
}

function isBefore(a: AssessmentCursor, b: Pick<AssessmentCursor, "date" | "createdAt">) {
  return a.date < b.date || (a.date === b.date && a.createdAt < b.createdAt);
}

export function previousRecordsById(listed: AssessmentCursor[], history: AssessmentCursor[]) {
  const buckets = new Map<string, AssessmentCursor[]>();
  for (const row of history) {
    const key = historyKey(row.playerId, row.playerName, row.type, row.templateId, row.notes);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(row);
    else buckets.set(key, [row]);
  }

  for (const bucket of buckets.values()) {
    bucket.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  const previousById = new Map<string, AssessmentCursor | null>();
  for (const item of listed) {
    const bucket = buckets.get(historyKey(item.playerId, item.playerName, item.type, item.templateId, item.notes)) ?? [];
    let previous: AssessmentCursor | null = null;
    for (const row of bucket) {
      if (row.id === item.id) continue;
      if (isBefore(row, item)) previous = row;
      else break;
    }
    previousById.set(item.id, previous);
  }
  return previousById;
}

export function previousScoresById(listed: AssessmentCursor[], history: AssessmentCursor[]) {
  const previousById = new Map<string, number | null>();
  for (const [id, row] of previousRecordsById(listed, history)) {
    previousById.set(id, row?.score ?? null);
  }
  return previousById;
}
