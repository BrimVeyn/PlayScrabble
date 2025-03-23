import { PiArrowBendRightUpFill } from "react-icons/pi";
import { useGrid } from "./GridContext";
import { emptyGrid, GridLayers, PlayerInfo } from "./GridContext.types";

interface returnLettersProps {
	setPlayers: React.Dispatch<React.SetStateAction<Map<number, PlayerInfo>>>;
	gridLayers: GridLayers,
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>;
}

export function returnLetters ({setPlayers, gridLayers, setGridLayers}: returnLettersProps) {

	const acc = gridLayers.pendingGrid.reduce<string[]>((acc, row) =>  {
		row.map(col => {
			if (col.value !== '.') acc.push(col.joker ? "?" : col.value);
		})
		return acc;
	}, []);
	setPlayers((prev) => {
		let next = new Map(prev);
		const newRack = next.get(0)!.rack.split("").map((letter) => {
			if (letter === "." && acc.length > 0)
				return acc.shift()
			return letter
		}).join("");
		next.set(0, {...next.get(0)!, rack: newRack});
		return next;
	});
	setGridLayers((prev) => ({...prev, pendingGrid: emptyGrid}));
}

export default function LetterReturnButton() {
	const {setPlayers, gridLayers, setGridLayers } = useGrid();
	return (
		<div className="resetButton glass">
			<button onClick={() => returnLetters({setPlayers, gridLayers, setGridLayers})}>
				<PiArrowBendRightUpFill/>
			</button>
		</div>
	);
}
