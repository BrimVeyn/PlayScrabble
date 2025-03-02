import Grid from "./Grid.tsx"
import { GridProvider } from "./GridContext.tsx"
import Results from "./Results.tsx";
import Rack from "./Rack.tsx";
import Definitions from "./Definitions.tsx";
import ResetButton from "./ResetButton.tsx";

import "./Solver.css"
import Navbar from "../navbar/Navbar.tsx";

function Solver() {
	return (
		<div className="solverPage">
			<Navbar/>
			<div className="solverContainer">
				<GridProvider>
					<div className="contextContainer">
						<Grid/>
						<Rack/>
						<ResetButton/>
					</div>
					<div className="resultContainer">
						<Results/>
						<Definitions/>
					</div>
				</GridProvider>
			</div>
		</div>
	)
}

export default Solver
