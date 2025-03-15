import { useTranslation } from "react-i18next";

import Navbar from "../navbar/Navbar";
import { MenuItem, Menu } from "../lib/Menu";

import "./Solo.css"

export default function Solo() {
	const {t} = useTranslation("landing");

	return (
		<div className="soloPage">
		<Navbar/>
		<div className="soloPageContainer">
			<Menu>
				<MenuItem text={t("gridSolver")} redir={"/solo/solver"}/>
				<MenuItem text={t("computer1v1")} redir={"/solo/bot"}/>
			</Menu>
		</div>
		</div>
	);
}
