import { ChangeEvent, useState } from "react";
import "./login.css"
import { useNavigate } from "react-router";
import Navbar from "../navbar/Navbar";
import GoogleLogin from "./components/GoogleLogin";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import {Form, FormField, FormError} from "../lib/Form";

type Credentials = {
	emailOrUsername: string,
	password: string,
}

export default function Login() {
	const [credentials, setCrendentials] = useState<Credentials | null>(null);
	const [error, setError] = useState<string>("");
	const { t } = useTranslation("login");
	const navigate = useNavigate();
	const { setRefresh } = useAuth();

	const handleLogin = async () => {
		if (!credentials || credentials.emailOrUsername.length === 0 || credentials.password.length === 0) 
			return setError(t("errorMissingField", {ns: "register"}));
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
				setError(t("invalidCredentials"));
				throw new Error("Login error !");
			} else {
				setRefresh(true);
				navigate("/");
			}
		} catch (error) {
			console.log('Login error:', error);
		} 
	};


	return (
		<div className="loginPage">
		<Navbar/>
			<div className="formOuterContainer">
			<Form style="glass">
				<FormField
					text={t("usernameInputText")}
					onChangeCallback={(e: ChangeEvent<HTMLInputElement>) => {
						setCrendentials((prev) => {
							if (!prev) return ({emailOrUsername: e.target.value, password: ""});
							return ({...prev, emailOrUsername: e.target.value});
						})
					}}
				/>
				<FormField
					inputType="password"
					text={t("passwordInputText")}
					onChangeCallback={(e: ChangeEvent<HTMLInputElement>) => {
						setCrendentials((prev) => {
							if (!prev) return ({emailOrUsername: "", password: e.target.value});
							return ({...prev, password: e.target.value});
						})
					}}
				/>
				<FormError text={error}/>
				<div className="formRow">
					<button className="formButton glass" onClick={handleLogin}>{t("login")}</button>
					<button className="formButton glass" onClick={() => navigate("/register")}>{t("register")}</button>
				</div>
				<div className="googleButtonContainer">
					<GoogleLogin/>
				</div>
			</Form>
			</div>
		</div>
	);
}
