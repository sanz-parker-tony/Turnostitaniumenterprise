import { NextResponse } from "next/server";

export const runtime = "nodejs"; // importante para usar service role en server

export async function GET() {
  const tenantId = process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID;
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: "DEFAULT_TENANT_ID_MISSING" },
      { status: 500 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { ok: false, error: "SUPABASE_ENV_MISSING" },
      { status: 500 }
    );
  }

  // Consulta con Service Role (sin depender de RLS)
  const resp = await fetch(`${url}/rest/v1/tenant_onboarding?tenant_id=eq.${tenantId}&select=onboarding_status,completion_percentage`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!resp.ok) {
    return NextResponse.json(
      { ok: false, error: "DB_QUERY_FAILED" },
      { status: 500 }
    );
  }

  const rows = (await resp.json()) as Array<{
    onboarding_status: string | null;
    completion_percentage: number | null;
  }>;

  const row = rows?.[0];
  const isCompleted =
    row?.onboarding_status === "COMPLETED" && Number(row?.completion_percentage) === 100;

  return NextResponse.json({
    ok: true,
    data: {
      onboarding_status: row?.onboarding_status ?? null,
      completion_percentage: row?.completion_percentage ?? null,
      is_completed: isCompleted,
    },
  });
}
