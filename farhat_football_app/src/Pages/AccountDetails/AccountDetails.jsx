import { useState } from "react";
import "./AccountDetails.css";

function AccountDetails() {
	const [userDetails, setUserDetails] = useState({
		name: "John Doe",
		email: "john.doe@gmail.com",
	});

	const handleChange = (e) => {
		const { name, value } = e.target;
		setUserDetails((prevDetails) => ({
			...prevDetails,
			[name]: value,
		}));
	};

	const handleSave = () => {
		// Update the user details via an API call
		console.log("User details updated:", userDetails);
	};

	return (
		<div className="page-content">
			<h1>Your Account</h1>
			<label>
				Name:
				<input
					type="text"
					name="name"
					value={userDetails.name}
					onChange={handleChange}
				/>
			</label>
			<label>
				Email:
				<input
					type="email"
					name="email"
					value={userDetails.email}
					onChange={handleChange}
				/>
			</label>
			<button onClick={handleSave}>Save</button>
		</div>
	);
}

export default AccountDetails;
