import Grid from "./solver/Grid.tsx"
import { GridProvider } from "./solver/GridContext.tsx"
import Results from "./solver/Results.tsx";
import Rack from "./solver/Rack.tsx";

import "./App.css"

function App() {
	return (
		<>
			<div className="solverContainer">
				<GridProvider>
					<div className="contextContainer">
						<Grid/>
						<Rack/>
					</div>
					<div className="resultContainer">
						<Results/>
					</div>
				</GridProvider>
			</div>
		</>
	)
}

export default App
