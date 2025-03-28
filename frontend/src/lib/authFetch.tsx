let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

const getAccessToken = async (): Promise<{ok: boolean, data: string, err: string}> => {
    const response = await fetch("https://scrabble.brimveyn.dev/api/me", {
		method: 'GET',
		headers: {'Content-Type': 'application/json' },
    });

    if (response.ok) {
		console.log("[AuthFetch]: Authentication successfull");
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
                    throw new Error("Failed to refresh token");
                }
                isRefreshing = false;
                refreshPromise = null;
            }).catch((err) => {
                isRefreshing = false;
                refreshPromise = null;
                throw err;
            });
        }

        // Wait for the refresh attempt to complete
        await refreshPromise;
		console.log("[AuthFetch]: Access expired, trying refesh");
        return getAccessToken(); // Try again after refresh
    }

	return {ok: false, data: "", err: "Failed to refresh token"};
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
    try {
        // Try to get a token
        const {ok, err}= await getAccessToken();

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
