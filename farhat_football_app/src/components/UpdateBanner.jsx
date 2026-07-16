import { useEffect, useState } from "react";
import "./UpdateBanner.css";

// Vite fingerprints the main bundle (e.g. /assets/index-CvUHKd6K.js) on every
// build. A tab left open across a deploy is still running the old bundle, which
// causes odd behaviour until the user reloads (previously: "close all your
// tabs"). We compare the bundle this tab loaded against the one index.html now
// points at, and offer a one-tap refresh.
const SCRIPT_RE = /\/assets\/index-[A-Za-z0-9_-]+\.js/;

function loadedBundle() {
	const el = document.querySelector(
		'script[type="module"][src*="/assets/index-"]',
	);
	const src = el?.getAttribute("src");
	return src?.match(SCRIPT_RE)?.[0] ?? null;
}

export default function UpdateBanner() {
	const [stale, setStale] = useState(false);

	useEffect(() => {
		const current = loadedBundle();
		// In dev the entry is /src/main.jsx, so there's nothing to compare.
		if (!current) return;

		let cancelled = false;

		const check = async () => {
			if (cancelled || stale) return;
			try {
				const res = await fetch(`/index.html?_=${Date.now()}`, {
					cache: "no-store",
				});
				if (!res.ok) return;
				const html = await res.text();
				const latest = html.match(SCRIPT_RE)?.[0];
				if (latest && latest !== current && !cancelled) {
					setStale(true);
				}
			} catch {
				// Offline or a transient failure — just try again next time.
			}
		};

		check();
		const id = setInterval(check, 5 * 60 * 1000);
		window.addEventListener("focus", check);

		return () => {
			cancelled = true;
			clearInterval(id);
			window.removeEventListener("focus", check);
		};
	}, [stale]);

	if (!stale) return null;

	return (
		<div className="update-banner" role="status">
			<span>A new version of Farhat Football is available.</span>
			<button onClick={() => window.location.reload()}>Refresh</button>
		</div>
	);
}
