import "../solver/styles/Grid.css"
import "./styles/NotFound.css"
import { letterScore } from "../solver/GridContext"

function Text({index, letter}) {
	return (
		<div className="s-grid-cell">
			<p className="s-grid-tile full s-grid-row" key={index}> {letter} </p>
			<p className="score"> 
				{letterScore[letter.charCodeAt(0) - 65]} 
			</p>
		</div>
	)
}

export default function NotFound() {
	return (
		<div className="notFoundContainer">
			<div className="s-grid-row">
			{
				"404".split("").map((letter, index) => (
					<Text
						letter={letter}
						index={index}
					/>				
				))
			}
			</div>
			<div className="s-grid-row">
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
