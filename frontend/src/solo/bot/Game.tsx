import { useEffect } from "react";

import { GridProvider } from "./components/GridContext.tsx"
import { NewGameOptions } from "./Bot.tsx";

import Grid from "./components/Grid.tsx"
import Results from "./components/Results.tsx";
import Rack from "./components/Rack.tsx";
import PlaceButton from "./components/PlaceButton.tsx";
import PassButton from "./components/PassButton.tsx";
import RerollButton from "./components/RerollButton.tsx";
import Purse from "./components/Purse.tsx";
import ShuffleButton from "./components/ShuffleButton";
import Score from "./components/Score.tsx";

import "./Game.css"

interface GameProps {
	gameOptions: NewGameOptions,
};

function Game({gameOptions}: GameProps) {
	useEffect(() => {
		console.debug("New game started with:", gameOptions);
	}, []);

	return (
		<div className="gamePage">
		<div className="solverContainer">
		<GridProvider
			gameOptions={gameOptions}
		>
			<div className="contextContainer">
				<div className="actionOuterContainer">
					<div className="scoreContainer">
						<Score/>
					</div>
					<RerollButton/>
					<PassButton/>
					<PlaceButton/>
					<Purse/>
				</div>
				<div className="rackOuterContainer">
					<Rack/>
					<ShuffleButton/>
				</div>
				<Grid/>
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
