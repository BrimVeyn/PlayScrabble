import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router";

import "./Landing.css"
import Navbar from "../navbar/Navbar";

export default function Landing() {
	const {t} = useTranslation("landing");
	const navigate = useNavigate();

	return (
		<div className="landingPage">
		<Navbar/>
		<div className="landingContainer">
			<button className="navButton" onClick={() => navigate("/solo")}>
				{t("solo")}
			</button>
			<button className="navButton" onClick={() => navigate("/multi")}>
				{t("multi")}
			</button>
		</div>
		</div>
	);
}
