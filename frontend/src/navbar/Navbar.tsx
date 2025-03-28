import { useTranslation } from "react-i18next";
import { useState } from "react";
import { NavigateFunction, useNavigate } from "react-router";
import { SiApplearcade } from "react-icons/si";
import { useAuth } from "../auth/AuthContext";

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

interface NavButtonProps {
	text: string,
	location: string,
	navigate: NavigateFunction,
};

function NavButton({text, location, navigate}: NavButtonProps) {
	const { t } = useTranslation("navbar");
	return (
		<button onClick={() => navigate(location)} className="navbarButton" >
			{t(text)}
		</button>
	)
}

function LogoutButton({text, location, navigate}: NavButtonProps) {
	const { setRefresh } = useAuth();
	const { t } = useTranslation("navbar");

	const logout = async () => {
		await fetch("https://scrabble.brimveyn.dev/api/logout", {
			method: 'DELETE',
			headers: {'Content-Type': 'application/json' },
		})
		.then((response) => {
			if (!response.ok) throw new Error("Logout failed");
		})
		.catch((e) => console.error(e));

		setRefresh(true);
		navigate(location);
	}

	return (
		<button className="navbarButton" onClick={logout} >
			{t(text)}
		</button>
	)
}


function Navbar() {
	const {t} = useTranslation("navbar");
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const navigate = useNavigate();
	const { logged } = useAuth();

	return (
		<>
		<div className="navbarContainer">
			<div className="logo">
				<button onClick={() => navigate("/")}>
				<SiApplearcade />
				</button>
			</div>
			<div className="links">
				{logged ? (
					<>
					<NavButton text="home" location="/" navigate={navigate}/>
					<NavButton text="leaderboard" location="/leaderboard" navigate={navigate}/>
					<LogoutButton text="logout" location="/" navigate={navigate}/>
					</>
				) : (
					<>
					<NavButton text="login" location="/login" navigate={navigate}/>
					</>
				)}
				{/*
				<button
					className="flag"
					onClick={() => setIsOpen((prev) => !prev)}
				>{t("flagEmoji", {ns: "misc"})}
				</button>
				*/}
			</div>
		</div>
			{/*{ isOpen && (<LanguageDropdown/>)*/}
		</>
	);

}

export default Navbar;
