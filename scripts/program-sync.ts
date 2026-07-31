import dotenv from "dotenv";
import { runProgramSync } from "../src/lib/program-sync";
import { SyncOptions } from "../src/lib/program-sync/types";

dotenv.config();

function parseSyncArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ignore-lease") {
      options.ignoreLease = true;
    } else if (args[i] === "--allow-large-shrink") {
      options.allowLargeShrink = true;
    } else if (args[i] === "--catalog" && args[i + 1]) {
      options.catalogId = args[i + 1];
      i++;
    }
  }

  return options;
}

async function main() {
  const options = parseSyncArgs();
  const result = await runProgramSync(options);

  // Single compact JSON line output for CircleCI parsing
  console.log(JSON.stringify(result));

  if (result.action === "error") {
    process.exit(1);
  }
}

main().catch((err) => {
  const errObj = {
    action: "error",
    status: "error",
    importedCount: 0,
    skippedCount: 0,
    failedCount: 1,
    promoted: false,
    error: (err as Error).message,
  };
  console.log(JSON.stringify(errObj));
  process.exit(1);
});
