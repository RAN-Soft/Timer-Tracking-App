
const BASE_URL = '/api/resource';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface FrappeResponse<T> {
    data: T;
}

// Generischer Wrapper NUR für /api/resource/... Endpunkte
async function frappeRequest<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
): Promise<T> {
    const csrf = getCsrfToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (csrf) {
        headers['X-Frappe-CSRF-Token'] = csrf;
    }

    const res = await fetch(path, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();

    if (!res.ok) {
        console.error('frappeRequest error', method, path, res.status, text);

        // Error-Objekt mit extra Infos
        const error = new Error(`Frappe request failed: ${res.status}`);
        (error as any).status = res.status;
        (error as any).responseText = text;
        throw error;
    }

    try {
        const json = JSON.parse(text) as FrappeResponse<T>;
        return json.data;
    } catch {
        return text as unknown as T;
    }
}

// -----------------------------------------------------
// CSRF
// -----------------------------------------------------
function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()!.split(';').shift() || null;
    }
    return null;
}

function getCsrfToken(): string | null {
    const w = window as any;
    return (
        w.csrf_token ||
        (w.frappe && w.frappe.csrf_token) ||
        getCookie('csrf_token') ||
        null
    );
}

// -----------------------------------------------------
// User / Employee Mapping
// -----------------------------------------------------

