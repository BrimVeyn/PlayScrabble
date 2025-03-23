import { Fragment, useEffect, useRef } from 'react'
import { useGrid } from './GridContext'
import { useTranslation } from 'react-i18next';
import { Tile } from './GridContext.types';

import "../styles/Grid.css"
import JokerToolTip from './JokerTooltip';

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
	const {gridLayers, cursor, jokerModal, setCursor, handleKeyDown, handleKeyDownMobile} = useGrid();
	const {t} = useTranslation(["solver", "letterScore"]);
	const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

	const updateCursor = (row: number, col: number) => {
		setCursor((prev) => {
			if (prev && prev.ctx === "grid" && prev.cell[0] == row && prev.cell[1] == col) {
				return { ...prev, cell: [row, col], direction: (prev.direction === "right" ? "down" : "right")};
			}
			return { ctx: "grid", cell: [row, col], direction: "right"};
		});
	};

	const letterScores = t("letterScore", {ns: "letterScore"}).split(",");

	return (
		<div className="s-grid">
			{gridLayers.grid.map((item, row) => (
				<div 
					className="s-grid-row"
					key={`row-${row}`}
					onClick={() => {
						inputRefs.current[row]?.focus();
						inputRefs.current[row]?.scrollIntoView({behavior: 'smooth', block: 'center'});
					}}
				>
					<input 
						ref={(el) => {inputRefs.current[row] = el}}
						className="botMobileInput" 
						type="text"
						onChange={(e) => {
							handleKeyDownMobile(e.currentTarget.value);
							e.currentTarget.value = ""
						}}
						onKeyDown={(e) => {
							console.log(e);
							if (["Space", "Backspace", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(e.key) ||
								["Space", "Backspace", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(e.code) 
							) {
								handleKeyDown(e);
							}
						}}
					/> 
					{item.map((tile, col) => {
						const isSelected:boolean = (cursor && cursor.ctx == "grid" && (cursor.cell[0] == row && cursor.cell[1] == col)) ? true : false;;
						const fClass:string = (tile.value !== '.') ? "full" : "empty";

						const gLetter:Tile = gridLayers.ghostGrid[row][col];
						const gClass:string = (gLetter.value !== '.' && tile.value === '.') ? "ghost" : "";

						const pLetter:Tile = gridLayers.pendingGrid[row][col];
						const pClass:string = (pLetter.value !== '.' && tile.value === '.') ? "pending" : "";

						const isJoker = (tile.joker || gLetter.joker || pLetter.joker);

						const hasScore:boolean = (tile.value !== '.' || gLetter.value !== '.' || pLetter.value !== '.');
						const [modClass, modText]: [string, string] = (() => {
							switch (gridModifiers[row][col]) {
								case 1: return ["dword", t("dword")];
								case 2: return ["tword", t("tword")];
								case 3: return ["dletter", t("dletter")];
								case 4: return ["tletter", t("tletter")];
								default: return ["", ""];
							}
						})();
						const key = `${row}-${col}-${tile.value}`;
						return (
							<Fragment key={key}>
							{ isSelected && jokerModal && <JokerToolTip key={`joker-${key}`}/>}
							<div 
								className="s-grid-cell" 
								key={key}
								onClick={() => updateCursor(row, col)}
							> 
								<span 
									className={`s-grid-tile ${fClass} ${gClass} ${pClass}`}
									data-score={ (isJoker && "0" ) ||
										(hasScore && letterScores[tile.value.charCodeAt(0) - 65]
										|| letterScores[gLetter.value.charCodeAt(0) - 65] || letterScores[pLetter.value.charCodeAt(0) - 65])}
								>
									{(tile.value == '.') ? (gLetter.value == '.') ? (pLetter.value == '.') ? '' : pLetter.value : gLetter.value : tile.value} 
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
							</Fragment>
						)
					})}
				</div>
			))}
		</div>
	)
}


export default Grid;
