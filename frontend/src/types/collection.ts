/** 侧边集合面板的两个标签页。 */
export type CollectionTab = 'favorites' | 'tonight'

export interface CollectionTabMeta {
  key: CollectionTab
  label: string
  hint: string
  empty: string
  action: string
}

export const COLLECTION_TABS: readonly CollectionTabMeta[] = [
  {
    key: 'favorites',
    label: '收藏夹',
    hint: '存在本机浏览器里，换设备不同步',
    empty: '收藏夹还空着。抽到喜欢的菜，点一下「收藏」就会出现在这里。',
    action: '取消收藏',
  },
  {
    key: 'tonight',
    label: '今晚菜单',
    hint: '今晚准备做的菜',
    empty: '还没有选定的菜。抽到满意的，点一下「就它了」就会出现在这里。',
    action: '移除',
  },
] as const
