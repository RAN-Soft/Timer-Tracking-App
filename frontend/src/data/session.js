import { reactive } from "vue"

const loggedInUser = window.frappe?.session?.user || "Guest"

export const session = reactive({
    user: loggedInUser,
    isLoggedIn: loggedInUser && loggedInUser !== "Guest",
})