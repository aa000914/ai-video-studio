/**
 * 统一资产 URL 解析器
 *
 * 从 generated_assets 或 subject 记录中解析图片 URL。
 * 按优先级尝试多个字段名，解决字段不一致问题。
 */

export function resolveAssetUrl(asset) {
  if (!asset) return null;
  return asset.url
    || asset.file_url
    || asset.output_url
    || asset.result_url
    || asset.image_url
    || null;
}

/**
 * 获取人物或场景的参考图 URL
 * 按优先级：主表字段 → assets 表
 */
export function getSubjectImageUrl(subject, assets = []) {
  // 1. 主表字段
  const url = subject?.reference_image_url
    || subject?.image_url
    || subject?.subject_image_url;
  if (url) return url;

  // 2. 从 assets 查找（按 entity_type + entity_id 匹配）
  const subjectId = subject?.id;
  const subjectName = subject?.name;
  if (!subjectId) return null;

  const matched = assets.filter((a) => {
    const meta = a.metadata || {};
    return (
      (a.entity_type === "character" || a.entity_type === "scene" || meta.target_type === "character" || meta.target_type === "scene")
      && (String(a.entity_id) === String(subjectId) || String(meta.target_id) === String(subjectId) || meta.target_name === subjectName)
    );
  });

  if (matched.length === 0) return null;

  // 返回最新的
  matched.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return resolveAssetUrl(matched[0]);
}

/**
 * 根据人物属性拼接中文提示词
 */
export function buildCharPromptCN(char) {
  if (!char) return "";
  const parts = [char.name];
  if (char.role) parts.push(char.role);
  if (char.age) parts.push(char.age + "岁");
  if (char.personality) parts.push(char.personality);
  if (char.appearance) parts.push(char.appearance);
  if (char.costume) parts.push(" 服装：" + char.costume);
  return parts.join("，");
}

/**
 * 根据场景属性拼接中文提示词
 */
export function buildScenePromptCN(scene) {
  if (!scene) return "";
  const parts = [scene.name];
  if (scene.location) parts.push("位于" + scene.location);
  if (scene.time_period) parts.push(scene.time_period);
  if (scene.description) parts.push(scene.description);
  if (scene.lighting) parts.push("光线：" + scene.lighting);
  if (scene.style) parts.push("风格：" + scene.style);
  return parts.join("，");
}
