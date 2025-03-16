import Grid from "./components/Grid.tsx"
import { GridProvider } from "./components/GridContext.tsx"
import Results from "./components/Results.tsx";
import Rack from "./components/Rack.tsx";
import ResetButton from "./components/ResetButton.tsx";
import { NewGameOptions } from "./Bot.tsx";
import { useEffect } from "react";

import "./Game.css"

interface GameProps {
	gameOptions: React.Dispatch<React.SetStateAction<NewGameOptions>>,
};

function Game({gameOptions}: GameProps) {
	useEffect(() => {
		console.debug("New game started with:", gameOptions);
	}, []);

	return (
		<div className="gamePage">
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
		</div>
	)
}

export default Game
