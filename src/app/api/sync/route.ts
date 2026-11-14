import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

const MIN_SYNC_KEY_LENGTH = 4;
const MAX_SYNC_KEY_LENGTH = 128;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return null;
  }
  return neon(databaseUrl);
}

function normalizeSyncKey(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < MIN_SYNC_KEY_LENGTH || trimmed.length > MAX_SYNC_KEY_LENGTH) {
    return null;
  }
  return trimmed;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
  }
  return new Date().toISOString();
}

export async function GET(request: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL não configurada no servidor." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const syncKey = normalizeSyncKey(searchParams.get("key"));

  if (!syncKey) {
    return NextResponse.json(
      {
        error: `Sync Key inválida. Informe pelo menos ${MIN_SYNC_KEY_LENGTH} caracteres.`,
      },
      { status: 400 }
    );
  }

  try {
    const rows = await sql`
      SELECT payload, updated_at
      FROM appcraft_catalogs
      WHERE sync_key = ${syncKey}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ found: false });
    }

    const row = rows[0];
    return NextResponse.json({
      found: true,
      payload: row.payload,
      updatedAt: toIsoString(row.updated_at),
    });
  } catch (error) {
    console.error("[GET /api/sync] Database error:", error);
    return NextResponse.json(
      { error: "Falha ao buscar catálogo na nuvem." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const sql = getSql();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL não configurada no servidor." },
      { status: 500 }
    );
  }

  let body: { syncKey?: unknown; payload?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição JSON inválido." },
      { status: 400 }
    );
  }

  const syncKey = normalizeSyncKey(body?.syncKey);
  if (!syncKey) {
    return NextResponse.json(
      {
        error: `Sync Key inválida. Use entre ${MIN_SYNC_KEY_LENGTH} e ${MAX_SYNC_KEY_LENGTH} caracteres.`,
      },
      { status: 400 }
    );
  }

  const payload = body?.payload;
  if (payload === undefined || payload === null || typeof payload !== "object") {
    return NextResponse.json(
      { error: "Payload do catálogo inválido." },
      { status: 400 }
    );
  }

  try {
    const serialized = JSON.stringify(payload);
    const rows = await sql`
      INSERT INTO appcraft_catalogs (sync_key, payload, updated_at)
      VALUES (${syncKey}, ${serialized}::jsonb, NOW())
      ON CONFLICT (sync_key)
      DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = NOW()
      RETURNING updated_at
    `;

    const updatedAt = toIsoString(rows[0]?.updated_at);
    return NextResponse.json({ ok: true, updatedAt });
  } catch (error) {
    console.error("[POST /api/sync] Database error:", error);
    return NextResponse.json(
      { error: "Falha ao salvar catálogo na nuvem." },
      { status: 500 }
    );
  }
}
