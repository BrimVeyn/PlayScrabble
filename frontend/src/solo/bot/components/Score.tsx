import { useGrid } from "./GridContext";
import "../styles/Score.css";
import { useTranslation } from "react-i18next";

function Score() {
	const { gameInfo } = useGrid();
	const { t }  = useTranslation("bot");
	const playerScore = gameInfo.players.get(0)!.score;
	const computerScore = gameInfo.players.get(1)!.score;

	return (
		<div className="scoreContainer glass">
			<span className="scoreText">🧑‍💼 {t("you")}: <b>{playerScore}</b></span>
			<span className="scoreDivider">|</span>
			<span className="scoreText">🤖 {t("computer")}: <b>{computerScore}</b></span>
		</div>
	);
}

export default Score;

