import Grid from "./solver/Grid.tsx"
import { GridProvider } from "./solver/GridContext.tsx"
import SolverButton from './solver/SolverButton.tsx';
import Rack from "./solver/Rack.tsx";

import "./App.css"


function App() {
	return (
		<>
			<GridProvider>
				<div className="contextContainer">
					<Grid/>
					<Rack/>
				</div>
				<SolverButton/>
			</GridProvider>
		</>
	)
}

export default App

