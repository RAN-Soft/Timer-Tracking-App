import frappe
from frappe.boot import load_translations, nowdate, add_days

no_cache = 1

def get_context(context):
    csrf_token = frappe.sessions.get_csrf_token()
    context.csrf_token = csrf_token
    context.site_name = frappe.local.site
    context.boot = get_boot()
    return context


def get_boot():
    bootinfo = frappe._dict(
        {
            "site_name": frappe.local.site,
        }
    )
    bootinfo.lang = frappe.local.lang
    load_translations(bootinfo)
    return bootinfo