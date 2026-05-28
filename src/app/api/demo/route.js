import { getServiceClient } from "@/lib/supabase";

const DEMO_TITLE = "秦王政十五年·扶苏寻师";

const CHARACTERS = [
  {
    name: "李天行",
    role: "主角",
    age: "28岁",
    personality: "穿越者男主，饥饿落魄但机敏。前秦国贵族后裔，才华横溢但隐姓埋名。外表谦和温润如玉，内心却藏着复国之志与对真相的执念。精通儒墨两家之学，世称'布衣奇士'",
    appearance: "身高约178cm，体型修长偏瘦，略带风尘仆仆感。面容清秀，剑眉星目，常着一身素色布衣长袍，头戴青巾。腰间系一枚和田玉佩，手掌有长期持剑留下的薄茧",
    costume: "月白色素面交领深衣（普通布衣质感），青灰色腰带，黑色皂靴。雨天外罩蓑衣斗笠。腰间佩一枚刻有秦篆的玉佩，是家族唯一遗物",
    prompt: "A 28-year-old ancient Chinese scholar-warrior in plain cloth robes, tall slender slightly travel-worn build, handsome refined face with sword-like eyebrows, wearing plain moon-white hemp robes with dark grey sash, a jade pendant at waist, standing with quiet dignity, wuxia aesthetic, photorealistic, cinematic lighting",
    notes: "【禁止变化点】① 玉佩必须始终在腰间、不可更换样式 ② 布衣质感，不可出现丝绸 ③ 左眼角下方有一颗小痣。演员需兼具书卷气与武者的锐利感。眼神在温和与锐利之间切换是关键",
  },
  {
    name: "秦王",
    role: "重要配角",
    age: "45岁",
    personality: "威严中年君主，求贤若渴。表面不苟言笑，实则对扶苏既严厉又寄予厚望，暗中关注着天下隐士的动向",
    appearance: "身着玄色王服，头戴冕冠，面容刚毅，短须，目光深邃。四十余岁却已两鬓微霜，透露出操劳国事的痕迹。手指修长有力",
    costume: "玄色十二章纹冕服，通天冠，纁色下裳，赤舄。日常则穿玄色深衣，束犀带。佩天子剑",
    prompt: "A 45-year-old ancient Chinese emperor, stern dignified face with short beard and graying temples, wearing black imperial robes with gold embroidery and crown, seated on throne, commanding presence, historical epic style, photorealistic, dramatic lighting",
    notes: "【禁止变化点】① 王服必须为玄色（黑），不可改为其他颜色 ② 冕冠必须端正，九旒 ③ 短须，不可出现长须或无须。需体现帝王威仪，但不过于刻板，保留人性温度",
  },
  {
    name: "淳于越",
    role: "配角",
    age: "62岁",
    personality: "先秦儒家士子，博学多识，明哲保身。外表圆滑世故，实则在关键时刻会坚守大义。是李天行寻找的历史真相的关键知情人",
    appearance: "白发苍苍，白须飘逸，面色红润，蓄三缕长髯。体型偏瘦，背微驼。总是眯着眼睛，似笑非笑，让人看不透心思",
    costume: "深褐色宽袍大袖儒袍，外罩鹤氅，手持一根紫竹杖。腰间挂一个青铜小葫芦，内装药酒",
    prompt: "A 62-year-old ancient Chinese Confucian scholar, white hair and flowing white beard, wearing dark brown wide-sleeved scholar robes with crane cloak, holding purple bamboo cane, wise knowing eyes, historical drama style, photorealistic",
    notes: "【禁止变化点】① 白须长髯，不可剪短或变色 ② 紫竹杖不离手 ③ 腰间青铜小葫芦必须出现。老戏骨出演最佳，表演应内敛克制，一句台词能藏三层意思",
  },
];

