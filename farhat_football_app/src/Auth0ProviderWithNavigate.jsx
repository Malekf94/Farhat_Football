import { Auth0Provider } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

// Wraps Auth0Provider so that after login we can send the user back to the page
// they originally asked for (e.g. a match link on a host portal), instead of
// dumping them on the home screen.
export default function Auth0ProviderWithNavigate({ children }) {
	const navigate = useNavigate();

	// Auth0 redirects back to the site root; appState carries where to go next.
	const onRedirectCallback = (appState) => {
		navigate(appState?.returnTo || "/", { replace: true });
	};

	return (
		<Auth0Provider
			domain={import.meta.env.VITE_AUTH0_DOMAIN}
			clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
			authorizationParams={{
				redirect_uri: window.location.origin,
				audience: import.meta.env.VITE_AUTH0_AUDIENCE,
				scope: "openid profile email",
				response_type: "code",
			}}
			cacheLocation="localstorage"
			onRedirectCallback={onRedirectCallback}
		>
			{children}
		</Auth0Provider>
	);
}

Auth0ProviderWithNavigate.propTypes = {
	children: PropTypes.node,
};
