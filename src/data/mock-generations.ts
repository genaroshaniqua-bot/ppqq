import type { BoothPlatform } from "@/types/booth";
import type { CharacterStyle, CharacterType } from "@/types/character";

export const characterStyles: CharacterStyle[] = ["赛博幻想", "校园怪谈", "国风异能", "废土偶像", "日常治愈"];

export const characterTypes: CharacterType[] = ["主角", "反派", "搭档", "NPC", "看板娘"];

export const discoveryCategories = ["OC", "人设", "头像方向", "同人剧情", "摊宣", "周边预览"];

export const creationTemplates = [
  {
    title: "完整角色卡",
    label: "适合设定集",
    desc: "姓名、身份、外貌、背景、弱点和口癖一次成型。",
    accent: "#54c5b7"
  },
  {
    title: "剧情开场",
    label: "适合同人片段",
    desc: "根据角色冲突生成开篇场景、标题和后续章节方向。",
    accent: "#946cf3"
  },
  {
    title: "对话风格",
    label: "适合互动",
    desc: "整理口癖、常用句式和三段示例对话。",
    accent: "#6283d6"
  },
  {
    title: "头像提示词",
    label: "适合约稿/生图",
    desc: "输出构图、光线、表情、服装和负面提示。",
    accent: "#f084bc"
  }
];

export const boothTemplates = [
  "小红书摊宣标题",
  "微博预售动态",
  "QQ 群商品菜单",
  "B 站动态说明",
  "徽章套组文案",
  "立牌展示说明",
  "小卡价格牌"
];

export const boothPlatforms: BoothPlatform[] = ["小红书", "微博", "QQ 群", "B 站动态"];

export const pricingPlans = [
  {
    name: "免费版",
    price: "¥0",
    desc: "适合试用创作流程",
    features: ["每日 5 次模拟生成", "保存 3 个角色", "基础角色卡导出", "摊宣文案预览"]
  },
  {
    name: "基础会员",
    price: "¥29/月",
    desc: "适合长期 OC 创作者",
    features: ["每月 800 点数", "保存 60 个角色", "角色详情继续生成", "头像提示词模板"]
  },
  {
    name: "高级会员",
    price: "¥69/月",
    desc: "适合摊主和小团队",
    features: ["每月 2400 点数", "无限角色库", "摊宣批量改写", "周边方案套装"]
  },
  {
    name: "单次项目",
    price: "¥12 起",
    desc: "适合临时展会需求",
    features: ["摊宣组合包", "价格牌文案", "商品菜单", "社交平台改写"]
  }
];
