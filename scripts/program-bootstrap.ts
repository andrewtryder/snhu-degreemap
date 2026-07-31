import dotenv from "dotenv";
import { runMigrations } from "./migrate";
import { runProgramSync } from "../src/lib/program-sync";

dotenv.config();

async function runBootstrap() {
  console.log("[Program Bootstrap] Running database migrations...");
  await runMigrations();

  console.log("[Program Bootstrap] Initiating initial program catalog sync...");
  const result = await runProgramSync({ forceBootstrap: true });

  console.log(JSON.stringify(result));

  if (result.action === "error") {
    process.exit(1);
  }
}

runBootstrap().catch((err) => {
  console.error("[Program Bootstrap Fatal Error]", err);
  process.exit(1);
});