const SCENES = [
  {
    name: "咸阳城门皇榜处",
    location: "咸阳城正南门",
    time_period: "清晨",
    description: "高大的咸阳城门下人潮涌动。一张黄绫榜张贴在城门旁的石墙上，榜上墨迹犹新。远处可见城内楼阁飞檐，近处百姓三五成群围着榜文议论。晨光斜照在城门铜钉上，泛起金色光晕",
    lighting: "暖金色晨光侧打，带轻雾效果。城门铜钉有反光，地面有长影",
    style: "写实历史",
    prompt: "Ancient Chinese city gate of Xianyang at dawn, massive wooden gates with bronze studs, yellow imperial edict posted on stone wall, crowd of commoners in Hanfu gathering below, golden morning light with mist, historical epic, photorealistic, cinematic wide shot",
    notes: "需在襄阳唐城或横店取景，或使用AI生成。注意秦代建筑风格",
  },
  {
    name: "秦王殿",
    location: "咸阳宫正殿",
    time_period: "白天",
    description: "宽敞的秦宫大殿，十二盏青铜宫灯分列两侧。殿中央铺着黑红相间的织锦地毯，尽头是三层台阶上的王座。殿内光线偏暗，只有天窗透下的一束光照亮王座区域。殿柱上盘绕着青铜龙纹",
    lighting: "天窗顶光为主，辅以宫灯暖光。王座区明亮，四周偏暗，形成明暗对比",
    style: "写实历史",
    prompt: "Grand hall of Qin Dynasty palace, twelve bronze lamps lining both sides, black and red carpet leading to throne on three-tier platform, skylight beam illuminating the throne, bronze dragon carvings on pillars, ancient Chinese imperial architecture, dramatic chiaroscuro, photorealistic",
    notes: "重要场景，需体现秦国尚黑的审美和威严肃穆的氛围",
  },
  {
    name: "秦宫长廊",
    location: "咸阳宫东侧回廊",
    time_period: "黄昏",
    description: "一条依山势而建的半开放长廊，一侧是朱红廊柱，一侧是石砌矮墙。夕阳余晖穿过廊柱在地面投下长长的光影。廊外是咸阳城的全景，远处渭河如练。廊内每隔几步悬挂一盏风灯",
    lighting: "逆光夕阳，透过廊柱形成剪影效果。风灯暖光点缀",
    style: "写实历史",
    prompt: "Semi-open corridor of Qin Dynasty palace at dusk, vermillion pillars on one side, stone wall on the other, golden sunset casting long shadows through pillars, panoramic view of ancient Xianyang city and Wei River beyond, hanging lanterns, atmospheric, wuxia aesthetic, photorealistic",
    notes: "适合人物对话戏，光影变化丰富，适合长镜头",
  },
];

