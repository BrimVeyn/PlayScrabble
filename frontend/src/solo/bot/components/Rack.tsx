import { useGrid } from "./GridContext";
import "../styles/Rack.css"
import "../styles/Grid.css"
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { updateCursorClick, updatePlayersIdx, updateTile } from "./GridContextUtils";
import { Direction } from "./GridContext.types";

export default function Rack () {
	const {players, gameInfo, cursor, gridLayers, setGridLayers, setPlayers, setCursor, setJokerModal} = useGrid();
	const {t} = useTranslation("letterScore");
	const [myTurn, setMyTurn] = useState<boolean>(false);

	useEffect(() => {
		if (gameInfo.playing === 0) {
			setMyTurn(true);
		} else {
			setMyTurn(false);
		}
	}, [gameInfo])

	const handleClick = (letter: string, index: number) => {
		if (letter === ".") return;
		if (letter === "?") {
			setJokerModal((prev) => !prev);
			return ;
		}
		const [row, col] = cursor!.cell;
		const pendingEmpty = (gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (gridLayers.grid[row][col].value === ".");

		if (!pendingEmpty) {
			const retreive = gridLayers.pendingGrid[row][col].joker ? "?" : gridLayers.pendingGrid[row][col].value;
			updatePlayersIdx(setPlayers, index, retreive);
			updateTile(gridLayers.pendingGrid, cursor!.cell, setGridLayers, letter, false);
			updateCursorClick(gridLayers, setCursor, (cursor!.direction === "right") ? Direction.RIGHT : Direction.DOWN);
		} else if (gridEmpty) {
			updateTile(gridLayers.pendingGrid, cursor!.cell, setGridLayers, letter, false);
			updatePlayersIdx(setPlayers, index, ".");
			updateCursorClick(gridLayers, setCursor, cursor!.direction === "right" ? Direction.RIGHT : Direction.DOWN);
		}
	}

	return (
		<div className={`rackContainer ${myTurn ? "rackOutline" : ""}`} >
		{players.get(0)!.rack.split('').map((letter, idx) => {
			const fClass:string = (letter == '.') ? "empty" : "full";
			const hasScore: boolean = (letter !== '.');
			const isSelected = (cursor && cursor.ctx === "rack" && cursor.cell[1] == idx);

			return (
				<div 
					className="s-grid-cell" 
					key={idx}
					onClick={() => {handleClick(letter, idx);}}> 
					<p className={`s-grid-tile ${fClass}`}> {letter} </p>
					{ isSelected && <p className="selected"></p> }
					{ hasScore && 
						<p className="score">
							{t("letterScore").split(",")[letter.charCodeAt(0) - 65]}
						</p>
					}
				</div>
			)
		})}
		</div>
	);
}
