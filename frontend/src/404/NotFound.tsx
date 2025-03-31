import Navbar from "../navbar/Navbar";
import { letterScores } from "../solo/bot/components/GridContext.types";

import "../solo/solver/styles/Grid.css"
import "./styles/NotFound.css"

function Text({index, letter}: any) {
	//TODO: Update dynamically from dict selection
	const letterScore = letterScores.get("FR")!.split(",");

	return (
		<div className="s-grid-cell">
			<p className="s-grid-tile full" key={index}> {letter} </p>
			<p className="score"> 
				{letterScore[letter.charCodeAt(0) - 65]} 
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
