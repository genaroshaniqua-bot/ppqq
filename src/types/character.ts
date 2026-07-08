export type CharacterStyle = "赛博幻想" | "校园怪谈" | "国风异能" | "废土偶像" | "日常治愈";

export type CharacterType = "主角" | "反派" | "搭档" | "NPC" | "看板娘";

export type Character = {
  id: string;
  name: string;
  gender: string;
  ageStage: string;
  identity: string;
  style: CharacterStyle;
  type: CharacterType;
  tags: string[];
  appearance: string;
  personality: string[];
  background: string;
  ability: string;
  weakness: string;
  speech: string;
  summary: string;
  notes: string;
  color: string;
  imagePosition: string;
  createdAt: string;
};

export type CharacterDraftInput = {
  inspiration: string;
  style: CharacterStyle;
  type: CharacterType;
  world: string;
  extra: string;
};

export type CharacterContinuation = {
  title: string;
  body: string;
  bullets: string[];
};
