import { parseProgramDetail, extractCourseReferences } from "@/lib/kualiParser";
import { parseCourseDetails, generatePrerequisiteEdges, NormalizedCourseDetails } from "@/lib/kualiCourseParser";
import { CatalogProgram } from "@/types/domainCatalog";
import { RawKualiProgramDetail, RawKualiCourseItem } from "@/types/kualiRaw";

export function parseProgramPayload(raw: RawKualiProgramDetail, catalogId?: string): CatalogProgram {
  return parseProgramDetail(raw, catalogId);
}

export function parseCoursePayload(raw: RawKualiCourseItem, fallbackCode?: string): NormalizedCourseDetails {
  return parseCourseDetails(raw, fallbackCode);
}

export { extractCourseReferences, generatePrerequisiteEdges };
