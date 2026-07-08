import { createId } from "@/lib/utils";
import type { BoothInput, BoothOutput } from "@/types/booth";
import type { Character, CharacterContinuation, CharacterDraftInput } from "@/types/character";

const namePool = ["绫濑遥星", "雾岛澪", "白川栖夜", "七濑曜", "朝仓铃"];
const colors = ["#54c5b7", "#f084bc", "#946cf3", "#6283d6", "#b8ff26"];
const positions = ["left top", "right top", "left bottom", "right bottom", "center"];

export function generateCharacter(input: CharacterDraftInput): Character {
  const seed = input.inspiration.trim() || "会收集星光碎片的角色";
  const index = Math.abs(seed.length + input.world.length + input.extra.length) % namePool.length;
  const conflict = input.type === "反派" ? "目标正确但手段危险" : "越想保护别人，越容易把自己排除在计划之外";

  return {
    id: createId("oc"),
    name: namePool[index],
    gender: index % 2 === 0 ? "女" : "男",
    ageStage: index % 3 === 0 ? "高中生" : "青年",
    identity: `${input.style}世界里的${input.type}`,
    style: input.style,
    type: input.type,
    tags: [input.style, input.type, seed.slice(0, 8)],
    appearance: buildAppearance(input.style, seed),
    personality: buildPersonality(input.type),
    background: `围绕“${seed}”诞生的角色。${input.world || "世界观中存在被情绪点亮的异象"}，角色因此被卷入一条需要主动选择的故事线。`,
    ability: buildAbility(input.style),
    weakness: conflict,
    speech: buildSpeech(input.type),
    summary: `${input.style}${input.type}：${seed}。外表有强识别点，内在冲突清晰，适合继续扩写剧情和角色关系。`,
    notes: input.extra || "可继续补充亲友关系、敌对角色和关键道具。",
    color: colors[index],
    imagePosition: positions[index],
    createdAt: new Date().toISOString()
  };
}

export function generateStory(character: Character): CharacterContinuation {
  return {
    title: `${character.name}的第一场转折`,
    body: `雨停后的街区只剩招牌灯还亮着。${character.name}发现自己最熟悉的地点被改写成陌生的舞台，而唯一没有变化的，是那句口癖：“${character.speech}”`,
    bullets: [
      `开场冲突：${character.weakness}`,
      `关键道具：能放大“${character.tags[0]}”特征的旧物`,
      `后续方向：让一名新角色误解 ${character.name} 的真实目的`
    ]
  };
}

export function generateDialogue(character: Character): CharacterContinuation {
  return {
    title: `${character.name}的说话方式`,
    body: `${character.name}说话重点短、转折快，习惯先观察别人情绪再给建议。表达亲近时不会直接夸奖，而是把行动安排好。`,
    bullets: [
      `口癖：${character.speech}`,
      "常用句式：先否定风险，再给出可执行方案",
      `示例：“别急，${character.tags[1]}也不是只能硬撑。先把灯打开。”`
    ]
  };
}

export function generateAvatarPrompt(character: Character): CharacterContinuation {
  return {
    title: `${character.name}头像提示词`,
    body: `半身头像，${character.appearance}，表情克制但有故事感，浅灰白背景，${character.color} 作为局部强调色，干净线稿，细腻上色，适合社交头像。`,
    bullets: ["构图：三分之二侧脸或正面半身", "光线：柔和边缘光", "避免：过度粉色恋爱风、低俗广告感、复杂文字"]
  };
}

export function generateMerch(character: Character): CharacterContinuation {
  return {
    title: `${character.name}周边方向`,
    body: `徽章突出 ${character.tags.join(" / ")}，立牌采用角色动作剪影，小卡背面放一句角色摘要：“${character.summary}”。`,
    bullets: ["徽章：表情差分 3 枚一组", "立牌：透明底座加角色代表色", "贴纸：口癖、道具、头像三类组合"]
  };
}

