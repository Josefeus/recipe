/**
 * Category configuration shared by the upstream sync script
 * (scripts/sync-cooklikehoc.mjs) and the data builder
 * (frontend/scripts/build-recipes.mjs).
 *
 * The order below is the tab order in the frontend. Each `key` must match an
 * upstream top-level directory name inside Gar-b-age/CookLikeHOC.
 *
 * 分类顺序即前端 tab 顺序；`key` 必须与上游仓库的顶层目录名一致。
 */
export const CATEGORIES = [
  { key: '炒菜', tag: '快炒', emoji: '🥘' },
  { key: '炖菜', tag: '慢炖', emoji: '🍲' },
  { key: '蒸菜', tag: '清蒸', emoji: '♨️' },
  { key: '砂锅菜', tag: '砂锅', emoji: '🍯' },
  { key: '煮锅', tag: '煮锅', emoji: '🥣' },
  { key: '汤', tag: '汤羹', emoji: '🥣' },
  { key: '烫菜', tag: '烫菜', emoji: '🥬' },
  { key: '凉拌', tag: '凉菜', emoji: '🥗' },
  { key: '卤菜', tag: '卤味', emoji: '🍗' },
  { key: '炸品', tag: '炸物', emoji: '🍤' },
  { key: '烤类', tag: '烤制', emoji: '🔥' },
  { key: '早餐', tag: '早餐', emoji: '🥟' },
  { key: '主食', tag: '主食', emoji: '🍚' },
  { key: '饮品', tag: '饮品', emoji: '🥤' },
]

/**
 * Upstream top-level directories that are deliberately not mirrored.
 *
 * `配料` holds semi-finished bases and sauces rather than dishes, so those
 * entries are not part of the "what to eat today" candidate pool; `docs` and
 * `docker_support` belong to the upstream project itself. `images` is mirrored
 * separately by the sync script.
 *
 * 配料/酱料属于半成品，不作为「今天吃什么」的候选，因此不纳入数据源副本。
 */
export const EXCLUDED_TOP_LEVEL_DIRS = ['配料', 'docker_support', 'docs', 'images']

/** Upstream keeps a per-category index file that is not part of the data. */
export const SKIPPED_MARKDOWN_FILE = /^readme\.md$/i
