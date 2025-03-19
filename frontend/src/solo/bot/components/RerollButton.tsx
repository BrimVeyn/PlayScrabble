import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";

function RerollButton() {
	const {t} = useTranslation("bot");
	const { players } = useGrid();

	const handleReroll = () => {
		console.log("Reroll pressed");
	}

	return (
		<button 
			className="glass actionButton"
			onClick={handleReroll}
		>
			{t("rerollButtonText")}
		</button>
	);
}

export default RerollButton;
