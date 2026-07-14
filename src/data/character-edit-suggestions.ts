export type CharacterBasicField = "name" | "identity" | "summary" | "notes";

export type CharacterSuggestionGroup = {
  label: string;
  items: string[];
};

export const characterBasicFieldMeta: Record<
  CharacterBasicField,
  {
    label: string;
    hint: string;
    mode: "replace" | "append";
  }
> = {
  name: {
    label: "角色姓名",
    hint: "选择后替换当前姓名",
    mode: "replace"
  },
  identity: {
    label: "身份",
    hint: "选择后替换当前身份",
    mode: "replace"
  },
  summary: {
    label: "摘要",
    hint: "选择后追加到摘要",
    mode: "append"
  },
  notes: {
    label: "创作备注",
    hint: "选择后追加到备注",
    mode: "append"
  }
};

export const characterBasicSuggestions: Record<CharacterBasicField, CharacterSuggestionGroup[]> = {
  name: [
    {
      label: "现代清透",
      items: ["青井绫", "白石澪", "雾岛凛", "月见遥"]
    },
    {
      label: "古风意象",
      items: ["沈砚", "苏夜棠", "闻人雪", "谢临川"]
    },
    {
      label: "代号昵称",
      items: ["拾光", "夜鸦", "零号", "小满"]
    }
  ],
  identity: [
    {
      label: "日常校园",
      items: ["电波社社长", "天文部新人", "旧书店店员", "校园广播员"]
    },
    {
      label: "奇幻职业",
      items: ["梦境修补师", "纸符师", "遗迹测绘员", "记忆鉴定师"]
    },
    {
      label: "阵营位置",
      items: ["流亡继承人", "边境联络员", "地下情报商", "秘密观察员"]
    }
  ],
  summary: [
    {
      label: "性格气质",
      items: ["嘴硬心软", "冷静克制", "敏锐多疑", "温柔但有距离感"]
    },
    {
      label: "能力亮点",
      items: ["能听见愿望残响", "擅长修复失落记忆", "可短暂借用他人的影子"]
    },
    {
      label: "冲突钩子",
      items: ["害怕被重要的人遗忘", "每次使用能力都会失去一段记忆", "必须隐瞒真实身份"]
    }
  ],
  notes: [
    {
      label: "题材氛围",
      items: ["校园悬疑", "温柔治愈", "轻微恐怖", "都市奇幻"]
    },
    {
      label: "关系线",
      items: ["宿敌变盟友", "双向隐瞒", "师徒反目", "群像成长"]
    },
    {
      label: "创作用途",
      items: ["适合长篇主线", "适合短篇单元剧", "适合互动对话", "适合角色卡展示"]
    }
  ]
};