const SHOTS = [
  {
    shot_number: 1,
    duration: "6秒",
    scene_name: "咸阳城门皇榜处",
    characters: "李天行、群众",
    visual: "清晨的咸阳城门，一张新贴的'求贤令'在风中微微飘动。人群围在皇榜前议论纷纷。李天行背着行囊从远处走来，在人群外驻足观望",
    camera: "摇镜头，从城门全景右下摇到皇榜，再跟随李天行入画",
    dialogue: "路人甲：听说大王要为新太子寻师！\n路人乙：那可不是，连齐国稷下学宫的大儒都来了。",
    image_prompt: "Ancient Xianyang city gate at dawn, imperial edict posted on wall, crowd of commoners, Li Tianxing approaching from distance with traveling pack, golden morning light, historical epic, cinematic wide shot",
    video_prompt: "Slow pan from city gate to edict, crowd murmuring, character entering frame from right, morning mist, atmospheric establishing shot",
    sound: "城门铜铃轻响，人群低语声，远处马嘶声，古朴的笛子配乐渐起",
    status: "待生成",
  },
  {
    shot_number: 2,
    duration: "5秒",
    scene_name: "咸阳城门皇榜处",
    characters: "李天行",
    visual: "镜头推近李天行面部特写。他微微眯眼，嘴角露出一丝难以察觉的笑意。一只手指轻轻摩挲着腰间的玉佩。皇榜上的'求贤令'三个篆字映在他的瞳孔中",
    camera: "推镜头，从近景推至眼部特写",
    dialogue: "李天行（内心独白）：十五年……终于等到了。",
    image_prompt: "Close-up of Li Tianxing's face, subtle smile, eyes reflecting the edict text, fingers touching jade pendant, shallow depth of field, dramatic lighting, wuxia aesthetic",
    video_prompt: "Slow zoom from medium close-up to extreme close-up of eyes, reflection of edict in pupil, fingers touching jade, cinematic tension",
    sound: "心跳声渐起，玉佩轻叩声，背景嘈杂声渐弱，低沉弦乐一个音符",
    status: "待生成",
  },
  {
    shot_number: 3,
    duration: "8秒",
    scene_name: "秦王殿",
    characters: "秦王、侍从",
    visual: "秦王端坐于王座之上，面前几案上摊开数卷竹简。他拿起其中一卷，正是淳于越推荐李天行的奏章。身后侍从屏息而立。天窗光柱将他笼罩在一片明暗交界的光影中",
    camera: "固定中景，略仰拍，带前景（几案竹简）",
    dialogue: "秦王：淳于越举荐的人……布衣奇士李天行？有意思。",
    image_prompt: "King of Qin seated on throne, reading bamboo scrolls on desk, skylight beam creating dramatic light and shadow, servant standing behind, ancient Chinese palace interior, imperial authority, cinematic lighting",
    video_prompt: "Static medium shot with slight upward angle, light beam shifting slightly, king unfurling scroll, dust motes in light beam, slow dignified pace",
    sound: "竹简轻轻展开的声音，远处隐约的钟磬声，低沉威严的弦乐",
    status: "待生成",
  },
  {
    shot_number: 4,
    duration: "7秒",
    scene_name: "秦宫长廊",
    characters: "李天行、淳于越",
    visual: "黄昏的宫廊下，李天行与淳于越并肩而行。夕阳把两人的影子拉得很长。淳于越边走边用紫竹杖轻敲地面，节奏缓慢。李天行落后半步，侧耳倾听",
    camera: "跟拍侧面，平行移动，保持两人始终在画面左侧",
    dialogue: "淳于越：天行，你可知此番面见秦王，有多少双眼睛在盯着你？\n李天行：老师放心，弟子明白轻重。",
    image_prompt: "Two figures walking in corridor at sunset, long shadows on ground, old scholar with purple cane, young scholar listening respectfully, golden light through pillars, historical drama, atmospheric",
    video_prompt: "Side tracking shot following two characters walking, sunset light flickering through pillars, shadows stretching, cane tapping rhythm, contemplative mood",
    sound: "脚步声在石廊中的回声，竹杖敲地声，风吹宫灯轻响，悠远的箫声",
    status: "待生成",
  },
  {
    shot_number: 5,
    duration: "4秒",
    scene_name: "秦宫长廊",
    characters: "淳于越",
    visual: "淳于越突然停下脚步，转身直视李天行。夕阳在他脸上形成半明半暗的光影。他眯着的眼睛睁开了一些，露出少有的严肃神情",
    camera: "固定近景，正对淳于越",
    dialogue: "淳于越：不，你不明白。这朝堂之上，一句错话便是万劫不复。",
    image_prompt: "Close-up of old scholar's face, half-lit by sunset, eyes opening from squint to reveal serious expression, dramatic chiaroscuro, historical drama, intense",
    video_prompt: "Static close-up, character stopping and turning, light shifting across face, eyes revealing hidden intensity, slow dramatic tension",
    sound: "脚步声戛然而止，风吹衣袍声，一击沉闷的大鼓声，余音回荡",
    status: "待生成",
  },
  {
    shot_number: 6,
    duration: "6秒",
    scene_name: "秦王殿",
    characters: "秦王、李天行、淳于越、侍从",
    visual: "李天行跪于殿中，抬头直视秦王。秦王从王座上微微前倾身体。淳于越立于一旁，神色复杂。殿内宫灯火苗轻轻摇曳，映在每个人的脸上。整个画面充满张力",
    camera: "中景，带过肩视角（淳于越背后看殿中）",
    dialogue: "秦王：听说你曾在齐国游学十年？\n李天行：是的，大王。学的是经世致用之学。",
    image_prompt: "Grand palace hall, Li Tianxing kneeling in center facing the emperor, King leaning forward on throne, Chunyu Yue standing aside with complex expression, bronze lamps flickering, dramatic tension, historical epic",
    video_prompt: "Over-the-shoulder shot from Chunyu Yue, light flicker on faces, king leaning forward, kneeling scholar looking up, slow tension-building, cinematic",
    sound: "宫灯火焰微微爆裂声，衣料摩擦声，屏息般的寂静，低沉持续的弦乐",
    status: "待生成",
  },
  {
    shot_number: 7,
    duration: "5秒",
    scene_name: "秦王殿",
    characters: "秦王、李天行",
    visual: "秦王站起身来，一步步走下台阶。两个侍从立即跟上撑伞。秦王走到李天行面前，居高临下地审视他。两人目光交汇。一束天光恰好照亮两人之间的空间",
    camera: "跟拍秦王从王座走下，最后一个固定双人仰拍",
    dialogue: "秦王：那你告诉寡人，何为经世致用？",
    image_prompt: "King of Qin standing and walking down throne steps, approaching kneeling Li Tianxing, servants following with umbrellas, beam of light between two figures, dramatic power dynamic, historical epic",
    video_prompt: "Follow shot of king descending, servants moving with umbrellas, final static low-angle two-shot, light beam between them, power tension, cinematic",
    sound: "脚步声在空旷大殿中的回响，环佩轻响，沉默中弦乐渐强",
    status: "待生成",
  },
  {
    shot_number: 8,
    duration: "4秒",
    scene_name: "秦王殿",
    characters: "李天行",
    visual: "李天行面部特写。他缓缓开口，眼神坚定而清澈。嘴角的弧度流露出一种从容与自信。背景虚化成明暗交错的光斑",
    camera: "面部大特写",
    dialogue: "李天行：经世者，察百姓之苦。致用者，解天下之困。",
    image_prompt: "Extreme close-up of Li Tianxing's face, confident clear eyes, slight smile, mouth opening to speak, shallow depth of field with bokeh background, dramatic lighting, heroic portrait",
    video_prompt: "Static extreme close-up, eyes unwavering, subtle facial muscle movement as speech begins, shallow focus, heroic moment",
    sound: "呼吸声清晰可闻，远处一声钟鸣，激昂的弦乐起始",
    status: "待生成",
  },
  {
    shot_number: 9,
    duration: "8秒",
    scene_name: "秦王殿",
    characters: "秦王、李天行、淳于越、侍从",
    visual: "秦王听完李天行的回答，沉默了三秒，然后仰头大笑。笑声在空旷的大殿中回荡。淳于越暗暗松了一口气，用袖子擦了擦额头。侍从们面面相觑",
    camera: "全景，略带广角，从殿侧拍摄，囊括所有人",
    dialogue: "秦王：哈哈哈哈！好！好一个'解天下之困'！\n淳于越（低声自语）：成了……",
    image_prompt: "King of Qin laughing heartily with head tilted back in grand hall, Li Tianxing remaining composed, Chunyu Yue wiping forehead with sleeve, servants exchanging glances, dramatic wide shot, historical epic",
    video_prompt: "Wide shot of entire hall, king's laughter echoing, characters reacting differently, camera slight slow push-in, emotional release, cinematic",
    sound: "秦王笑声在殿中回荡，衣袖擦额声，配乐转为轻快的古筝",
    status: "待生成",
  },
  {
    shot_number: 10,
    duration: "7秒",
    scene_name: "咸阳城门皇榜处",
    characters: "李天行",
    visual: "夕阳西下。李天行再次站在城门皇榜前，这次榜上多了一张新帖——他被任命为太子师。周围百姓对他指指点点，目光中满是好奇与敬畏。他背对镜头，仰望着皇榜，腰间玉佩在夕阳下闪着温润的光",
    camera: "从李天行背后拍摄，逐渐拉远，最终定格为咸阳城全景夕阳图",
    dialogue: "李天行（内心独白）：故事，才刚刚开始。",
    image_prompt: "Li Tianxing standing before imperial edict at sunset, new appointment notice posted, commoners pointing and whispering behind him, jade pendant glowing in golden light, Xianyang city panorama, epic conclusion, cinematic",
    video_prompt: "Slow pull-back from behind character, revealing city panorama at sunset, crowd reactions, jade pendant glint, epic ending shot with dramatic sky, cinematic",
    sound: "风声呼啸，皇榜纸张翻动声，人群窃窃私语，磅礴的终曲配乐渐强至高潮后渐弱",
    status: "待生成",
  },
];