export async function getCurrentUserName(): Promise<string> {
    const res = await fetch('/api/method/frappe.auth.get_logged_user', {
        credentials: 'include',
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('getCurrentUserName error', res.status, text);
        throw new Error(`get_logged_user failed: ${res.status}`);
    }

    const json = (await res.json()) as { message?: string };
    if (!json.message) {
        throw new Error('get_logged_user: no "message" in response');
    }

    return json.message;
}

export async function getCurrentEmployeeName(): Promise<string> {
    const userName = await getCurrentUserName();
    console.log('Mapping user to employee, userName =', userName);

    const params = new URLSearchParams({
        fields: '["name","user_id"]',
        filters: JSON.stringify([['user_id', '=', userName]]),
        limit_page_length: '1',
    });

    const url = `/api/resource/Employee?${params.toString()}`;
    const res = await fetch(url, { credentials: 'include' });

    if (!res.ok) {
        const text = await res.text();
        console.warn('getCurrentEmployeeName HTTP error, fallback to userName:', res.status, text);
        return userName;
    }

    const json = await res.json();
    const list = (json as any).data as { name?: string; user_id?: string }[] | undefined;
    console.log('Employee list response', list);

    if (Array.isArray(list) && list.length > 0 && list[0] && list[0].name) {
        console.log('Using employee', list[0].name);
        return list[0].name;
    }

    console.warn('No Employee found for user', userName, '- using userName as fallback');
    return userName;
}

// -----------------------------------------------------
// HR Settings (Geo-Flag)
// -----------------------------------------------------

export interface HRSettings {
    name?: string;
    enable_geolocation?: number | boolean;
    enable_attendance_geolocation?: number | boolean;
    enable_checkin_checkout_geo_location?: number | boolean;
    allow_geolocation_tracking?: number | boolean; // wichtig für Pflicht-GPS
}

export async function fetchHRSettings(): Promise<HRSettings | null> {
    try {
        const res = await fetch('/api/resource/HR Settings/HR Settings', {
            credentials: 'include',
        });

        if (!res.ok) {
            const text = await res.text();
            console.warn('fetchHRSettings HTTP error', res.status, text);
            return null;
        }

        const json = await res.json();
        console.log('HRSettings response', json);
        return (json as any).data as HRSettings;
    } catch (e) {
        console.error('fetchHRSettings error', e);
        return null;
    }
}

// -----------------------------------------------------
// Projekte / Aktivitäten / Leave Types
// -----------------------------------------------------

export interface ProjectApi {
    name: string;                // ID (z.B. PROJ-0001)
    project_name?: string;       // sprechender Name
}

export interface ActivityApi {
    name: string;
}

export interface LeaveTypeApi {
    name: string;
}

export async function fetchProjects(): Promise<ProjectApi[]> {
    const res = await fetch(
        `/api/resource/Project?fields=["name","project_name"]&limit_page_length=1000`,
        { credentials: 'include' },
    );

    if (!res.ok) {
        const text = await res.text();
        console.error('fetchProjects error', res.status, text);
        throw new Error(`fetchProjects failed: ${res.status}`);
    }

    const json = await res.json();
    console.log('fetchProjects raw response', json);

    const data = (json as any).data;
    if (!Array.isArray(data)) {
        console.warn('fetchProjects: data is not array, got', data);
        return [];
    }

    return data.filter((p: any) => p && typeof p.name === 'string');
}

export async function fetchActivities(): Promise<ActivityApi[]> {
    const res = await fetch(
        `/api/resource/Activity Type?fields=["name"]&limit_page_length=1000`,
        { credentials: 'include' },
    );

    if (!res.ok) {
        const text = await res.text();
        console.error('fetchActivities error', res.status, text);
        throw new Error(`fetchActivities failed: ${res.status}`);
    }

    const json = await res.json();
    console.log('fetchActivities raw response', json);

    const data = (json as any).data;
    if (!Array.isArray(data)) {
        console.warn('fetchActivities: data is not array, got', data);
        return [];
    }

    return data.filter((a: any) => a && typeof a.name === 'string');
}

export async function fetchLeaveTypes(): Promise<LeaveTypeApi[]> {
    const res = await fetch(
        `/api/resource/Leave Type?fields=["name"]&limit_page_length=1000`,
        { credentials: 'include' },
    );

    if (!res.ok) {
        const text = await res.text();
        console.error('fetchLeaveTypes error', res.status, text);
        throw new Error(`fetchLeaveTypes failed: ${res.status}`);
    }

    const json = await res.json();
    console.log('fetchLeaveTypes raw response', json);

    const data = (json as any).data;
    if (!Array.isArray(data)) {
        console.warn('fetchLeaveTypes: data is not array, got', data);
        return [];
    }

    return data.filter((lt: any) => lt && typeof lt.name === 'string');
}

// -----------------------------------------------------
// Employee Checkin (HRMS)
// -----------------------------------------------------

export type CheckinLogType = 'IN' | 'OUT';

export interface EmployeeCheckinPayload {
    employee: string;
    time: string;
    log_type: CheckinLogType;
    latitude?: number;
    longitude?: number;
}

const EMPLOYEE_CHECKIN_DTYPE = 'Employee Checkin';

export async function createEmployeeCheckin(doc: EmployeeCheckinPayload) {
    console.log('createEmployeeCheckin', doc);
    return frappeRequest<any>(
        'POST',
        `${BASE_URL}/${encodeURIComponent(EMPLOYEE_CHECKIN_DTYPE)}`,
        { ...doc, doctype: EMPLOYEE_CHECKIN_DTYPE },
    );
}

// -----------------------------------------------------
// Timesheet aus Punch
// -----------------------------------------------------

export interface TimesheetFromPunchPayload {
    employee: string;
    project: string;
    activity_type: string;
    from_time: string;
    to_time: string;
    note?: string;
}

interface TimesheetFromPunchResponse {
    name: string;
    hours: number;
}

export async function createTimesheetForPunch(
    payload: TimesheetFromPunchPayload,
): Promise<TimesheetFromPunchResponse> {
    console.log('createTimesheetForPunch payload', payload);
    const res = await fetch('/api/method/tta.api.timesheet.create_timesheet_for_punch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const text = await res.text();
        console.error('createTimesheetForPunch error', res.status, text);
        throw new Error(`Timesheet creation failed: ${res.status}`);
    }

    const json = await res.json();
    console.log('createTimesheetForPunch response', json);
    return (json as any).message as TimesheetFromPunchResponse;
}

// -----------------------------------------------------
// Leave Application (Standard ERPNext)
// -----------------------------------------------------

export interface FrappeLeaveRequestPayload {
    employee: string;
    from_date: string;
    to_date: string;
    leave_type: string;
    reason?: string;
}

const LEAVE_APPLICATION_DTYPE = 'Leave Application';

export async function createLeaveRequest(doc: FrappeLeaveRequestPayload) {
    console.log('createLeaveRequest payload', doc);

    const res = await fetch(`/api/resource/${encodeURIComponent(LEAVE_APPLICATION_DTYPE)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...doc, doctype: LEAVE_APPLICATION_DTYPE }),
    });

    const text = await res.text();

    if (!res.ok) {
        console.error('createLeaveRequest error', res.status, text);

        let msg = 'Fehler beim Erstellen des Urlaubsantrags';

        try {
            const json = JSON.parse(text);

            // Frappe / HRMS packt oft "exception" oder "_server_messages"
            if (typeof json.exception === 'string' && json.exception) {
                msg = json.exception;
            } else if (json._server_messages) {
                try {
                    // _server_messages ist oft ein JSON-Array als String
                    const serverMessages = JSON.parse(json._server_messages);
                    if (Array.isArray(serverMessages) && serverMessages.length > 0) {
                        msg = serverMessages.join('\n');
                    }
                } catch {
                    // ignorieren, fallback bleibt msg
                }
            } else if (typeof json.message === 'string' && json.message) {
                msg = json.message;
            }
        } catch {
            // text war kein JSON, dann nehmen wir den HTTP-Status + Text
            if (text) {
                msg = text;
            }
        }

        throw new Error(msg);
    }

    // Erfolgsfall → versuchen JSON wieder zu parsen
    try {
        const json = JSON.parse(text);
        return (json as any).data;
    } catch {
        return undefined;
    }
}
