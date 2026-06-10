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

  // 2. 从 assets 查找（按 entity_type + entity_id 匹配，支持多种 JSONB key 格式）
  const subjectId = subject?.id;
  const subjectName = subject?.name;
  if (!subjectId) return null;

  const matched = assets.filter((a) => {
    // Only match image-type assets
    if (a.type !== "image" && a.asset_type !== "image") return false;
    const meta = a.metadata || {};
    // Check multiple metadata key formats (JSONB may serialize differently)
    const targetType = a.entity_type || a.target_type
      || meta.target_type || meta.targetType || meta._target_type
      || meta.entity_type || meta.entityType
      || "";
    const targetId = a.entity_id || a.target_id
      || meta.target_id || meta.targetId || meta._target_id
      || meta.entity_id || meta.entityId
      || "";
    const targetName = a.entity_name || a.target_name
      || meta.target_name || meta.targetName || meta._target_name
      || meta.entity_name || meta.entityName
      || "";

    const idMatch = String(targetId) === String(subjectId);
    const nameMatch = targetName === subjectName;
    const typeMatch = targetType === "character" || targetType === "scene" || targetType === "subject";

    return typeMatch && (idMatch || nameMatch);
  });

  if (matched.length === 0) return null;

  matched.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
  return resolveAssetUrl(matched[0]);
}

/**
 * 根据人物属性拼接中文提示词
 * V2.8: 加入全身完整入镜、角色设定图等要求
 */
export function buildCharPromptCN(char) {
  if (!char) return "";
  const parts = [`生成一张人物角色参考图：${char.name}`];
  if (char.age) parts.push(`${char.age}岁`);
  if (char.role) parts.push(char.role);
  if (char.description || char.personality) parts.push(char.description || char.personality);
  if (char.appearance) parts.push(char.appearance);
  if (char.costume) parts.push("服装：" + char.costume);
  // Always append body/quality requirements
  parts.push("要求：单人全身像，从头到脚完整入镜，身体不要被裁切，正面或三分之二侧身站姿，干净背景，服装和面部特征清晰，电影级写实风格，角色设定图");
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
