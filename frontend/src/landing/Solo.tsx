import { useNavigate } from "react-router";
import Navbar from "../navbar/Navbar";

import "./Solo.css"
import { useTranslation } from "react-i18next";

export default function Solo() {
	const navigate = useNavigate();
	const {t} = useTranslation("landing");

	return (
		<>
		<div className="soloPage">
		<Navbar/>
		<div className="soloPageContainer">
			<button className="navButton" onClick={() => navigate("/solo/solver")}>
				{t("gridSolver")}
			</button>
			<button className="navButton" onClick={() => navigate("/solo/bot")}>
				{t("computer1v1")}
			</button>
		</div>
		</div>
		</>
	);
}
