import frappe
from frappe.utils import nowdate, add_days

def _get_employee_for_user(user=None):
    user = user or frappe.session.user
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if not employee:
        frappe.throw("Kein Employee für diesen Benutzer gefunden.")
    return employee


@frappe.whitelist()
def get_projects():
    """Offene Projekte zurückgeben."""
    return frappe.get_all(
        "Project",
        fields=["name", "project_name"],
        filters={"status": "Open"},
        limit_page_length=100,
    )


@frappe.whitelist()
def get_activity_types():
    """Aktivitätstypen für Timesheets."""
    return frappe.get_all(
        "Activity Type",
        fields=["name"],
        filters={"disabled": 0},
        limit_page_length=100,
    )


@frappe.whitelist()
def get_today_checkins():
    """Heutige Employee Checkins des angemeldeten Mitarbeiters."""
    employee = _get_employee_for_user()

    start = nowdate()
    end = add_days(start, 1)

    return frappe.get_all(
        "Employee Checkin",
        fields=["name", "time", "log_type"],
        filters={
            "employee": employee,
            "time": ["between", [f"{start} 00:00:00", f"{end} 00:00:00"]],
        },
        order_by="time asc",
        limit_page_length=200,
    )


@frappe.whitelist()
def get_leave_types():
    """Verfügbare Urlaubsarten."""
    return frappe.get_all(
        "Leave Type",
        fields=["name"],
        filters={"is_lwp": 0},
        limit_page_length=100,
    )


@frappe.whitelist()
def create_leave_application(from_date, to_date, leave_type, reason=""):
    """Urlaubsantrag für den aktuellen User erstellen."""
    employee = _get_employee_for_user()

    doc = frappe.get_doc(
        {
            "doctype": "Leave Application",
            "employee": employee,
            "from_date": from_date,
            "to_date": to_date,
            "leave_type": leave_type,
            "description": reason,
            "status": "Open",  # oder "Draft", je nach HR-Workflow
        }
    )
    doc.insert()
    # evtl. nicht sofort submitten, damit HR prüfen kann
    return doc.name
