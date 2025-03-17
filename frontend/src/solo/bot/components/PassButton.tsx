import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";

function PassButton() {
	const {t} = useTranslation("bot");
	const { playerInfo } = useGrid();

	const handlePass = () => {
		console.log("Pass pressed");
	}

	return (
		<button 
			className="glass actionButton"
			onClick={handlePass}
		>
			{t("passButtonText")}
		</button>
	);
}

export default PassButton;
