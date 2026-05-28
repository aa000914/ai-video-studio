import { Pool } from "pg";

const MIGRATIONS = [
  "ALTER TABLE characters ADD COLUMN IF NOT EXISTS prohibited_changes TEXT;",
  "ALTER TABLE scenes ADD COLUMN IF NOT EXISTS prohibited_elements TEXT;",
];

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return new Response(
      JSON.stringify({
        error: "缺少 DATABASE_URL 环境变量",
        help: "请在 .env.local 中添加 DATABASE_URL",
        where: "打开 Supabase Dashboard → Project Settings → Database → Connection string → 复制 URI（格式: postgresql://postgres:...）",
        link: "https://supabase.com/dashboard/project/nvigjxfxgkijdutnnmfr/settings/database",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    for (const sql of MIGRATIONS) {
      await pool.query(sql);
    }

    return new Response("migration success", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err.message,
        help: "请检查 DATABASE_URL 是否正确",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
      }
    );
  } finally {
    await pool.end();
  }
}
