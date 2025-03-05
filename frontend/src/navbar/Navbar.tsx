import { useTranslation } from "react-i18next";
import { useState } from "react";
import "./Navbar.css"

//function loginButton () {
//	const [loginShown, setLoginShown] = useState<boolean>(false);
//
//	useEffect(() => {
//		if (!loginShown) return;
//	}, [loginShown]);
//
//
//	const showLoginModal = () => {
//		setLoginShown((prev: boolean) => !prev);
//	}
//
//	return (
//		<button onClick={() => showLoginModal()} className="loginButton">Se connecter</button>
//	)
//}


const languages: { [id: string] : string; } = {
	fr: "🇫🇷",
	en: "🇬🇧",
};

function Navbar() {
	const { t, i18n } = useTranslation("navbar");
	const [isOpen, setIsOpen] = useState<boolean>(false);
	
	const langKeys = Object.keys(languages);

	return (
		<>
		<div className="navbarContainer">
			<div className="logo">
				<h1>Logo</h1>
			</div>
			<div className="links">
				<p>{t("home")}</p>
				<p>{t("leaderboard")}</p>
				<p>{t("login")}</p>
				<button
					className="flag"
					onClick={() => setIsOpen((prev) => !prev)}
				>{t("flagEmoji", {ns: "misc"})}</button>
			</div>
		</div>
		{ isOpen && (
			<div className="langDropContainer">
				<div className="langDropItems">
				{ langKeys.map((lang: string) => (
					<p 
						key={lang}
						onClick={() => i18n.changeLanguage(lang)}
					> 
						{lang.toUpperCase()} - {languages[lang]}
					</p>
				))}
				</div>
			</div>
		)}
		</>
	);

}

export default Navbar;
