import Grid from "./solver/Grid.tsx"
import { GridProvider } from "./solver/GridContext.tsx"
import Results from "./solver/Results.tsx";
import Rack from "./solver/Rack.tsx";
import Definitions from "./solver/Definitions.tsx";
import ResetButton from "./solver/ResetButton.tsx";

import "./App.css"

function App() {
	return (
		<>
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
		</>
	)
}

export default App
