import "../styles/JokerModal.css"
import { useGrid } from "./GridContext";
import { updateCursorClick, updatePlayers, updateTile } from "./GridContextUtils";
import { Direction, emptyGrid } from "./GridContext.types";

const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export default function JokerModal() {
	const {gridLayers, cursor, setPlayers, setCursor, setGridLayers, setJokerModal } =  useGrid();

	const handleClick = (letter: string) => {
		setJokerModal(false);
		
		const [row, col] = cursor!.cell;
		const pendingEmpty = (gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (gridLayers.grid[row][col].value === ".");
		setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));

		if (!pendingEmpty) {
			const retreive = gridLayers.pendingGrid[row][col].joker ? "?" : gridLayers.pendingGrid[row][col].value;
			updatePlayers(setPlayers, "?", retreive);
			updateTile(gridLayers.pendingGrid, cursor!.cell, setGridLayers, letter, true);
			updateCursorClick(gridLayers, setCursor, (cursor!.direction === "right") ? Direction.RIGHT : Direction.DOWN);
		} else if (gridEmpty) {
			updateTile(gridLayers.pendingGrid, cursor!.cell, setGridLayers, letter, true);
			updatePlayers(setPlayers, "?", ".");
			updateCursorClick(gridLayers, setCursor, cursor!.direction === "right" ? Direction.RIGHT : Direction.DOWN);
		}
	}

	return (
		<div className="jokerModal">
			<div className="jokerModalInner glass">
			{letters.split("").map((letter) => (
				<button key={`joker-${letter}`} onClick={() => handleClick(letter)} className="jokerModalButton">{letter}</button>
			))}
			</div>
		</div>
	)
}
