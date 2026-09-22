import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

/** 导出路由表，测试用 memory history 复用同一份配置。 */
export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'today-eat',
    component: () => import('@/views/TodayEatView.vue'),
    meta: { title: '今天吃什么' },
  },
  {
    path: '/browse',
    name: 'browse',
    component: () => import('@/views/BrowseView.vue'),
    meta: { title: '全部菜谱' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? '今天吃什么'
  document.title = `${title} · 饭点决定器`
})

export default router
