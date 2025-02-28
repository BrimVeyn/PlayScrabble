import { useEffect } from "react";
import { useGrid, letterScore } from "./GridContext";
import "./Rack.css"
import "./Grid.css"

export default function Rack() {
	const {rack, cursor, setCursor, setDirection, handleKeyDown} = useGrid();

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleKeyDown]);

	return (
		<div className="rackContainer">
			{rack.split('').map((letter, idx) => {
				const fClass:string = (letter == '.') ? "empty" : "full";
				const hasScore: boolean = (letter !== '.');
				const isSelected = (cursor && cursor.ctx === "rack" && cursor.cell[1] == idx);

				return (
					<div className="s-grid-cell" key={idx}
						onClick={() => {
							setCursor({ctx: "rack", cell: [0, idx]});
							setDirection("right");
						}}
					> 
						<p className={`s-grid-tile ${fClass}`}> 
							{letter}
						</p>
						{ isSelected && <p className="selected"></p> }
						{ hasScore && 
							<p className="score">
								{letterScore[letter.charCodeAt(0) - 65]}
							</p>
						}
					</div>
				)
			})}
		</div>
	);
}
