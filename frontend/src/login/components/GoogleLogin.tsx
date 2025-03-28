import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

import "../styles/GoogleLogin.css"
import { useAuth } from '../../auth/AuthContext';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

interface UsernamePromptProps {
	googleUser: any,
};

const googleLogin = async (credential: string) => {
	const payload = { token: credential, };
	try {
		const response = await fetch("https://scrabble.brimveyn.dev/api/loginGoogle", {
			method: 'POST',
			headers: {'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) throw new Error("Verification failed");
		console.log("Authentification successfull, token validated !");
		return true;
	} catch (e) {
		console.error(e);
		return false;
	}
}

function UsernamePrompt ({googleUser}: UsernamePromptProps) {
	const [username, setUsername] = useState<string>("");
	const [error, setError] = useState<string | null>(null);
	const { setRefresh } = useAuth();
	const navigate = useNavigate();
	const { t } = useTranslation("login");

	const checkUsernameTaken = async () => {
		const payload = {
			email: googleUser.user.email,
			username: username,
			password: "",
		};
		try {
			const response = await fetch(`https://scrabble.brimveyn.dev/api/register`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorData = await response.json();
				setError(errorData.err);
				throw new Error(errorData.err);
			}
			return true;
		} catch (e: any) {
			console.error(e);
			return false;
		}
	}

	const handleClose = async () => {
		if (username.length === 0) {
			setError(t("errorEmptyUsername")); return ;
		} else if (username.length > 16) {
			setError(t("usernameTooLong")); return ;
		}
		const success = await checkUsernameTaken();
		if (!success) {
			return ;
		}
		const isTokenValid = await googleLogin(googleUser.credential);
		if (!isTokenValid) {
			return ;
		} else {
			setRefresh(true);
			navigate("/");
			return;
		}
	}

	return createPortal(
		<div className="modalContainer">
			<div className="usernameModalContainer">
				<h1>{t("modalTitle")}</h1>
				<p> {t("modalPrompt")} </p>
				<input 
					type="text" 
					placeholder="username"
					onChange={(e) => setUsername(e.target.value)}
				/>
				<div className="usernameModalFooter">
				{ error && <p className="usernameModalError"> {error} </p> }
				<button onClick={handleClose} id="confirmButton">
					{t("modalConfirm")}
				</button>
				</div>
			</div>
		</div>, document.body
	);
}

const GoogleLogin = () => {
	const [usernamePrompt, setUsernamePrompt] = useState<boolean>(false);
	const [googleUser, setGoogleUser] = useState<any>(null);
	const navigate = useNavigate();
	const { setRefresh } = useAuth();

	useEffect(() => {
		if (window.google) {
			window.google.accounts.id.initialize({
				client_id: '999610837594-299h07p9o3f1du6d9ghnmo7elqt9hd7m.apps.googleusercontent.com',
				callback: handleCredentialResponse,
			});

			window.google.accounts.id.renderButton(
				document.getElementById('google-login-btn'),
				{ 
					theme: 'outline',
					size: 'large',
					text: "continue_with",
					shape: "square"
				}
			);
		}
	}, []);

	const checkMail = async (email: string) => {
		const payload = { email: email };
		try {
			const response = await fetch("https://scrabble.brimveyn.dev/api/checkEmail", {
				method: 'POST',
				headers: {'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.err);
			}
			console.log("Use doesn't exist, opening modal");
			return false;

		} catch (e) {
			console.log("User already exist, loggin in...");
			return true;
		}
	}

	const handleCredentialResponse = async (response: any) => {
		// Décoder le token JWT
		const user = JSON.parse(atob(response.credential.split('.')[1]));
		//console.log('User:', user);
		setGoogleUser({user: user, credential: response.credential});

		const alreadyExist = await checkMail(user.email);
		if (alreadyExist === true) {
			console.log("Account already exist ! Loggin in ...");
			const isTokenValid = await googleLogin(response.credential);
			if (!isTokenValid) {
				return ;
			} else {
				setRefresh(true);
				navigate("/");
				return;
			}
		}
		setUsernamePrompt(true);
	};


	return (
		<div>
		<div id="google-login-btn"></div>
		{ usernamePrompt && 
			<UsernamePrompt
				googleUser={googleUser}
			/>
		}
		</div>
	);
};

export default GoogleLogin;
