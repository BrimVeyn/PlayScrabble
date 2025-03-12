import { useState } from "react";
import "./login.css"
import { useNavigate } from "react-router";
import Navbar from "../navbar/Navbar";
import GoogleLogin from "./components/GoogleLogin";
import { useTranslation } from "react-i18next";

type Credentials = {
	emailOrUsername: string,
	password: string,
}

export default function Login() {
	const [credentials, setCrendentials] = useState<Credentials | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { t } = useTranslation("login");
	const navigate = useNavigate();

	const handleLogin = async () => {
		if (!credentials || credentials.emailOrUsername.length === 0 || credentials.password.length === 0) return;
		console.log("You:", credentials);
		const payload = {
			username: credentials?.emailOrUsername,
			password: credentials?.password,
		};
		try  {
			const response = await fetch("https://scrabble.brimveyn.dev/api/login", {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				setError(await response.json());
				throw new Error("Login error !");
			} else {
				navigate("/");
			}
		} catch (error) {
			console.error('Login error:', error);
		} 
	};

	return (
		<>
		<Navbar/>
		<div className="loginPageContainer">
		<div className="loginContainer">
			<p className="loginText"> {t("usernameInputText")} </p>
			<input 
				className="loginInput"
				onChange={(e) => {
					setCrendentials((prev) => {
						if (!prev) return ({emailOrUsername: e.target.value, password: ""});
						return ({...prev, emailOrUsername: e.target.value});
					})
				}}
				type="email" 
				placeholder={t("usernameInputPlaceholder")}
			/>
			<p className="loginText"> {t("passwordInputText")} </p>
			<input 
				onChange={(e) => {
					setCrendentials((prev) => {
						if (!prev) return ({emailOrUsername: "", password: e.target.value});
						return ({...prev, password: e.target.value});
					})
				}}
				className="loginInput"
				placeholder={t("passwordInputPlaceholder")}
				type="password"
			/>
			<div className="loginFooter">
			<button 
				className="l-button loginButton"
				onClick={handleLogin}
			>
				{t("login")}
			</button>
			<button
				className="l-button registerButton"
				onClick={() => navigate("/register")}
			>
				{t("register")}
			</button>
			<GoogleLogin/>
			{ error &&
				<p>{error}</p>
			}
			</div>
		</div>
		</div>
		</>
	);
}
