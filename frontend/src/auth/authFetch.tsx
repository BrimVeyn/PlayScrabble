let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;
let tryNo = 0;

const getAccessToken = async (): Promise<{ok: boolean, data: string, err: string}> => {
	const response = await fetch("https://scrabble.brimveyn.dev/api/me", {
		method: 'GET',
		headers: {'Content-Type': 'application/json' },
	});

	if (response.ok) {
		console.log("[AuthFetch]: Authentication successful");
		return {ok: true, data: "", err: ""}
	} else if (response.status === 401) {
		// Token expired — try to refresh it
		if (!isRefreshing) {
			isRefreshing = true;
			refreshPromise = fetch("https://scrabble.brimveyn.dev/api/refresh", {
				method: 'GET',
				headers: {'Content-Type': 'application/json' },
			}).then(async (res) => {
					if (!res.ok) {
						return await response.text();
					}
					isRefreshing = false;
					refreshPromise = null;
			}).then(body => { throw new Error(body); })
			.catch(() => {
				isRefreshing = false;
				tryNo++;
				refreshPromise = null;
				console.log("[AuthFetch]: Attempt number", tryNo, "failed");
			});
		}

		// Wait for the refresh attempt to complete
		await refreshPromise;
		console.log("[AuthFetch]: Access expired, trying refresh");
		if (tryNo < 2) return getAccessToken(); // Try again after refresh
	}
	return {ok: false, data: "", err: "Failed to refresh token"};
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
    try {
		tryNo = 0;
        // Try to get a token
        const {ok, err} = await getAccessToken();

        if (!ok) {
            throw new Error(err);
        }

        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }

        return response;
    } catch (error) {
        console.error("Error in authFetch:", error);
        throw error;
    }
};