export async function POST() {
  try {
    const supabase = getServiceClient();

    // 1. 检查是否已存在同名项目
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("title", DEMO_TITLE)
      .maybeSingle();

    if (existing) {
      return Response.json({
        data: { id: existing.id },
        message: "演示项目已存在，直接跳转",
      });
    }

    // 2. 创建项目
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        title: DEMO_TITLE,
        type: "AI短剧",
        platform: "抖音/视频号",
        status: "策划中",
        description:
          "秦王政十五年，始皇帝为太子扶苏广寻天下名师。前秦贵族后裔李天行隐姓埋名十五年，在齐国稷下学宫游学归来，以布衣之身走入咸阳城。在淳于越的引荐下，他面见秦王，以一句'经世致用'赢得青睐，被任命为太子师。然而在这光鲜之下，一场关于身世、忠诚与道义的考验刚刚拉开帷幕。",
      })
      .select()
      .single();

    if (projErr) throw projErr;

    const projectId = project.id;

    // 3. 写入角色
    const charsWithProject = CHARACTERS.map((c) => ({
      ...c,
      project_id: projectId,
    }));
    const { error: charErr } = await supabase
      .from("characters")
      .insert(charsWithProject);
    if (charErr) throw charErr;

    // 4. 写入场景
    const scenesWithProject = SCENES.map((s) => ({
      ...s,
      project_id: projectId,
    }));
    const { error: sceneErr } = await supabase
      .from("scenes")
      .insert(scenesWithProject);
    if (sceneErr) throw sceneErr;

    // 5. 写入分镜
    const shotsWithProject = SHOTS.map((s) => ({
      ...s,
      project_id: projectId,
    }));
    const { error: shotErr } = await supabase
      .from("shots")
      .insert(shotsWithProject);
    if (shotErr) throw shotErr;

    return Response.json({
      data: { id: projectId },
      message: "演示项目创建成功",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
