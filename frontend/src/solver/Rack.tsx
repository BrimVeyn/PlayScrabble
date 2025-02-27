import { useEffect } from "react";
import { useGrid } from "./GridContext";
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
		<>
			<div className="rackContainer">
				{rack.split('').map((letter, idx) => {
					const fClass:string = (letter == '.') ? "empty" : "full";
					const isSelected = (cursor && cursor.ctx === "rack" && cursor.cell[1] == idx);

					return (
						<div className="s-grid-cell" key={idx}
							onClick={() => {
								setCursor({ctx: "rack", cell: [0, idx]});
								setDirection("right");
							}}
						> 
							<p key={idx} className={`s-grid-tile ${fClass}`}> 
								{letter}
							</p>
							{ isSelected && <p className="selected"></p> }
						</div>
					)
				})}
			</div>
		</>
	);
}
