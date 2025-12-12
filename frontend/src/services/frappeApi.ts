
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface FrappeResponse<T> {
    data: T;
    [key: string]: any;
}

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

function extractFrappeMessage(raw: string): string {
    if (!raw) return 'Unbekannter Fehler';

    try {
        const json = JSON.parse(raw);

        if (json.message && typeof json.message === 'string') {
            return json.message;
        }

        if (json._server_messages) {
            try {
                const msgs = JSON.parse(json._server_messages);
                if (Array.isArray(msgs) && msgs.length > 0) return msgs[0];
            } catch { }
        }

        if (json.exception && typeof json.exception === 'string') {
            const parts = json.exception.split('\n');
            return parts[parts.length - 1].trim().replace(/frappe\.exceptions\.[A-Za-z]+:\s*/g, '');
        }
    } catch { }

    if (raw.includes('Traceback')) {
        const lines = raw.trim().split('\n');
        return lines[lines.length - 1].trim().replace(/frappe\.exceptions\.[A-Za-z]+:\s*/g, '');
    }

    return raw.replace(/frappe\.exceptions\.[A-Za-z]+:\s*/g, '').trim();
}

// Generischer Wrapper (mit CSRF)
export async function frappeRequest<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
): Promise<T> {
    const csrf = getCsrfToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    if (csrf) headers['X-Frappe-CSRF-Token'] = csrf;

    const res = await fetch(path, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();

    if (!res.ok) {
        console.error('frappeRequest error', method, path, res.status, text);
        const msg = extractFrappeMessage(text);
        const err = new Error(msg);
        (err as any).status = res.status;
        (err as any).responseText = text;
        throw err;
    }

    try {
        const json = JSON.parse(text) as FrappeResponse<T>;
        return json.data;
    } catch {
        return text as unknown as T;
    }
}

// --------------------
// Auth / user / employee
// --------------------

export async function getCurrentUserName(): Promise<string> {
    const res = await fetch('/api/method/frappe.auth.get_logged_user', {
        method: 'GET',
        credentials: 'include',
    });
    const json = await res.json();
    return json.message as string;
}

export async function getCurrentEmployeeName(): Promise<string> {
    const user = await getCurrentUserName();

    const fields = encodeURIComponent(JSON.stringify(['name', 'user_id']));
    const filters = encodeURIComponent(JSON.stringify([['user_id', '=', user]]));

    const path = `/api/resource/Employee?fields=${fields}&filters=${filters}&limit_page_length=1`;
    const data = await frappeRequest<Array<{ name: string; user_id: string }>>('GET', path);

    if (!data || data.length === 0) {
        throw new Error(`Mitarbeiter: ${user} konnte nicht gefunden werden`);
    }
    return data[0].name;
}

// --------------------
// HR Settings
// --------------------

export interface HRSettings {
    allow_geolocation_tracking?: 0 | 1 | boolean;
}

export async function fetchHRSettings(): Promise<HRSettings | null> {
    try {
        const data = await frappeRequest<HRSettings>('GET', '/api/resource/HR%20Settings/HR%20Settings');
        return data;
    } catch (e) {
        console.warn('fetchHRSettings failed', e);
        return null;
    }
}

// --------------------
// Master data
// --------------------

export async function fetchProjects(): Promise<Array<{ id: string; name: string; number?: string }>> {
    const fields = encodeURIComponent(JSON.stringify(['name', 'project_name']));
    const path = `/api/resource/Project?fields=${fields}&limit_page_length=1000`;

    const list = await frappeRequest<Array<{ name: string; project_name?: string }>>('GET', path);

    return list.map((p) => ({
        id: p.name,
        name: p.project_name || p.name,
        number: p.name,
    }));
}

export async function fetchActivities(): Promise<Array<{ id: string; name: string }>> {
    const fields = encodeURIComponent(JSON.stringify(['name']));
    const path = `/api/resource/Activity%20Type?fields=${fields}&limit_page_length=1000`;
    const list = await frappeRequest<Array<{ name: string }>>('GET', path);
    return list.map((a) => ({ id: a.name, name: a.name }));
}

export async function fetchLeaveTypes(): Promise<Array<{ id: string; name: string }>> {
    const fields = encodeURIComponent(JSON.stringify(['name']));
    const path = `/api/resource/Leave%20Type?fields=${fields}&limit_page_length=1000`;
    const list = await frappeRequest<Array<{ name: string }>>('GET', path);
    return list.map((lt) => ({ id: lt.name, name: lt.name }));
}

// --------------------
// Attendance (Employees + todays checkins)
// --------------------

export interface EmployeeApi {
    name: string;
    first_name?: string;
    last_name?: string;
    employee_name?: string;
}

export interface EmployeeCheckinApi {
    name: string;
    employee: string;
    time: string;
    log_type: 'IN' | 'OUT';
}

export async function fetchEmployees(): Promise<EmployeeApi[]> {
    const fields = encodeURIComponent(
        JSON.stringify(['name', 'first_name', 'last_name', 'employee_name']),
    );

    const path = `/api/resource/Employee?fields=${fields}&limit_page_length=1000`;
    return frappeRequest<EmployeeApi[]>('GET', path);
}

export async function fetchTodayCheckins(): Promise<EmployeeCheckinApi[]> {
    const now = new Date();

    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const start = `${yyyy}-${mm}-${dd} 00:00:00`;
    const end = `${yyyy}-${mm}-${dd} 23:59:59`;

    const fields = encodeURIComponent(
        JSON.stringify(['name', 'employee', 'time', 'log_type']),
    );
    const filters = encodeURIComponent(
        JSON.stringify([
            ['time', '>=', start],
            ['time', '<=', end],
        ]),
    );

    const path =
        `/api/resource/Employee%20Checkin?fields=${fields}` +
        `&filters=${filters}` +
        `&order_by=time%20desc` +
        `&limit_page_length=1000`;

    return frappeRequest<EmployeeCheckinApi[]>('GET', path);
}

// --------------------
// Checkin + Timesheet + Leave
// --------------------

export interface EmployeeCheckinPayload {
    employee: string;
    time: string; // ISO
    log_type: 'IN' | 'OUT';
    latitude?: number;
    longitude?: number;
}

export async function createEmployeeCheckin(payload: EmployeeCheckinPayload) {
    const doctype = 'Employee Checkin';
    return frappeRequest<any>('POST', `/api/resource/${encodeURIComponent(doctype)}`, {
        doctype,
        ...payload,
    });
}

export interface TimesheetFromPunchPayload {
    employee: string;
    project: string;
    activity_type: string;
    from_time: string; // ISO
    to_time: string;   // ISO
    note?: string;
}

export async function createTimesheetForPunch(payload: TimesheetFromPunchPayload) {
    return frappeRequest<any>('POST', '/api/method/time_tracking_app.api.timesheet.create_timesheet_for_punch', payload);
}

export interface FrappeLeaveRequestPayload {
    employee: string;
    from_date: string; // yyyy-mm-dd
    to_date: string;   // yyyy-mm-dd
    leave_type: string;
    reason?: string;
}

export async function createLeaveRequest(doc: FrappeLeaveRequestPayload) {
    const doctype = 'Leave Application';
    return frappeRequest<any>('POST', `/api/resource/${encodeURIComponent(doctype)}`, {
        doctype,
        ...doc,
    });
}
