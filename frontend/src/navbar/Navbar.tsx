import { useTranslation } from "react-i18next";
import { NavigateFunction, useNavigate } from "react-router";
import { SiApplearcade } from "react-icons/si";
import { useAuth } from "../auth/AuthContext";

import "./Navbar.css"
import { useEffect } from "react";


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

		navigate(location);
		setRefresh(true);
		window.location.reload();
	}

	return (
		<button className="navbarButton" onClick={logout} >
			{t(text)}
		</button>
	)
}


function Navbar() {
	const navigate = useNavigate();
	const { logged, userInfo } = useAuth();

	return (
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
					<NavButton text="Profile" location={`/profile/${userInfo!.username}`} navigate={navigate}/>
					<LogoutButton text="logout" location="/" navigate={navigate}/>
					</>
				) : (
					<>
					<NavButton text="login" location="/login" navigate={navigate}/>
					</>
				)}
			</div>
		</div>
	);

}

export default Navbar;
