// 六位预设角色（三女三男）
export const CHARACTERS = [
  { id: 'f1', gender: 'f', name: '清知', title: '清冷知性', file: 'f1.svg',
    personality: '清冷知性，优雅克制，话不多但很会照顾人，偶尔露出温柔的一面',
    voice: 'zh-CN-XiaoxiaoNeural', tags: '银黑渐变直发 · 细框眼镜 · 衬衫马甲' },
  { id: 'f2', gender: 'f', name: '小野', title: '甜酷元气', file: 'f2.svg',
    personality: '甜酷元气，活泼自信，爱玩爱闹，但也会认真听你说话',
    voice: 'zh-CN-XiaoyiNeural', tags: '高马尾挑染 · 皮夹克 · 链条配饰' },
  { id: 'f3', gender: 'f', name: '晚晚', title: '温柔治愈', file: 'f3.svg',
    personality: '温柔治愈，柔软温暖，喜欢抱着玩偶听你说话，总能抚平你的情绪',
    voice: 'zh-CN-XiaoxiaoNeural', tags: '长卷发 · 奶油针织衫 · 怀抱小兔' },
  { id: 'm1', gender: 'm', name: '砚清', title: '清冷学霸', file: 'm1.svg',
    personality: '清冷学霸，理性克制，外冷内热，习惯默默把你放在心上',
    voice: 'zh-CN-YunxiNeural', tags: '黑发 · 细框眼镜 · 针织衫' },
  { id: 'm2', gender: 'm', name: '阿野', title: '甜酷年下', file: 'm2.svg',
    personality: '甜酷年下，活泼亲近，黏人又爱撒娇，耳机里永远放着音乐',
    voice: 'zh-CN-YunjianNeural', tags: '挑染短发 · 连帽卫衣 · 耳机' },
  { id: 'm3', gender: 'm', name: '承屿', title: '成熟温柔', file: 'm3.svg',
    personality: '成熟温柔，稳重可靠，像一杯温热的咖啡，永远接得住你的情绪',
    voice: 'zh-CN-YunyangNeural', tags: '微卷发 · 风衣 · 咖啡' },
]

export const charById = (id) => CHARACTERS.find((c) => c.id === id) || null

export const charFile = (id) => {
  const c = charById(id)
  return `/characters/${(c || CHARACTERS[2]).file}`
}
