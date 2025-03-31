import { useGrid } from "./GridContext";
import "../styles/Rack.css"
import "../styles/Grid.css"
import { useRef } from "react";
import { letterScores } from "../../bot/components/GridContext.types";

export default function Rack () {
	const {rack, cursor, setCursor, handleKeyDown, handleKeyDownMobile } = useGrid();
	const isMobile = window.matchMedia("(max-width: 768px)").matches;
	const inputRef = useRef<HTMLInputElement | null>(null);

	const handleClickMobile = () => {
		if (!isMobile) return;
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}

	//TODO: Update dynamically from dict selection
	const letterScore = letterScores.get("FR")!.split(",");

	return (
		<div 
			className="rackContainer"
			onClick={handleClickMobile}
		>
		{ isMobile && 
			<>
			<div className="inputContainer">
				<input 
					ref={inputRef}
					className="mobileInpute" 
					type="password"
					onChange={(e) => {
						handleKeyDownMobile(e.currentTarget.value);
						e.currentTarget.value = ""
					}}
					onKeyDown={(e) => {
						if (e.code == "Space" || e.key == "Backspace") handleKeyDown(e)
					}}
				/> 
			</div>
			</>
		}
		{rack.split('').map((letter, idx) => {
			const fClass:string = (letter == '.') ? "empty" : "full";
			const hasScore: boolean = (letter !== '.');
			const isSelected = (cursor && cursor.ctx === "rack" && cursor.cell[1] == idx);

			return (
				<div 
					className="s-grid-cell" 
					key={idx}
					onClick={() => {
						setCursor({ctx: "rack", cell: [0, idx], direction: "right"});
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
