import "./ResetButton.css"
import { emptyGrid, useGrid } from "./GridContext"

export default function ResetButton() {
	const { setGrid } = useGrid();

	return (
		<div className="resetButton">
			<button onClick={() => setGrid(emptyGrid)}> Reset </button>
		</div>
	);
}
