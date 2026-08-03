import { createCategoryMetadata, createCategoryPage } from "@/components/programs/programCategoryRoute";

export const revalidate = false;
export const generateMetadata = createCategoryMetadata("certificates");
export default createCategoryPage("certificates");
