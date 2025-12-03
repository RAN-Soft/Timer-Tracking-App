import frappe
from frappe.utils import now_datetime
from time_tracking_app.api.timesheet import create_timesheet_from_checkins

def _get_employee_for_user(user=None):
    user = user or frappe.session.user
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if not employee:
        frappe.throw("Kein Employee für diesen Benutzer gefunden.")
    return employee

def _geo_required() -> bool:
    """Liest die Einstellung aus dem Single Doctype 'Time Tracking Settings'."""
    try:
        settings = frappe.get_single("Time Tracking Settings")
        return bool(settings.require_geolocation)
    except Exception:
        return True

def _require_coords_if_needed(latitude, longitude):
    """Nur prüfen, wenn Geo in den Einstellungen aktiviert ist."""
    if not _geo_required():
        # Geo nicht erzwungen → nichts prüfen
        return

    if latitude is None or longitude is None:
        frappe.throw("GPS muss aktiviert sein, um stempeln zu können.")


@frappe.whitelist()
def punch_in(project=None, activity_type=None, note=None,
             latitude=None, longitude=None, accuracy=None):
    employee = _get_employee_for_user()

    # nur prüfen, wenn in den Einstellungen aktiviert
    _require_coords_if_needed(latitude, longitude)

    open_punch = frappe.db.exists("Project Punch", {
        "employee": employee,
        "status": "Open",
    })
    if open_punch:
        frappe.throw("Es existiert bereits eine offene Stempel-Session.")

    checkin_in = frappe.get_doc({
        "doctype": "Employee Checkin",
        "employee": employee,
        "time": now_datetime(),
        "log_type": "IN",
    }).insert(ignore_permissions=True)

    punch = frappe.get_doc({
        "doctype": "Project Punch",
        "employee": employee,
        "project": project,
        "activity_type": activity_type,
        "checkin_in": checkin_in.name,
        "status": "Open",
        "note": note,
        # Koordinaten trotzdem speichern, falls vorhanden
        "latitude_in": latitude,
        "longitude_in": longitude,
        "accuracy_in": accuracy,
    }).insert(ignore_permissions=True)

    frappe.db.commit()
    return {"punch": punch.name}


@frappe.whitelist()
def punch_out(latitude=None, longitude=None, accuracy=None):
    employee = _get_employee_for_user()

    # nur prüfen, wenn in den Einstellungen aktiviert
    _require_coords_if_needed(latitude, longitude)

    punch_name = frappe.db.get_value("Project Punch", {
        "employee": employee,
        "status": "Open",
    }, "name")

    if not punch_name:
        frappe.throw("Keine offene Stempel-Session gefunden.")

    punch = frappe.get_doc("Project Punch", punch_name)

    checkin_out = frappe.get_doc({
        "doctype": "Employee Checkin",
        "employee": employee,
        "time": now_datetime(),
        "log_type": "OUT",
    }).insert(ignore_permissions=True)

    punch.checkin_out = checkin_out.name
    punch.status = "Closed"
    punch.latitude_out = latitude
    punch.longitude_out = longitude
    punch.accuracy_out = accuracy
    punch.save(ignore_permissions=True)

    # Timesheet-Erzeugung
    create_timesheet_from_checkins(punch)

    frappe.db.commit()
    return {"punch": punch.name}