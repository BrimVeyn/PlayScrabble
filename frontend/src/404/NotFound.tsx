import Navbar from "../navbar/Navbar";
import { useTranslation } from "react-i18next"

import "../solo/solver/styles/Grid.css"
import "./styles/NotFound.css"

function Text({index, letter}: any) {
	const {t} = useTranslation("letterScore");
	return (
		<div className="s-grid-cell">
			<p className="s-grid-tile full" key={index}> {letter} </p>
			<p className="score"> 
				{t("letterScore").split(",")[letter.charCodeAt(0) - 65]} 
			</p>
		</div>
	)
}

export default function NotFound() {
	return (
		<div className="notFoundPage">
		<Navbar/>
		<div className="notFoundContainer">
			<div className="notFoundRow">
			{
				"404".split("").map((letter, index) => (
					<Text
						key={index}
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
						key={index}
						letter={letter}
						index={index}
					/>				
				))
			}
			</div>
		</div>
		</div>
	)
}
