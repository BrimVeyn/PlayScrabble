import { useEffect, useRef } from 'react'
import { useGrid } from './GridContext'
import { useTranslation } from 'react-i18next';

import "../styles/Grid.css"

//NOTE: modifier Values: 
// 0 None
// 1 Double Word
// 2 Tripple Word
// 3 Double Letter
// 4 Tripple letter

const gridModifiers: Array<Array<number>> = [
    [2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2],
    [0, 1, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 3, 0, 3, 0, 0, 0, 1, 0, 0],
    [3, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 3],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
    [0, 0, 3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3, 0, 0],
    [2, 0, 0, 3, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 2],
    [0, 0, 3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3, 0, 0],
    [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [3, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 3],
    [0, 0, 1, 0, 0, 0, 3, 0, 3, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 1, 0],
    [2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2]
]


function Grid() {
	const {gridLayers, cursor, setCursor, handleKeyDown, handleKeyDownMobile} = useGrid();
	const {t} = useTranslation(["solver", "letterScore"]);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const isMobile = window.matchMedia("(max-width: 768px)").matches;

	useEffect(() => {
		if (isMobile) return ;
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleKeyDown]);

	const updateCursor = (row: number, col: number) => {
		setCursor((prev) => {
			if (prev && prev.ctx === "grid" && prev.cell[0] == row && prev.cell[1] == col) {
				return { ...prev, cell: [row, col], direction: (prev.direction === "right" ? "down" : "right")};
			}
			return { ctx: "grid", cell: [row, col], direction: "right"};
		});
	};

	const handleClickMobile = () => {
		if (!isMobile) return;
		if (inputRef.current) {
			inputRef.current.focus();
		}
	}

	const letterScores = t("letterScore", {ns: "letterScore"}).split(",");

	return (
		<div 
			onClick={handleClickMobile} 
			className="s-grid"
		>
			{isMobile && 
				<div className="inputContainer">
					<input 
						ref={inputRef}
						className="mobileInput" 
						type="text"
						onChange={(e) => {
							handleKeyDownMobile(e.currentTarget.value);
							e.currentTarget.value = ""
						}}
						onKeyDown={(e) => {
							if (e.key == "Backspace") handleKeyDown(e)
						}}
					/> 
				</div>
			}
			{gridLayers.grid.map((item, index) => (
				<div className="s-grid-row" key={index}>
					{item.split('').map((letter, letterIndex) => {
						const isSelected:boolean = (cursor && cursor.ctx == "grid" && (cursor.cell[0] == index && cursor.cell[1] == letterIndex)) ? true : false;;
						const fClass:string = (letter !== '.') ? "full" : "empty";

						const gLetter:string = gridLayers.ghostGrid[index][letterIndex];
						const gClass:string = (gLetter !== '.' && letter === '.') ? "ghost" : "";

						const pLetter:string = gridLayers.pendingGrid[index][letterIndex];
						const pClass:string = (pLetter !== '.' && letter === '.') ? "pending" : "";

						const hasScore:boolean = (letter !== '.' || gLetter !== '.' || pLetter !== '.');
						const [modClass, modText]: [string, string] = (() => {
							switch (gridModifiers[index][letterIndex]) {
								case 1: return ["dword", t("dword")];
								case 2: return ["tword", t("tword")];
								case 3: return ["dletter", t("dletter")];
								case 4: return ["tletter", t("tletter")];
								default: return ["", ""];
							}
						})();
						return (
							<div 
								className="s-grid-cell" 
								key={index + letterIndex}
								onClick={() => updateCursor(index, letterIndex)}
							> 
								<span 
									className={`s-grid-tile ${fClass} ${gClass} ${pClass}`}
									data-score={hasScore && letterScores[letter.charCodeAt(0) - 65]
										|| letterScores[gLetter.charCodeAt(0) - 65] || letterScores[pLetter.charCodeAt(0) - 65]}
								>
									{(letter == '.') ? (gLetter == '.') ? (pLetter == '.') ? '' : pLetter : gLetter : letter} 
								</span>
								<span 
									className={`s-grid-tile-modifier ${modClass}`}
									data-modifier-text={modText}
								/>
								{ isSelected && 
									<span 
										className={`selected`}
										data-direction={cursor?.direction}
									/>
								}
							</div>
						)
					})}
				</div>
			))}
		</div>
	)
}


export default Grid;
