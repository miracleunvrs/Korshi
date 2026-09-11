import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

try {
  const output = execFileSync("pnpm", ["exec", "supabase", "gen", "types", "typescript", "--local", "--schema", "public"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  writeFileSync("src/types/database.types.ts", output);
  console.log("Database types updated from local Supabase.");
} catch {
  console.error("Database types were not changed. Start local Supabase first.");
  process.exit(1);
}
