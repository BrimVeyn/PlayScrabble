import { FaShuffle } from "react-icons/fa6";
import { useGrid } from "./GridContext"

import "../styles/ShuffleButton.css"
import "../styles/Grid.css"

export default function ShuffleButton() {
	const { setPlayers } = useGrid();

	const shuffleRack = () => {
		setPlayers((prev) => {
			const next = new Map(prev);
			const shuffled = prev.get(0)!.rack
				.split("")
				.map(value => ({value, key: Math.random() }))
				.sort((a, b) => a.key - b.key)
				.map(({value}) => value)
				.join("");

			next.set(0, {...next.get(0)!, rack: shuffled});
			return next;
		})
	}

	return (
		<div className="resetButton glass" id="rack-shuffle">
			<button 
				data-tooltip-id="eraser"
				onClick={shuffleRack}
			>
				<FaShuffle/>
			</button>
		</div>
	);
}
