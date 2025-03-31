import { PiArrowBendRightUpFill } from "react-icons/pi";
import { useGrid } from "./GridContext";
import { emptyGrid, GameInfo, GridLayers } from "./GridContext.types";

interface returnLettersProps {
	gameInfo: GameInfo
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>;
	gridLayers: GridLayers,
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>;
}

export function returnLetters ({gameInfo, setGameInfo, gridLayers, setGridLayers}: returnLettersProps): string {
	const acc = gridLayers.pendingGrid.reduce<string[]>((acc, row) =>  {
		row.map(col => {
			if (col.value !== '.') acc.push(col.joker ? "?" : col.value);
		})
		return acc;
	}, []);
	let next = new Map(gameInfo.players);
	const newRack = next.get(0)!.rack.split("").map((letter) => {
		if (letter === "." && acc.length > 0)
			return acc.shift()
		return letter
	}).join("");
	next.set(0, {...next.get(0)!, rack: newRack});
	setGameInfo(prev => ({...prev, players: next}));
	setGridLayers((prev) => ({...prev, pendingGrid: emptyGrid}));
	return newRack;
}

export default function LetterReturnButton() {
	const { gameInfo, setGameInfo, gridLayers, setGridLayers } = useGrid();
	return (
		<div className="resetButton glass" id="rack-return">
			<button onClick={() => returnLetters({gameInfo, setGameInfo, gridLayers, setGridLayers})}>
				<PiArrowBendRightUpFill/>
			</button>
		</div>
	);
}
