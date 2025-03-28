import { PiArrowBendRightUpFill } from "react-icons/pi";
import { useGrid } from "./GridContext";
import { emptyGrid, GridLayers, PlayerInfo } from "./GridContext.types";

interface returnLettersProps {
	players: Map<number, PlayerInfo>;
	setPlayers: React.Dispatch<React.SetStateAction<Map<number, PlayerInfo>>>;
	gridLayers: GridLayers,
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>;
}

export function returnLetters ({players, setPlayers, gridLayers, setGridLayers}: returnLettersProps): string {
	const acc = gridLayers.pendingGrid.reduce<string[]>((acc, row) =>  {
		row.map(col => {
			if (col.value !== '.') acc.push(col.joker ? "?" : col.value);
		})
		return acc;
	}, []);
	let next = new Map(players);
	const newRack = next.get(0)!.rack.split("").map((letter) => {
		if (letter === "." && acc.length > 0)
			return acc.shift()
		return letter
	}).join("");
	next.set(0, {...next.get(0)!, rack: newRack});
	setPlayers(next);
	setGridLayers((prev) => ({...prev, pendingGrid: emptyGrid}));
	return newRack;
}

export default function LetterReturnButton() {
	const { players, setPlayers, gridLayers, setGridLayers } = useGrid();
	return (
		<div className="resetButton glass" id="rack-return">
			<button onClick={() => returnLetters({players, setPlayers, gridLayers, setGridLayers})}>
				<PiArrowBendRightUpFill/>
			</button>
		</div>
	);
}
