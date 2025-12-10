import frappe

def get_context(context):
    # Wenn nicht eingeloggt → zur Login-Seite weiterleiten
    if frappe.session.user == "Guest":
        # nach erfolgreichem Login wieder zurück auf /time-tracking
        frappe.local.flags.redirect_location = "/login?redirect-to=/time-tracking"
        raise frappe.Redirect

    return context