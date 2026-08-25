import { describe, it, expect, vi } from "vitest";
import net from "node:net";

// TEST-002. app.cjs builds the Express app and returns it without listening, so
// the app can be inspected and driven offline; server.cjs is the only caller
// that binds a port.
//
// The three ordering facts asserted below all fail SILENTLY in production:
// a route mounted after the SPA catch-all serves index.html instead of JSON,
// and an error handler that loses its fourth parameter stops receiving errors
// altogether because Express detects handlers by arity.

const loadCreateApp = async () => {
	const mod = await import("../../app.cjs");
	return mod.default ?? mod;
};

// app._router is private and moved to app.router in Express 5. Fail loudly on an
// upgrade rather than silently skipping every assertion below.
const routerStack = (app) => {
	const stack = app._router?.stack ?? app.router?.stack;
	if (!Array.isArray(stack)) {
		throw new Error(
			"Express no longer exposes the router stack at app._router.stack or app.router.stack",
		);
	}
	return stack;
};

const isSpaCatchAll = (layer) => layer.regexp?.source === "^(.*)\\/?$";

describe("createApp", () => {
	it("builds the app without opening a port", async () => {
		const listen = vi.spyOn(net.Server.prototype, "listen");
		try {
			const createApp = await loadCreateApp();
			const app = createApp();

			expect(typeof app).toBe("function");
			expect(listen).not.toHaveBeenCalled();
		} finally {
			listen.mockRestore();
		}
	});

	it("returns a new app each call, so tests cannot leak state into each other", async () => {
		const createApp = await loadCreateApp();
		expect(createApp()).not.toBe(createApp());
	});

	it("mounts every API route before the SPA catch-all", async () => {
		const createApp = await loadCreateApp();
		const stack = routerStack(createApp());

		const catchAllIndex = stack.findIndex(isSpaCatchAll);
		expect(catchAllIndex).toBeGreaterThan(-1);

		const apiIndexes = stack
			.map((layer, index) => ({ index, source: layer.regexp?.source ?? "" }))
			.filter(({ source }) => source.includes("api\\/v1"))
			.map(({ index }) => index);

		// Guard against the filter silently matching nothing and passing.
		expect(apiIndexes.length).toBeGreaterThanOrEqual(12);
		expect(Math.max(...apiIndexes)).toBeLessThan(catchAllIndex);
	});

	it("mounts the Monzo webhook before the SPA catch-all", async () => {
		const createApp = await loadCreateApp();
		const stack = routerStack(createApp());

		const webhookIndex = stack.findIndex((layer) =>
			layer.regexp?.source.includes("monzo-webhook"),
		);
		expect(webhookIndex).toBeGreaterThan(-1);
		expect(webhookIndex).toBeLessThan(stack.findIndex(isSpaCatchAll));
	});

	it("registers the error handler last, with the four parameters Express requires", async () => {
		const createApp = await loadCreateApp();
		const stack = routerStack(createApp());

		const last = stack[stack.length - 1];
		expect(last.handle.length).toBe(4);
		expect(stack.filter((layer) => layer.handle.length === 4)).toHaveLength(1);
	});
});
