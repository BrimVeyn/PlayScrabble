import { emptyGrid, useGrid } from "./GridContext"
import "../styles/ResetButton.css"
import "../styles/Grid.css"
import { BsEraserFill } from "react-icons/bs";
import { Tooltip } from "react-tooltip";
import { useTranslation } from "react-i18next";

export default function ResetButton() {
	const { setGrid } = useGrid();
	const {t} = useTranslation("solver");

	return (
		<div className="resetButton">
			<button 
				data-tooltip-id="eraser"
				onClick={() => setGrid(emptyGrid)}
			>
				<BsEraserFill/>
			</button>
			<Tooltip
				id="eraser"
				place="top"
				content={t("resetButtonTooltip")}
			/>
		</div>
	);
}
