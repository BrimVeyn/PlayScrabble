import { useEffect, useState } from "react";
import "./Navbar.css"
import { useTranslation } from "react-i18next";

function loginButton () {
	const [loginShown, setLoginShown] = useState<boolean>(false);

	useEffect(() => {
		if (!loginShown) return;
	}, [loginShown]);


	const showLoginModal = () => {
		setLoginShown((prev: boolean) => !prev);
	}

	return (
		<button onClick={() => showLoginModal()} className="loginButton">Se connecter</button>
	)
}

function Navbar() {
	const { t } = useTranslation("navbar");

	return (
		<div className="navbarContainer">
			<div className="logo">
				<h1>Logo</h1>
			</div>
			<div className="links">
				<p>{t("home")}</p>
				<p>{t("leaderboard")}</p>
				<p>{t("login")}</p>
			</div>
		</div>
	);
}

export default Navbar;
