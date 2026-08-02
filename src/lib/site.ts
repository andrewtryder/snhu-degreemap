import { getSiteUrl } from "@/lib/siteUrl";

export const siteConfig = {
  name: "SNHU Degree Map",
  shortDescription: "An unofficial degree-requirement and prerequisite visualization tool for SNHU programs.",
  description:
    "Explore unofficial SNHU degree maps with program requirements, course relationships, and interactive prerequisite graphs based on published catalog data.",
  get url() {
    return getSiteUrl();
  },
  repository: "https://github.com/andrewtryder/snhu-degreemap",
};
