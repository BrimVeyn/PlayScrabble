import { useGrid } from "./GridContext";
import { GameAction, GameState } from "./GridContext.types";
import { JSX } from "react";

import "../styles/GameLog.css"
import { useAuth } from "../../../auth/AuthContext";

function GameLogText({gameState}: {gameState: GameState}) {
	const { logged, userInfo } = useAuth();
	let message: JSX.Element | string = "";
	const playerName = (gameState.player_id === 0) ? (logged) ? userInfo!.username : "guest" : "bot";
	const wordPlaced = gameState.match?.word;
	const wordScore = gameState.match?.score;
	const playerElement: JSX.Element = (gameState.player_id === 0) ? 
		<span className="text-dark-green"> {playerName} </span> :
		<span className="text-deny"> {playerName} </span>

	switch (gameState.action) {
		case GameAction.GameStart: {
			message = 
			<> 
				Game started 
				[ <span className="text-dark-green"> {logged ? userInfo!.username : "guest"} </span> 
				vs <span className="text-deny"> bot </span> ]
			</>
			break;
		}
		case GameAction.Rerolled: {
			message = <> {playerElement} rerolled. </>
			break;
		}
		case GameAction.Passed: {
			message = <> {playerElement} passed. </>
			break;
		}
		case GameAction.Abandonned: {
			message = <> {playerElement} abandonned. </>
			break;
		}
		case GameAction.PlayedWord: {
			message = <>
				{gameState.player_id === 0 ?
					<span className="text-dark-green"> {playerName} </span>
				:
					<span className="text-deny"> {playerName} </span>
				}
				played
				<span className="bold"> {wordPlaced} </span> and gained 
				<span className="bold"> {wordScore} </span> points.
			</>
		}
	}


	return (
		<p>{`[${gameState.turnNo}]: `}{message} </p>
	)
}


function GameLog () {
	const { gameInfo } = useGrid();

	return (
		<div className="gameLogContainer glass">
			<div className="gameLogInnerContainer">
				{ gameInfo.gameOptions.state.map((value) => (
					<GameLogText key={value.turnNo} gameState={value} />
				))}
			</div>
		</div>
	)
}


export default GameLog;
