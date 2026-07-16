// src/api.js
import axios from "axios";

// 1. The Public Instance (No token needed)
export const publicApi = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

// 2. The Private Instance (Token will be attached here)
export const privateApi = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
});

// Track interceptor ids so repeated setup calls don't stack duplicates.
let requestInterceptorId = null;
let responseInterceptorId = null;

// This function "primes" the private instance with the Auth0 token logic
export const setupInterceptors = (getAccessTokenSilently) => {
	if (requestInterceptorId !== null) {
		privateApi.interceptors.request.eject(requestInterceptorId);
	}
	if (responseInterceptorId !== null) {
		privateApi.interceptors.response.eject(responseInterceptorId);
	}

	requestInterceptorId = privateApi.interceptors.request.use(
		async (config) => {
			try {
				const token = await getAccessTokenSilently();
				if (token) {
					config.headers.Authorization = `Bearer ${token}`;
				}
			} catch (error) {
				console.error("Could not get access token", error);
			}
			return config;
		},
		(error) => Promise.reject(error),
	);

	// A 401 usually means the cached token is stale — e.g. a tab left open
	// across a deploy, or a token issued before an Auth0 change. Force a fresh
	// token and retry once so users never have to close tabs or re-login by hand.
	// (403 is a genuine "not allowed" and is deliberately NOT retried.)
	responseInterceptorId = privateApi.interceptors.response.use(
		(response) => response,
		async (error) => {
			const original = error.config;
			if (
				error.response?.status === 401 &&
				original &&
				!original._retriedAfterRefresh
			) {
				original._retriedAfterRefresh = true;
				try {
					// cacheMode "off" bypasses the cached token and fetches a new one.
					const token = await getAccessTokenSilently({ cacheMode: "off" });
					if (token) {
						original.headers = {
							...original.headers,
							Authorization: `Bearer ${token}`,
						};
						return privateApi.request(original);
					}
				} catch (refreshError) {
					console.error("Token refresh failed", refreshError);
				}
			}
			return Promise.reject(error);
		},
	);
};
