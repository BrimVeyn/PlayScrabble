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
					<MenuItem id="landing1" text={t("solo")} redir={"/solo"}/>
					<MenuItem id="landing2" text={t("multi")} redir={"/multiplayer"}/>
					<MenuItem id="landing3" text={t("training")} redir={"/train"}/>
				</Menu>
			</div>
		</div>
	);
}
