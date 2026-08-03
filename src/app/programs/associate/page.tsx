import { createCategoryMetadata, createCategoryPage } from "@/components/programs/programCategoryRoute";

export const revalidate = false;
export const generateMetadata = createCategoryMetadata("associate");
export default createCategoryPage("associate");
