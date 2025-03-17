import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";

function PlaceButton() {
	const {t} = useTranslation("bot");
	const { playerInfo } = useGrid();

	const handlePlace = () => {
		console.log("Place pressed");
	}

	return (
		<button 
			className="glass actionButton"
			id ="placeButton"
			onClick={handlePlace}
		>
			{t("placeButtonText")}
		</button>
	);
}

export default PlaceButton;
