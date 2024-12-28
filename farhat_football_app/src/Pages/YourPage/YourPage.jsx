import { useAuth0 } from "@auth0/auth0-react";

function YourPage() {
	const { user, isAuthenticated } = useAuth0();

	return (
		<div className="page-content login-page">
			{isAuthenticated ? (
				<p>Welcome, {user?.name || user?.email}!</p>
			) : (
				<p>Please log in to continue.</p>
			)}
		</div>
	);
}

export default YourPage;
