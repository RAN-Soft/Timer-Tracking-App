import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

import TabsPage from '@/views/TabsPage.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/tabs/time',
    },
    {
        path: '/tabs/',
        component: TabsPage,
        children: [
            {
                path: '',
                redirect: '/tabs/time',
            },
            {
                path: 'time',
                component: () => import('@/views/TimePage.vue'),
            },
            {
                path: 'leave',
                component: () => import('@/views/LeavePage.vue'),
            },
            {
                path: 'attendance',
                component: () => import('@/views/AttendancePage.vue'),
            },
        ],
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: '/tabs/time',
    },
];

const router = createRouter({
    history: createWebHistory('/time-tracking/'),
    routes,
});

export default router;
