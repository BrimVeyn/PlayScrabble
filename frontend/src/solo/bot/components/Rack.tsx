import { useGrid } from "./GridContext";
import "../styles/Grid.css"
import "../styles/Rack.css"
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { updateCursorClick, updatePlayersIdx, updateTile } from "./GridContextUtils";
import { Direction, emptyGrid } from "./GridContext.types";
import RackDraggable from "../../../lib/RackDraggable";

export default function Rack () {
	const {players, gameInfo, cursor, gridLayers, setGridLayers, setPlayers, setCursor, setJokerModal} = useGrid();
	const {t} = useTranslation("letterScore");
	const [myTurn, setMyTurn] = useState<boolean>(false);

	useEffect(() => {
		setMyTurn(gameInfo.playing === 0);
	}, [gameInfo])

	const handleClick = (letter: string, index: number) => {
		if (!cursor || letter === ".")
			return;
		if (letter === "?")
			return setJokerModal((prev) => !prev);

		const [row, col] = cursor!.cell;
		const pendingEmpty = (gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (gridLayers.grid[row][col].value === ".");
		setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));

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
			const fClass: string = (letter == '.') ? "empty" : "full";
			const hasScore: boolean = (letter !== '.');
			const greyTile: string = (myTurn) ? "" : "greyTile";
			return (
				hasScore ? (
					<RackDraggable key={idx} idx={idx} char={letter}>
					<div className="s-grid-cell" onClick={() => {handleClick(letter, idx);}} >
						<p className={`${greyTile} s-grid-tile ${fClass}`}>{letter}</p>
						{ hasScore && 
							<p className="score">{t("letterScore").split(",")[letter.charCodeAt(0) - 65]}</p>
						}
					</div>
					</RackDraggable>
				) : (
					<div key={idx} className="s-grid-cell undragable"/>
				)
			)
		})}
		</div>
	);
}