export function generateBooth(input: BoothInput): BoothOutput {
  const event = input.eventName || "本周末场贩";
  const booth = input.boothName || "星屑创作社";
  const products = input.productInfo || "OC 徽章、立牌、小卡套组";
  const baseTags = input.platform === "小红书" ? ["#漫展摊宣", "#OC周边", "#同人谷"] : ["#漫展", "#同人周边", "#摊宣"];

  return {
    headline: buildBoothHeadline(input.platform, event, booth),
    copy: buildBoothCopy(input.platform, event, booth, products, input.tone),
    tags: baseTags,
    menu: [
      `主推套组：${products}`,
      "徽章：单枚 / 三枚组 / 隐藏款",
      "立牌：普通款 / 闪粉底座款",
      "小卡：角色卡面 + 设定摘要"
    ],
    priceCard: ["徽章单枚 12，三枚组 32", "立牌 35 起，现场少量现货", "小卡 8/张，套组赠角色贴纸", "预售请备注角色名与领取方式"]
  };
}

function buildAppearance(style: string, seed: string) {
  const map: Record<string, string> = {
    赛博幻想: `不对称短外套、半透明耳机、发梢带霓虹渐变，随身携带和“${seed}”相关的小型终端。`,
    校园怪谈: `宽松校服外套、旧社团徽章、眼下有浅淡阴影，书包挂着和“${seed}”相关的护身符。`,
    国风异能: `短褂与现代配件混搭，袖口藏有符纸纹样，发饰取自“${seed}”的意象。`,
    废土偶像: `舞台服与轻型护甲拼接，靴子有巡演贴纸，麦克风装饰呼应“${seed}”。`,
    日常治愈: `柔软针织外套、浅色发夹、随身小包里装着和“${seed}”有关的手作物。`
  };
  return map[style] ?? map["日常治愈"];
}

function buildPersonality(type: string) {
  const map: Record<string, string[]> = {
    主角: ["行动力强", "会逞强", "对弱者很温柔"],
    反派: ["礼貌疏离", "执念深", "擅长控制局面"],
    搭档: ["敏锐", "吐槽役", "关键时刻可靠"],
    NPC: ["神秘", "会说半句", "掌握重要线索"],
    看板娘: ["开朗", "记忆力好", "擅长把复杂事讲简单"]
  };
  return map[type] ?? map["主角"];
}

function buildAbility(style: string) {
  const map: Record<string, string> = {
    赛博幻想: "把情绪转译成可视化界面，短时间预测对手行动。",
    校园怪谈: "听见地点残留的愿望，并把愿望变成线索。",
    国风异能: "用纸符或墨痕临时修补现实里的裂缝。",
    废土偶像: "用歌声稳定失控机械，也能鼓舞同行者。",
    日常治愈: "把日常物件变成微小但可靠的护身符。"
  };
  return map[style] ?? map["日常治愈"];
}

function buildSpeech(type: string) {
  const map: Record<string, string> = {
    主角: "先别怕，我来开路。",
    反派: "你可以拒绝，但代价不会等你。",
    搭档: "这不是好主意，所以我陪你。",
    NPC: "答案已经在门口，只是你还没敲。",
    看板娘: "交给我整理，三分钟后能看懂。"
  };
  return map[type] ?? map["主角"];
}

function buildBoothHeadline(platform: string, event: string, booth: string) {
  if (platform === "QQ 群") return `${event} ${booth} 摊位信息`;
  if (platform === "微博") return `${event}｜${booth} 新品预售公开`;
  if (platform === "B 站动态") return `${booth} 的${event}周边展示`;
  return `${event}想带走一点 OC 星光吗`;
}

function buildBoothCopy(platform: string, event: string, booth: string, products: string, tone: string) {
  const voice = tone || "清爽热情";
  if (platform === "QQ 群") {
    return `${event}，${booth} 会带 ${products}。可现场看样，数量有限，想预留请直接回复商品名和数量。语气：${voice}。`;
  }
  if (platform === "微博") {
    return `${booth} 的 ${event} 摊宣来了。主推 ${products}，现场会放少量现货和试阅图，转发可抽一份小卡套组。`;
  }
  if (platform === "B 站动态") {
    return `这次 ${event} 准备了 ${products}，每个设计都围绕角色设定做了小细节。欢迎来 ${booth} 看实物和交换创作想法。`;
  }
  return `${event} 来 ${booth} 逛逛。准备了 ${products}，适合自留、交换和送同坑朋友。语气保持${voice}，重点放在角色设定和实物质感。`;
}
