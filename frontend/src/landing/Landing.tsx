import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router";

import "./Landing.css"
import Navbar from "../navbar/Navbar";

export default function Landing() {
	const {t} = useTranslation("landing");
	const navigate = useNavigate();

	return (
		<>
		<Navbar/>
		<div className="landingContainer">
			<div className="soloContainer">
				<button className="navButton" onClick={() => navigate("/solo")}>
					{t("solo")}
				</button>
			</div>
			<div className="multiContainer">
				<button className="navButton" onClick={() => navigate("/multi")}>
					{t("multi")}
				</button>
			</div>
		</div>
		</>
	);
}
