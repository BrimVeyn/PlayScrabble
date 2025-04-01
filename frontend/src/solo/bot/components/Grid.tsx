import { useEffect } from 'react'
import { useGrid } from './GridContext'
import { useTranslation } from 'react-i18next';
import { letterScores, Tile, Direction } from './GridContext.types';

import "../styles/Grid.css"
import JokerModal from './JokerModal.tsx';
import GridDraggable from '../../../lib/GridDraggable.tsx';
import { updatePlayers, updateTile } from './GridContextUtils.tsx';

//NOTE: modifier Values: 
// 0 None
// 1 Double Word
// 2 Triple Word
// 3 Double Letter
// 4 Triple letter

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
	const { gridLayers, cursor, jokerModal, setGameInfo, setGridLayers, setCursor, handleKeyDown } = useGrid();
	const { t } = useTranslation("solver");

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		}
	}, [handleKeyDown]);

	const handleLeftClick = (row: number, col: number) => {
		setCursor((prev) => {
			if (prev && prev.cell[0] == row && prev.cell[1] == col) {
				if (prev.clickedTime == 2) 
					return null;
				return { 
					cell: [row, col], 
					direction: (prev.direction === Direction.RIGHT ? Direction.DOWN : Direction.RIGHT), 
					clickedTime: prev.clickedTime + 1
				};
			}
			return { cell: [row, col], direction: prev?.direction || Direction.RIGHT, clickedTime: 1};
		});
	};

	const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
		e.preventDefault();
		const retrieve = gridLayers.pendingGrid[row][col].joker ? "?" : gridLayers.pendingGrid[row][col].value;
		updatePlayers(setGameInfo, ".", retrieve);
		updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, ".", false);
	}

	//TODO: Update dynamically from dict selection
	const letterScore = letterScores.get("FR")!.split(",");

	return (
		<div className="s-grid">
			{jokerModal && <JokerModal/>}
			{gridLayers.grid.map((item, row) => (
				<div className="s-grid-row" key={`row-${row}`}>
					{item.map((tile, col) => {
						const isSelected:boolean = (cursor && cursor.cell[0] == row && cursor.cell[1] == col) ? true : false;;
						const fClass:string = (tile.value !== '.') ? "full" : "empty";

						const gLetter:Tile = gridLayers.ghostGrid[row][col];
						const gClass:string = (gLetter.value !== '.' && tile.value === '.') ? "ghost" : "";

						const pLetter:Tile = gridLayers.pendingGrid[row][col];
						const pClass:string = (pLetter.value !== '.' && tile.value === '.') ? "pending" : "";
						const isDraggable: boolean = (pLetter.value !== '.');

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
							isDraggable ? (
								<GridDraggable 
									key={key} 
									row={row} 
									col={col} 
									char={pLetter.value}
									parentSelector={'.s-grid'}
									id={`grid-drag-${row}-${col}`}
								>
								<div 
									className="s-grid-cell" 
									onClick={() => { 
										if (!hasScore) handleLeftClick(row, col)
									}}
									onContextMenu={(e) => handleRightClick(e, row, col)}
								> 
									<span 
										className={`s-grid-tile ${fClass} ${gClass} ${pClass}`}
										data-score={ (isJoker && "0" ) ||
											(hasScore && 
												letterScore[tile.value.charCodeAt(0) - 65] ||
												letterScore[gLetter.value.charCodeAt(0) - 65] || 
												letterScore[pLetter.value.charCodeAt(0) - 65])}
									>
										{(tile.value == '.') ? (gLetter.value == '.') ? (pLetter.value == '.') ? '' : pLetter.value : gLetter.value : tile.value} 
									</span>
									<span className={`s-grid-tile-modifier ${modClass}`} data-modifier-text={modText}/>
									{ isSelected && <span className={`selected`} data-direction={cursor?.direction === Direction.RIGHT ? "right" : "down"}/> }
								</div>
								</GridDraggable>
							) : (
								<div 
									className="s-grid-cell" 
									key={key}
									onClick={() => handleLeftClick(row, col)}
								> 
									<span 
										className={`s-grid-tile ${fClass} ${gClass} ${pClass}`}
										data-score={ (isJoker && "0" ) ||
											(hasScore && 
												letterScore[tile.value.charCodeAt(0) - 65] ||
												letterScore[gLetter.value.charCodeAt(0) - 65] || 
												letterScore[pLetter.value.charCodeAt(0) - 65])}
									>
										{(tile.value == '.') ? (gLetter.value == '.') ? (pLetter.value == '.') ? '' : pLetter.value : gLetter.value : tile.value} 
									</span>
									<span className={`s-grid-tile-modifier ${modClass}`} data-modifier-text={modText}/>
									{ isSelected && <span className={`selected`} data-direction={cursor?.direction === Direction.RIGHT ? "right" : "down"}/> }
								</div>
							)
						)
					})}
				</div>
			))}
		</div>
	)
}


export default Grid;
