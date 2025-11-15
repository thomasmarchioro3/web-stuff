const TOKEN_STORAGE_KEY = "accessToken"

document.addEventListener("DOMContentLoaded", () => {
	const loginForm = document.getElementById("loginForm")
	const userContentDiv = document.getElementById("userContent")
	const logoutBtn = document.getElementById("logoutBtn")

	const updateAuthUI = () => {
		const hasToken = Boolean(localStorage.getItem(TOKEN_STORAGE_KEY))
		if (userContentDiv) {
			userContentDiv.hidden = !hasToken
		}

		if (loginForm) {
			loginForm.hidden = hasToken
		}
	}

	const formDataToUrlEncoded = (formData) => {
		const params = new URLSearchParams()
		formData.forEach((value, key) => {
			params.append(key, value)
		})
		return params
	}

	const showError = (message) => {
		// Keep the UI simple by surfacing errors via alert for now.
		alert(message)
	}

	if (loginForm) {
		loginForm.addEventListener("submit", async (event) => {
			event.preventDefault()

			const formData = new FormData(loginForm)
			const response = await fetch("/token", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: formDataToUrlEncoded(formData),
			}).catch((error) => {
				console.error("Failed to reach server", error)
				showError("Unable to reach the server. Please try again.")
			})

			if (!response) {
				return
			}

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => null)
				const errorMsg =
					errorPayload?.detail || "Invalid username or password."
				showError(errorMsg)
				return
			}

			const { access_token: accessToken } = await response.json()
			if (typeof accessToken === "string" && accessToken.length > 0) {
				localStorage.setItem(TOKEN_STORAGE_KEY, accessToken)
				loginForm.reset()
				updateAuthUI()
			} else {
				showError("Unexpected server response.")
			}
		})
	}

	if (logoutBtn) {
		logoutBtn.addEventListener("click", async () => {
			const accessToken = localStorage.getItem(TOKEN_STORAGE_KEY)
			if (!accessToken) {
				updateAuthUI()
				return
			}

			const response = await fetch("/logout", {
				method: "POST",
				headers: {
					Authorization: `Bearer ${accessToken}`,
				},
			}).catch((error) => {
				console.error("Failed to reach server", error)
			})

			if (response && !response.ok) {
				console.error("Logout request failed", response.statusText)
			}

			localStorage.removeItem(TOKEN_STORAGE_KEY)
			updateAuthUI()
		})
	}

	updateAuthUI()
})
