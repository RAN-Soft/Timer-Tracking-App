
/**
 * Meldet den Benutzer bei Frappe/ERPNext ab
 * und leitet zur Login-Seite weiter.
 */
export async function logout() {
    try {
        // Standard-Frappe-Logout-Endpoint
        await fetch('/api/method/logout', {
            method: 'GET',
            credentials: 'include',
        });
    } catch (e) {
        console.error('Logout error', e);
    }

    // Zur Login-Seite umleiten (ERPNext Standard)
    window.location.href = '/login?redirect-to=/time-tracking';
}
