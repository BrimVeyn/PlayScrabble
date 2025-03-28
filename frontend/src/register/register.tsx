import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Navbar from "../navbar/Navbar";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Form, FormButton, FormField, FormError } from "../lib/Form";

import './register.css'

type Credentials = {
	email: string
	username: string,
	password: string,
	passwordConfirmation: string,
}

const defaultCredentials: Credentials = { email: "", username: "", password: "", passwordConfirmation: "" };

async function checkUsernameAndEmail(username: string, email: string): Promise<[boolean, string]> {
	try {
		const usernameResponse = await fetch("https://scrabble.brimveyn.dev/api/checkUsername", {
			method: 'POST', // Use POST if you're sending data in the body
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ username: username }),
		});

		const emailResponse = await fetch("https://scrabble.brimveyn.dev/api/checkEmail", {
			method: 'POST', // Use POST if you're sending data in the body
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: email }),
		});

		if (!usernameResponse.ok) {
			throw new Error("usernameTaken");
		} else if (!emailResponse.ok) {
			throw new Error("emailTaken");
		}
		console.log(usernameResponse, emailResponse);
		return [true, ""];
	} catch (e) {
		return [false, (e as Error).message];
	}
}

async function registerClient(email: string, username: string, password: string): Promise<[boolean, string]> {
	try {
		const response = await fetch("https://scrabble.brimveyn.dev/api/register", {
			method: 'POST', // Use POST if you're sending data in the body
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: email, username: username, password: password }),
		});
		if (!response.ok)
			throw new Error("Fatal error");
		return [true, ""];
	} catch (e) {
		return [false, (e as Error).message];
	}
}

export default function Register() {
	const [credentials, setCrendentials] = useState<Credentials>(defaultCredentials);
	const [error, setError] = useState<string>("");
	const { t } = useTranslation("register");
	const { setRefresh } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
	}, [credentials])

	useEffect(() => {
		console.log(error);
	}, [error]);


	const handleRegister = async () => {
		const { email, username, password, passwordConfirmation } = credentials;

		if (email.length == 0 || username.length == 0 || password.length == 0 || passwordConfirmation.length == 0)
			return setError(t("errorMissingField"));

		const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
		if (!emailRegex.test(email))
			return setError(t("errorEmail"));

		const usernameRegex = /^[-_a-zAZ0-9]{6,16}$/;
		if (!usernameRegex.test(username))
			return setError(t("errorUsername"));

		if (password !== passwordConfirmation)
			return setError(t("errorPasswordMissmatch"));

		// Check password strength
		const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
		if (!passwordRegex.test(password))
			return setError(t("errorPasswordPolicy"));

		let [ok, error] = await checkUsernameAndEmail(username, email);
		if (!ok)
			return setError(t(error));

		[ok, error] = await registerClient(email, username, password);
		if (!ok)
			return setError(error);

		navigate("/");
		setRefresh(true);
		console.info("Registration successful", { email, username });
		// Proceed with registration logic

	};

	const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => { setCrendentials((prev) => ({...prev, email: e.target.value})); }
	const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => { setCrendentials((prev) => ({...prev, username: e.target.value})); }
	const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => { setCrendentials((prev) => ({...prev, password: e.target.value})); }
	const handlePasswordConfirmationChange = (e: ChangeEvent<HTMLInputElement>) => { setCrendentials((prev) => ({...prev, passwordConfirmation: e.target.value})); }

	return (
		<div className="registerPage">
			<Navbar/>
			<div className="formOuterContainer">
				<Form style={"glass"}>
					<FormField 
						text={t("emailAddress")}
						onChangeCallback={handleEmailChange}
					/>
					<FormField 
						text={t("username")}
						inputPlaceHolder={t("usernamePlaceholder")}
						onChangeCallback={handleUsernameChange}
					/>
					<FormField 
						text={t("password")}
						inputType="password" 
						onChangeCallback={handlePasswordChange}
					/>
					<FormField 
						text={t("passwordConfirm")}
						inputType="password" 
						onChangeCallback={handlePasswordConfirmationChange}
					/>
					<FormError text={error} />
					<FormButton 
						text={t("sign-up")}
						style={"glass"}
						callback={handleRegister}
					/>
				</Form>
			</div>
		</div>
	);
}
