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

export type CreatorService = {
  id: string;
  title: string;
  category: string;
  creator: string;
  status: CommissionStatus;
  priceRange: string;
  turnaround: string;
  tags: string[];
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
