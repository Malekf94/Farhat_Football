import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";

createRoot(document.getElementById("root")).render(
	<StrictMode>
		<Auth0Provider
			domain={import.meta.env.VITE_AUTH0_DOMAIN}
			clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
			authorizationParams={{
				redirect_uri: window.location.origin,
				audience: "https://farhat-football.uk.auth0.com/api/v2/",
				scope: "openid profile email",
			}}
		>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</Auth0Provider>
	</StrictMode>
);
