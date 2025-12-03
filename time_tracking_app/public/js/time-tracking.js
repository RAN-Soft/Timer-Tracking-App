frappe.ready(function () {
    const btnIn = document.getElementById("btn-in");
    const btnOut = document.getElementById("btn-out");
    const statusEl = document.getElementById("stempel-status");
    const projectSelect = document.getElementById("project-select");
    const activitySelect = document.getElementById("activity-type-select");

    if (!btnIn || !btnOut) return;

    loadProjects();
    loadActivityTypes();

    btnIn.addEventListener("click", () => {
        setStatus("Stemple EIN ...");
        btnIn.disabled = true;
        btnOut.disabled = true;

        const project = projectSelect.value || null;
        const activity_type = activitySelect?.value || null;

        frappe.call({
            method: "time_tracking_app.api.punch.punch_in",
            args: { project, activity_type },
            callback(r) {
                if (r.exc) {
                    setStatus("Fehler beim Stempeln (IN).");
                } else {
                    setStatus("Eingestempelt.");
                }
            },
            always() {
                btnIn.disabled = false;
                btnOut.disabled = false;
            },
        });
    });

    btnOut.addEventListener("click", () => {
        setStatus("Stemple AUS ...");
        btnIn.disabled = true;
        btnOut.disabled = true;

        frappe.call({
            method: "time_tracking_app.api.punch.punch_out",
            callback(r) {
                if (r.exc) {
                    setStatus("Fehler beim Stempeln (OUT).");
                } else {
                    setStatus("Ausgestempelt.");
                }
            },
            always() {
                btnIn.disabled = false;
                btnOut.disabled = false;
            },
        });
    });

    function setStatus(msg) {
        if (statusEl) statusEl.innerText = msg;
    }

    function loadProjects() {
        if (!projectSelect) return;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Project",
                fields: ["name", "project_name"],
                filters: { status: "Open" },
                limit_page_length: 100,
            },
            callback(r) {
                if (!r.message) return;
                r.message.forEach((p) => {
                    const opt = document.createElement("option");
                    opt.value = p.name;
                    opt.textContent = p.project_name || p.name;
                    projectSelect.appendChild(opt);
                });
            },
        });
    }

    function loadActivityTypes() {
        if (!activitySelect) return;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Activity Type",
                fields: ["name"],
                filters: { disabled: 0 },
                limit_page_length: 100,
            },
            callback(r) {
                if (!r.message) return;
                r.message.forEach((a) => {
                    const opt = document.createElement("option");
                    opt.value = a.name;
                    opt.textContent = a.name;
                    activitySelect.appendChild(opt);
                });
            },
        });
    }
});