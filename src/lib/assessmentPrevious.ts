type AssessmentCursor = {
  id: string;
  playerId: string;
  type: string;
  date: string;
  createdAt: Date;
  score: number;
};

function historyKey(playerId: string, type: string) {
  return `${playerId}\0${type}`;
}

function isBefore(a: AssessmentCursor, b: Pick<AssessmentCursor, "date" | "createdAt">) {
  return a.date < b.date || (a.date === b.date && a.createdAt < b.createdAt);
}

export function previousScoresById(listed: AssessmentCursor[], history: AssessmentCursor[]) {
  const buckets = new Map<string, AssessmentCursor[]>();
  for (const row of history) {
    const key = historyKey(row.playerId, row.type);
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

  const previousById = new Map<string, number | null>();
  for (const item of listed) {
    const bucket = buckets.get(historyKey(item.playerId, item.type)) ?? [];
    let previous: number | null = null;
    for (const row of bucket) {
      if (row.id === item.id) continue;
      if (isBefore(row, item)) previous = row.score;
      else break;
    }
    previousById.set(item.id, previous);
  }
  return previousById;
}
