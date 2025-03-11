import { useState } from "react";
import "./login.css"
import { useNavigate } from "react-router";
import Navbar from "../navbar/Navbar";
import { FcGoogle } from "react-icons/fc";

type Credentials = {
	emailOrUsername: string,
	password: string,
}

export default function Login() {
	const [credentials, setCrendentials] = useState<Credentials | null>(null);
	const [error, setError] = useState<string | null>(null);
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
			<p className="loginText"> Username / Email </p>
			<input 
				className="loginInput"
				onChange={(e) => {
					setCrendentials((prev) => {
						if (!prev) return ({emailOrUsername: e.target.value, password: ""});
						return ({...prev, emailOrUsername: e.target.value});
					})
				}}
				type="email" 
				placeholder="name@mail.com"
			/>
			<p className="loginText"> Password </p>
			<input 
				onChange={(e) => {
					setCrendentials((prev) => {
						if (!prev) return ({emailOrUsername: "", password: e.target.value});
						return ({...prev, password: e.target.value});
					})
				}}
				className="loginInput"
				placeholder="password"
				type="password"
			/>
			<div className="loginFooter">
			<button 
				className="l-button loginButton"
				onClick={handleLogin}
			>
				Login
			</button>
			<button
				className="l-button registerButton"
				onClick={() => navigate("/register")}
			>
				Register
			</button>
			<button
				className="l-button googleButton"
				onClick={() => navigate("/register")}
			>
				<FcGoogle/>
				<span> Sign in with Google </span>
			</button>
			{ error &&
				<p>{error}</p>
			}
			</div>
		</div>
		</div>
		</>
	);
}
