import { getServiceClient } from "@/lib/supabase";

const MIGRATIONS = [
  {
    table: "characters",
    columns: ["prohibited_changes"],
    sql: "ALTER TABLE characters ADD COLUMN IF NOT EXISTS prohibited_changes TEXT;",
  },
  {
    table: "scenes",
    columns: ["space_description", "prohibited_elements"],
    sql: "ALTER TABLE scenes ADD COLUMN IF NOT EXISTS space_description TEXT;\nALTER TABLE scenes ADD COLUMN IF NOT EXISTS prohibited_elements TEXT;",
  },
];

export async function GET() {
  try {
    const supabase = getServiceClient();
    const results = [];

    for (const m of MIGRATIONS) {
      // Check existing columns by trying to select them
      const { data: sample, error } = await supabase
        .from(m.table)
        .select(m.columns.join(","))
        .limit(1);

      if (error && error.message.includes("column")) {
        results.push({
          table: m.table,
          missing: true,
          sql: m.sql,
        });
      } else {
        results.push({
          table: m.table,
          missing: false,
        });
      }
    }

    const needsMigration = results.some((r) => r.missing);
    const sqlScript = results
      .filter((r) => r.missing)
      .map((r) => r.sql)
      .join("\n");

    return Response.json({
      migrated: !needsMigration,
      results,
      sqlScript: needsMigration ? sqlScript : null,
      message: needsMigration
        ? "需要在 Supabase SQL Editor 中执行迁移SQL。详见 sqlScript 字段。"
        : "数据库已是最新版本。",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
