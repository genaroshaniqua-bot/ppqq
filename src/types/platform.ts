export type ProductKind = "数字商品" | "实体周边预览";

export type ProductStatus = "可加入愿望单" | "预览中" | "暂未开放购买";

export type MarketProduct = {
  id: string;
  title: string;
  kind: ProductKind;
  category: string;
  creator: string;
  price: string;
  currency: string;
  tags: string[];
  desc: string;
  includes: string[];
  status: ProductStatus;
  accent: string;
};

export type CommissionStatus = "可接单" | "排队中" | "暂停接单";

export type CommissionCategory =
  | "角色插画"
  | "2D 头像 / Live2D"
  | "3D 模型"
  | "表情 / 徽章"
  | "直播素材"
  | "品牌 / 平面"
  | "动画 / 视频"
  | "音乐 / 音频"
  | "文案 / 剧情"
  | "实体周边"
  | "创作咨询"
  | "其他";

export type CommissionLicense = "个人使用" | "商业使用" | "版权买断";

export type CommissionServiceOption = "可加急" | "含源文件" | "过程确认" | "可追加差分";

export type CommissionCategoryMeta = {
  id: string;
  label: CommissionCategory;
  description: string;
  accent: string;
  icon: string;
};

export type CreatorService = {
  id: string;
  title: string;
  category: CommissionCategory;
  creator: string;
  status: CommissionStatus;
  priceRange: string;
  priceFrom: number;
  turnaround: string;
  tags: string[];
  licenses: CommissionLicense[];
  serviceOptions: CommissionServiceOption[];
  verified: boolean;
  onSale: boolean;
  rating: number;
  reviewCount: number;
  sample: string;
  rules: string[];
  accent: string;
};

export type InteractionPrompt = {
  id: string;
  title: string;
  scene: string;
  relationship: string;
  sampleLines: string[];
};

export type AccountOrder = {
  id: string;
  title: string;
  status: string;
  amount: string;
};

export type CommissionRecord = {
  id: string;
  title: string;
  creator: string;
  status: string;
};
