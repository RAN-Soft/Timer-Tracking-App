import { ref, computed } from 'vue';
import { getCurrentUserName } from '@/services/frappeApi';
import { logout as frappeLogout } from '@/services/authService';

function computeInitials(name: string): string {
    if (!name) return 'U';

    const base = name.includes('@') ? name.split('@')[0] : name;

    if (base.includes('.')) {
        const parts = base.split('.');
        const first = parts[0]?.[0] ?? '';
        const last = parts[1]?.[0] ?? '';
        return (first + last).toUpperCase() || base.slice(0, 2).toUpperCase();
    }

    return base.slice(0, 2).toUpperCase();
}

export function useUserAvatar() {
    const userInitials = ref<string>('U');

    const avatarColor = computed(() => {
        const colors = [
            '#4F46E5',
            '#EF4444',
            '#10B981',
            '#3B82F6',
            '#F59E0B',
            '#6366F1',
        ];

        const user = userInitials.value || 'U';
        let sum = 0;

        for (let i = 0; i < user.length; i++) {
            sum += user.charCodeAt(i);
        }

        return colors[sum % colors.length];
    });

    async function loadUserInitials() {
        try {
            const user = await getCurrentUserName();
            userInitials.value = computeInitials(user);
        } catch (e) {
            console.warn('Could not load current user for avatar', e);
        }
    }

    async function logout() {
        await frappeLogout();
    }

    return {
        userInitials,
        avatarColor,
        loadUserInitials,
        logout,
    };
}
