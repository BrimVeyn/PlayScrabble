import { useState } from 'react'
import Grid from "./solver/Grid.tsx"
import SolverButton from './solver/SolverButton.tsx';
import Rack from "./solver/Rack.tsx";

import "./App.css"

const emptyGrid: Array<string> = [
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...........A...",
	"...........K...",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
];

function App() {
	const [grid, setGrid] = useState<Array<string> | null>(emptyGrid);
	const [rack, setRack] = useState<string | null>(null);

	return (
		<>
			<div className="contextContainer">
				<Grid
					grid={grid}
					setGrid={setGrid}
				/>
				<Rack
					rack={rack}
					setRack={setRack}
				/>
			</div>
			<SolverButton
				grid={grid}
			/>
		</>
	)
}

export default App

