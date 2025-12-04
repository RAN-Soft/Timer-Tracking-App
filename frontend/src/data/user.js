import { reactive } from "vue"

const bootUser = window.frappe?.boot?.user || {}

export const userResource = reactive({
	name: bootUser.name || window.frappe?.session?.user || null,
	full_name: bootUser.full_name || "",
	first_name:
		bootUser.first_name ||
		(bootUser.full_name ? bootUser.full_name.split(" ")[0] : ""),
	email: bootUser.email || "",
	user_image: bootUser.user_image || null,
	language: window.frappe?.boot?.lang || "de",
	time_zone: bootUser.time_zone || "Europe/Vienna",
})