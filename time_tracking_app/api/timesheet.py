import frappe

def create_timesheet_from_checkins(punch):
    # punch = Project Punch Doctype   (aus deiner App)
    checkin_in_time = frappe.db.get_value("Employee Checkin", punch.checkin_in, "time")
    checkin_out_time = frappe.db.get_value("Employee Checkin", punch.checkin_out, "time")

    if not checkin_in_time or not checkin_out_time:
        frappe.throw("Checkin-Zeiten unvollständig.")
        
    duration_hours = (checkin_out_time - checkin_in_time).total_seconds() / 3600.0
    activity_type = punch.activity_type or "Arbeit"

    ts = frappe.get_doc({
        "doctype": "Timesheet",
        "employee": punch.employee,
        "time_logs": [{
            "from_time": checkin_in_time,
            "to_time": checkin_out_time,
            "hours": duration_hours,
            "project": punch.project,
            "activity_type": activity_type,
            "description": punch.note,
        }]
    })
    ts.insert(ignore_permissions=True)
    ts.submit()

    # Status aktualisieren
    punch.status = "SyncedToTimesheet"
    punch.db_update()

    return ts.name