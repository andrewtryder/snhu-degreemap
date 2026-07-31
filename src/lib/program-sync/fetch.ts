import { kualiConfig } from "@/config/kualiConfig";
import { RawKualiProgramListItem, RawKualiProgramDetail, RawKualiCourseItem } from "@/types/kualiRaw";

export async function fetchKualiProgramList(catalogId = kualiConfig.catalogId): Promise<RawKualiProgramListItem[]> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/programs/${catalogId}?q=`;
  const response = await fetch(url, {
    headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch program list from Kuali: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error("Invalid program list response: expected array");
  }

  return data as RawKualiProgramListItem[];
}

export async function fetchKualiProgramDetail(
  pid: string,
  catalogId = kualiConfig.catalogId,
  retries = 2
): Promise<RawKualiProgramDetail | null> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/program/${catalogId}/${pid}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return (await response.json()) as RawKualiProgramDetail;
      }

      if (response.status === 404) {
        return null;
      }

      if (response.status === 429 || response.status === 503) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
          const delaySeconds = parseInt(retryAfter, 10);
          if (!isNaN(delaySeconds) && delaySeconds > 0) {
            await new Promise((res) => setTimeout(res, delaySeconds * 1000));
            continue; // Skip default backoff below if Retry-After is honored
          }
        }
      }
    } catch (err) {
      if (attempt === retries) throw err;
    }

    await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
  }

  return null;
}

export async function fetchKualiCourseDetail(
  pid: string,
  catalogId = kualiConfig.catalogId,
  retries = 2
): Promise<RawKualiCourseItem | null> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/course/${catalogId}/${pid}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return (await response.json()) as RawKualiCourseItem;
      }

      if (response.status === 404) {
        return null;
      }

      if (response.status === 429 || response.status === 503) {
        const retryAfter = response.headers.get("Retry-After");
        if (retryAfter) {
          const delaySeconds = parseInt(retryAfter, 10);
          if (!isNaN(delaySeconds) && delaySeconds > 0) {
            await new Promise((res) => setTimeout(res, delaySeconds * 1000));
            continue;
          }
        }
      }
    } catch (err) {
      if (attempt === retries) throw err;
    }

    await new Promise((res) => setTimeout(res, 300 * (attempt + 1)));
  }

  return null;
}
