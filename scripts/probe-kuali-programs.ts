import fs from "node:fs";
import path from "node:path";
import { kualiConfig } from "../src/config/kualiConfig";

interface ProbeOptions {
  outputDir: string;
  catalogId: string;
  baseUrl: string;
  samplePid: string;
}

function parseArgs(): ProbeOptions {
  const args = process.argv.slice(2);
  let outputDir = path.resolve(process.cwd(), ".diagnostics");
  let catalogId = kualiConfig.catalogId;
  const baseUrl = kualiConfig.baseUrl;
  let samplePid = "EJeCh74Ltl";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output" && args[i + 1]) {
      outputDir = path.resolve(args[i + 1]);
      i++;
    } else if (args[i] === "--catalog" && args[i + 1]) {
      catalogId = args[i + 1];
      i++;
    } else if (args[i] === "--pid" && args[i + 1]) {
      samplePid = args[i + 1];
      i++;
    }
  }

  return { outputDir, catalogId, baseUrl, samplePid };
}

async function fetchWithRetry(
  url: string,
  options: { timeoutMs: number; userAgent: string; maxRetries?: number }
): Promise<{ status: number; contentType: string; data: unknown }> {
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": options.userAgent,
          Accept: "application/json, text/plain, */*",
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      const contentType = response.headers.get("content-type") || "";
      const status = response.status;

      if (response.ok) {
        const text = await response.text();
        let data: unknown;
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
        return { status, contentType, data };
      }

      // Retry transient errors (408, 429, 5xx)
      if (status === 408 || status === 429 || status >= 500) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
          console.warn(`[Probe Warning] HTTP ${status} for ${url}. Retrying in ${Math.round(delay)}ms...`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
      }

      throw new Error(`HTTP Error ${status} from ${url}`);
    } catch (err: unknown) {
      clearTimeout(timer);
      const isAbort = (err as Error)?.name === "AbortError";

      if (attempt < maxRetries && isAbort) {
        const delay = Math.pow(2, attempt) * 500 + Math.random() * 200;
        console.warn(`[Probe Timeout] Request timed out for ${url}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      if (attempt === maxRetries) {
        throw err;
      }
    }
  }

  throw new Error(`Failed to fetch ${url} after max retries`);
}

async function runProbe() {
  const options = parseArgs();
  console.log(`Starting Kuali API Probe...`);
  console.log(`Base URL: ${options.baseUrl}`);
  console.log(`Catalog ID: ${options.catalogId}`);
  console.log(`Sample Program PID: ${options.samplePid}`);
  console.log(`Output Directory: ${options.outputDir}`);

  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  const endpoints = [
    {
      name: "program-list",
      url: `${options.baseUrl}/api/v1/catalog/programs/${options.catalogId}?q=`,
      filename: "raw-program-list.json",
    },
    {
      name: "program-detail",
      url: `${options.baseUrl}/api/v1/catalog/program/${options.catalogId}/${options.samplePid}`,
      filename: "raw-computer-science-program.json",
    },
    {
      name: "course-list",
      url: `${options.baseUrl}/api/v1/catalog/courses/${options.catalogId}?q=CS`,
      filename: "raw-course-list.json",
    },
  ];

  let successCount = 0;

  for (const ep of endpoints) {
    console.log(`\nProbing [${ep.name}] -> ${ep.url}`);
    try {
      const res = await fetchWithRetry(ep.url, {
        timeoutMs: kualiConfig.timeoutMs,
        userAgent: kualiConfig.userAgent,
      });

      console.log(`  Status: ${res.status}`);
      console.log(`  Content-Type: ${res.contentType}`);

      if (Array.isArray(res.data)) {
        console.log(`  Result Count: ${res.data.length}`);
        if (res.data.length > 0) {
          console.log(`  Sample item keys: ${Object.keys(res.data[0] || {}).join(", ")}`);
        }
      } else if (typeof res.data === "object" && res.data !== null) {
        console.log(`  Object Keys: ${Object.keys(res.data).join(", ")}`);
      }

      const filePath = path.join(options.outputDir, ep.filename);
      fs.writeFileSync(filePath, JSON.stringify(res.data, null, 2), "utf-8");
      console.log(`  Saved response to: ${filePath}`);
      successCount++;
    } catch (err) {
      console.error(`  [Probe Error] Failed to probe ${ep.name}:`, (err as Error).message);
    }
  }

  if (successCount === 0) {
    console.error("\nAll Kuali API endpoint probes failed.");
    process.exit(1);
  }

  console.log(`\nProbe completed. ${successCount}/${endpoints.length} endpoints successfully saved to ${options.outputDir}`);
}

runProbe().catch((err) => {
  console.error("Fatal probe error:", err);
  process.exit(1);
});
