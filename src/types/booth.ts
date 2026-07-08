export type BoothPlatform = "小红书" | "微博" | "QQ 群" | "B 站动态";

export type BoothInput = {
  eventName: string;
  boothName: string;
  productInfo: string;
  platform: BoothPlatform;
  tone: string;
};

export type BoothOutput = {
  headline: string;
  copy: string;
  tags: string[];
  menu: string[];
  priceCard: string[];
};
