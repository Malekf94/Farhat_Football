import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AccountDetails from "../AccountDetails/AccountDetails";
import LoginPage from "../LoginPage/LoginPage";
import "./YourPage.css";

function YourPage() {
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const navigate = useNavigate();

	useEffect(() => {
		// Simulating checking login status from localStorage or API
		const userToken = localStorage.getItem("userToken");
		if (userToken) {
			setIsLoggedIn(true);
		} else {
			setIsLoggedIn(false);
		}
	}, []);

	const handleLoginSuccess = (token) => {
		localStorage.setItem("userToken", token);
		setIsLoggedIn(true);
		navigate("/your-account"); // Redirect to the account page
	};

	return (
		<div>
			{isLoggedIn ? (
				<AccountDetails />
			) : (
				<LoginPage onLoginSuccess={handleLoginSuccess} />
			)}
		</div>
	);
}

export default YourPage;
