import { kualiConfig } from "@/config/kualiConfig";
import { RawKualiProgramListItem, RawKualiProgramDetail, RawKualiCourseItem } from "@/types/kualiRaw";

const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function getBackoffDelay(attempt: number, response?: Response): number {
  if (response) {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds * 1000;
      }
    }
  }
  const base = 300 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 100);
  return base + jitter;
}

export async function fetchKualiProgramList(catalogId = kualiConfig.catalogId): Promise<RawKualiProgramListItem[]> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/programs/${catalogId}?q=`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(kualiConfig.timeoutMs),
    });
  } catch (err) {
    throw new Error(`Failed network request for program list: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch program list from Kuali: HTTP ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid JSON response for program list");
  }

  if (!Array.isArray(data)) {
    throw new Error("Invalid program list response structure: expected array");
  }

  return data as RawKualiProgramListItem[];
}

/**
 * Requirement links expose a course's internal `id`; Kuali's detail endpoint
 * instead requires its public `pid`. This index supplies that translation.
 */
export async function fetchKualiCourseList(catalogId = kualiConfig.catalogId): Promise<RawKualiCourseItem[]> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/courses/${catalogId}?q=`;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
      signal: AbortSignal.timeout(kualiConfig.timeoutMs),
    });
  } catch (err) {
    throw new Error(`Failed network request for course list: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch course list from Kuali: HTTP ${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Invalid JSON response for course list");
  }

  if (!Array.isArray(data)) {
    throw new Error("Invalid course list response structure: expected array");
  }

  return data as RawKualiCourseItem[];
}

export async function fetchKualiProgramDetail(
  pid: string,
  catalogId = kualiConfig.catalogId,
  retries = 2
): Promise<RawKualiProgramDetail | null> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/program/${catalogId}/${pid}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(kualiConfig.timeoutMs),
      });

      if (response.ok) {
        try {
          return (await response.json()) as RawKualiProgramDetail;
        } catch {
          throw new Error(`Invalid JSON structure for program detail PID ${pid}`);
        }
      }

      if (response.status === 404) {
        return null; // Confirmed 404
      }

      if (RETRYABLE_STATUSES.has(response.status)) {
        lastError = new Error(`Kuali program detail endpoint returned HTTP ${response.status} (attempt ${attempt + 1}/${retries + 1})`);
        if (attempt < retries) {
          const delay = getBackoffDelay(attempt, response);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        throw lastError;
      }

      // Non-retryable HTTP 4xx (400, 401, 403, etc.)
      throw new Error(`Kuali program detail terminal failure for PID ${pid}: HTTP ${response.status}`);
    } catch (err) {
      lastError = err as Error;
      if (lastError.message.includes("terminal failure")) throw lastError;

      if (attempt < retries) {
        const delay = getBackoffDelay(attempt);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError || new Error(`Exhausted retries fetching program detail PID ${pid}`);
}

export async function fetchKualiCourseDetail(
  pid: string,
  catalogId = kualiConfig.catalogId,
  retries = 2
): Promise<RawKualiCourseItem | null> {
  const url = `${kualiConfig.baseUrl}/api/v1/catalog/course/${catalogId}/${pid}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": kualiConfig.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(kualiConfig.timeoutMs),
      });

      if (response.ok) {
        try {
          return (await response.json()) as RawKualiCourseItem;
        } catch {
          throw new Error(`Invalid JSON structure for course detail PID ${pid}`);
        }
      }

      if (response.status === 404) {
        return null;
      }

      if (RETRYABLE_STATUSES.has(response.status)) {
        lastError = new Error(`Kuali course detail endpoint returned HTTP ${response.status} (attempt ${attempt + 1}/${retries + 1})`);
        if (attempt < retries) {
          const delay = getBackoffDelay(attempt, response);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }
        throw lastError;
      }

      throw new Error(`Kuali course detail terminal failure for PID ${pid}: HTTP ${response.status}`);
    } catch (err) {
      lastError = err as Error;
      if (lastError.message.includes("terminal failure")) throw lastError;

      if (attempt < retries) {
        const delay = getBackoffDelay(attempt);
        await new Promise((res) => setTimeout(res, delay));
      } else {
        throw lastError;
      }
    }
  }

  throw lastError || new Error(`Exhausted retries fetching course detail PID ${pid}`);
}
