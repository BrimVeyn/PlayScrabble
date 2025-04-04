import { GridProvider, useGrid } from "./components/GridContext.tsx"
import { NewGameOptions } from "./Bot.tsx";
import { FaRegSadCry } from "react-icons/fa";

import Grid from "./components/Grid.tsx"
import Results from "./components/Results.tsx";
import Rack from "./components/Rack.tsx";
import PlaceButton from "./components/PlaceButton.tsx";
import PassButton from "./components/PassButton.tsx";
import RerollButton from "./components/RerollButton.tsx";
import Purse from "./components/Purse.tsx";
import ShuffleButton from "./components/ShuffleButton";
import AbandonButton from "./components/AbandonButton.tsx";
import LetterReturnButton from "./components/LetterReturnButton.tsx";
import Modal, { ModalFooter, ModalTitle } from "../../lib/Modal.tsx";
import { BiHappyBeaming } from "react-icons/bi";
import { useNavigate } from "react-router";

import "./Game.css"

interface GameProps {
	gameOptions: NewGameOptions,
};

function EndOfGameModal() {
	const { endOfGame, gameInfo } =  useGrid();
	const navigate = useNavigate();

	const playerScore = gameInfo.players.get(0)!.score;
	const botScore = gameInfo.players.get(1)!.score;
	const youWon = (playerScore > botScore);
	const endOfGameText = (youWon) ?
		"Felicitations vous avec remporte" :
		"Vous avez perdu ";

	const finalScoreText = "Score final: ";

	return (
		endOfGame && 
			<Modal>
				<ModalTitle text="Fin de partie !" />
				<p className="modalText dp-flex">
					{endOfGameText}{youWon ? <BiHappyBeaming/> : <FaRegSadCry/> }
				</p>
				<p className="modalText">
					{finalScoreText} <b>{playerScore}</b> a <b>{botScore}</b>
				</p>
				<ModalFooter>
					<button onClick={() => navigate("/")} className="glass ngButton"> Retour </button>
				</ModalFooter>
			</Modal>
	)
}

function Game({gameOptions}: GameProps) {
	return (
		<div className="gamePage">
		<div className="solverContainer">
		<GridProvider
			gameOptions={gameOptions}
		>
			<EndOfGameModal />
			<div className="contextContainer">
				<div className="rackOuterContainer">
					<Rack/>
					<LetterReturnButton/>
					<ShuffleButton/>
				</div>
				<Grid/>
				<div className="actionOuterContainer">
					<RerollButton/>
					<PassButton/>
					<PlaceButton/>
					<AbandonButton/>
					<Purse/>
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
