import { useTranslation } from "react-i18next";
import { useState } from "react";
import "./Navbar.css"

const languages: { [id: string] : string; } = {
	fr: "🇫🇷",
	en: "🇬🇧",
};

function LanguageDropdown() {
	const langKeys = Object.keys(languages);
	const {i18n} = useTranslation();
	const [selected, setSelected] = useState<string | null>(i18n.language);

	const handleClick = (lang: string) => {
		if (selected !== lang) {
			i18n.changeLanguage(lang)
			setSelected(lang);
		}
	}

	return (
		<div className="langDropContainer">
			<div className="langDropItems">
				{ langKeys.map((lang: string) => (
					<div 
						className="langDropItem"
						key={lang}
						onClick={() => handleClick(lang)}
					>
						<input 
							type="radio" 
							id={lang}
							checked={lang === selected}
						/>
						<p> {lang.toUpperCase()} </p>
						<p> {languages[lang]} </p>
					</div>
				))}
			</div>
		</div>
	);
}


function Navbar() {
	const { t } = useTranslation("navbar");
	const [isOpen, setIsOpen] = useState<boolean>(false);
	

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
			<LanguageDropdown/>
		)}
		</>
	);

}

export default Navbar;
