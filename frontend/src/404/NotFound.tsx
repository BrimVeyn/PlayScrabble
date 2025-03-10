import "../solver/styles/Grid.css"
import "./styles/NotFound.css"
import { useTranslation } from "react-i18next"

function Text({index, letter}: any) {
	const {t} = useTranslation("letterScore");
	return (
		<div key={index * letter.charCodeAt(0)} className="s-grid-cell">
			<p className="s-grid-tile full s-grid-row" key={index}> {letter} </p>
			<p className="score"> 
				{t("letterScore").split(",")[letter.charCodeAt(0) - 65]} 
			</p>
		</div>
	)
}

export default function NotFound() {
	return (
		<div className="notFoundContainer">
			<div className="notFoundRow">
			{
				"404".split("").map((letter, index) => (
					<Text
						letter={letter}
						index={index}
					/>				
				))
			}
			</div>
			<div className="notFoundRow">
			{
				"NOT FOUND".split("").map((letter, index) => (
					<Text
						letter={letter}
						index={index}
					/>				
				))
			}
			</div>
		</div>
	)
}
