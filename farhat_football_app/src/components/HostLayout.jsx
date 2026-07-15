import { Outlet } from "react-router-dom";
import { HostProvider } from "../context/HostContext";

// Wraps a group of routes in the current portal's host context.
// Used for both the default routes (no slug) and the /h/:slug portal routes.
export default function HostLayout() {
	return (
		<HostProvider>
			<Outlet />
		</HostProvider>
	);
}
