import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import Auth0ProviderWithNavigate from "./Auth0ProviderWithNavigate.jsx";

// BrowserRouter must sit OUTSIDE the Auth0 provider so that the provider's
// onRedirectCallback can navigate back to the originally requested page.
createRoot(document.getElementById("root")).render(
	<StrictMode>
		<BrowserRouter>
			<Auth0ProviderWithNavigate>
				<App />
			</Auth0ProviderWithNavigate>
		</BrowserRouter>
	</StrictMode>,
);
