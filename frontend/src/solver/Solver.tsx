import Grid from "./components/Grid.tsx"
import { GridProvider } from "./components/GridContext.tsx"
import Results from "./components/Results.tsx";
import Rack from "./components/Rack.tsx";
import ResetButton from "./components/ResetButton.tsx";

import "./Solver.css"
import Navbar from "../navbar/Navbar.tsx";

function Solver() {
	return (
		<>
		<Navbar/>
		<div className="solverContainer">
			<GridProvider>
				<div className="contextContainer">
					<Grid/>
					<div className="rackOuterContainer">
						<Rack/>
						<ResetButton/>
					</div>
				</div>
				<div className="resultContainer">
					<Results/>
				</div>
			</GridProvider>
		</div>
		</>
	)
}

export default Solver
