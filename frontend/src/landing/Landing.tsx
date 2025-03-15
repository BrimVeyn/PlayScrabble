import { useTranslation } from "react-i18next"
import { Menu, MenuItem } from "../lib/Menu";

import "./Landing.css"
import Navbar from "../navbar/Navbar";

export default function Landing() {
	const {t} = useTranslation("landing");
	return (
		<div className="landingPage">
			<Navbar/>
			<div className="landingContainer">
				<Menu>
					<MenuItem text={t("solo")} redir={"/solo"}/>
					<MenuItem text={t("multi")} redir={"/multiplayer"}/>
					<MenuItem text={t("training")} redir={"/train"}/>
				</Menu>
			</div>
		</div>
	);
}
