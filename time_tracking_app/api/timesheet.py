import frappe
from frappe.utils import get_datetime

@frappe.whitelist()
def create_timesheet_for_punch(
    employee: str,
    project: str,
    activity_type: str,
    from_time: str,
    to_time: str,
    note: str | None = None,
):
    # ISO-Strings aus dem Frontend in Python datetime parsen
    from_dt = get_datetime(from_time)
    to_dt = get_datetime(to_time)

    # WICHTIG: Zeitzone entfernen, damit MySQL ein "normales" DATETIME bekommt
    if getattr(from_dt, "tzinfo", None) is not None:
        from_dt = from_dt.replace(tzinfo=None)

    if getattr(to_dt, "tzinfo", None) is not None:
        to_dt = to_dt.replace(tzinfo=None)

    if not from_dt or not to_dt:
        frappe.throw("From Time and To Time are required")

    duration_hours = (to_dt - from_dt).total_seconds() / 3600.0

    ts = frappe.get_doc({
        "doctype": "Timesheet",
        "employee": employee,
        "time_logs": [{
            "from_time": from_dt,
            "to_time": to_dt,
            "hours": duration_hours,
            "project": project,
            "activity_type": activity_type,
            "description": note or "",
        }],
    })

    ts.insert(ignore_permissions=True)
    ts.submit()

    return {
        "name": ts.name,
        "hours": duration_hours,
    }
