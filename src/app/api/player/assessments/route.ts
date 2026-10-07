import { NextResponse } from "next/server";
import { previousScoresById } from "@/lib/assessmentPrevious";
import { parseStoredMetrics } from "@/lib/assessmentTemplates";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") {
    return NextResponse.json({ error: "Players only" }, { status: 403 });
  }

  const rows = await db.assessment.findMany({
    where: { playerId: session.sub },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  const previous = previousScoresById(rows, rows);

  return NextResponse.json({
    assessments: rows.map((row) => {
      const previousScore = previous.get(row.id) ?? null;
      return {
        id: row.id,
        playerId: row.playerId,
        player: null,
        type: row.type,
        templateId: row.templateId,
        date: row.date,
        score: row.score,
        previousScore,
        change: previousScore == null ? null : Number((row.score - previousScore).toFixed(2)),
        metrics: parseStoredMetrics(row.metrics),
        notes: row.notes,
      };
    }),
  });
}
