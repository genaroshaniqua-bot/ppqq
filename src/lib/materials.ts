import catalog from "@/data/materials.json";

export type Material = (typeof catalog)[number];
export const materialCategories = ["头像", "海报底图", "场景背景", "表情贴纸", "装饰纹样"];
const groups = materialCategories.map((category) => catalog.filter((item) => item.category === category));
// Mix categories in discovery order so the first screen shows the full range.
export const materials = Array.from({ length: Math.max(...groups.map((group) => group.length)) }, (_, index) =>
  groups.flatMap((group) => group[index] ? [group[index]] : [])
).flat();

export function filterMaterials(query: string, category: string, tag: string) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return materials.filter((item) => {
    const text = [item.title, item.originalTitle, item.author, item.category, ...item.tags].join(" ").toLocaleLowerCase();
    return (!category || item.category === category) && (!tag || item.tags.includes(tag)) && words.every((word) => text.includes(word));
  });
}
