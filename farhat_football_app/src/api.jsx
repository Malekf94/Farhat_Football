// src/api.js
import axios from "axios";

// 1. The Public Instance (No token needed)
export const publicApi = axios.create({
	baseURL: import.meta.env.VITE_AUTH0_DOMAIN || "http://localhost:5000",
});

// 2. The Private Instance (Token will be attached here)
export const privateApi = axios.create({
	baseURL: import.meta.env.VITE_AUTH0_DOMAIN || "http://localhost:5000",
});

// This function "primes" the private instance with the Auth0 token logic
export const setupInterceptors = (getAccessTokenSilently) => {
	privateApi.interceptors.request.use(
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
};
