import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import PropTypes from "prop-types";
import { publicApi } from "../api";

// The default portal (your original site) has no slug in the URL.
export const DEFAULT_SLUG = "farhat";

const HostContext = createContext(null);

// Provides the "current portal" to everything below it. The slug comes from the
// route (/h/:slug/...); on the default routes it's absent, so we use 'farhat'.
export function HostProvider({ children }) {
	const { slug } = useParams();
	const activeSlug = slug || DEFAULT_SLUG;
	const isDefault = activeSlug === DEFAULT_SLUG;

	const [host, setHost] = useState(null);

	useEffect(() => {
		let cancelled = false;
		publicApi
			.get(`/api/v1/hosts/${activeSlug}`)
			.then((res) => {
				if (!cancelled) setHost(res.data);
			})
			.catch(() => {
				if (!cancelled) setHost(null);
			});
		return () => {
			cancelled = true;
		};
	}, [activeSlug]);

	// Build a link that stays inside the current portal.
	// hostPath("/matches") -> "/matches" (default) or "/h/sunday-legends/matches"
	const base = isDefault ? "" : `/h/${activeSlug}`;
	const hostPath = (path = "") => `${base}${path}`;

	return (
		<HostContext.Provider
			value={{
				host,
				hostId: host?.host_id ?? null,
				slug: activeSlug,
				isDefault,
				hostPath,
			}}
		>
			{children}
		</HostContext.Provider>
	);
}

HostProvider.propTypes = {
	children: PropTypes.node,
};

export const useHost = () => useContext(HostContext);
