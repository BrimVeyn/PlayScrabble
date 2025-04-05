import React, { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext"
import { GameState } from "./components/GridContext.types"

import { Menu } from "../../lib/Menu"
import Navbar from "../../navbar/Navbar"
import Game from "./Game"

import { useTranslation } from "react-i18next"
import { authFetch } from "../../auth/authFetch"
import dayjs from "dayjs"

import "./Bot.css"
import { MdDeleteForever } from "react-icons/md"
import Modal, { ModalButton, ModalFooter, ModalText, ModalTitle } from "../../lib/Modal"
import { GameUpdatePayloadType, GameFetchType } from "./components/GridContext.types"
import { IoMdPlay } from "react-icons/io"

interface AbandonModalProps {
	game: GameFetchType,
	modal: {active: boolean, game: GameFetchType | null};
	setModal: React.Dispatch<React.SetStateAction<{active: boolean, game: GameFetchType | null}>>,
}

function AbandonModal({game, modal, setModal}: AbandonModalProps) {
	console.log("GameId:", game);

	const handleDelete = () => {
		const payload: GameUpdatePayloadType = {
			id: game.id,
			status: "abandoned",
			states: btoa(JSON.stringify(game.states)),
			player_one_score: game.player_one_score,
			player_two_score: game.player_two_score,
			last_played_word: null,
		}

		console.log(JSON.stringify(payload));
		authFetch(`https://scrabble.brimveyn.dev/api/game/solo/updateGame/${game.id}`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}).then(response => {
			if (!response.ok) throw new Error("/updateGame failed");
			window.location.reload();
		}).catch(e => console.log(e));
	}

	return (
		<Modal visible={modal.active}>
			<ModalTitle text={"Abandon"}/>
			<ModalText text={"Voulez-vous abandonner cette partie ?"}/>
			<ModalFooter>
				<ModalButton text={"Non"} style={"modalButtonDeny"} callback={() => setModal({active: false, game: null})}/>
				<ModalButton text={"Oui"} style={"modalButtonAccept"} callback={handleDelete}/>
			</ModalFooter>
		</Modal>
	)
}


function BotOngoing ({setMenuState, setGameOptions}: BotMenuProps) {
	const { logged } = useAuth();
	const [games, setGames] = useState<GameFetchType[] | null>(null);
	const [modal, setModal] = useState<{active: boolean, game: GameFetchType | null}>({
		active: false,
		game: null,
	});
	const { t } = useTranslation("bot");

	useEffect(() => {
		if (logged) {
			authFetch("https://scrabble.brimveyn.dev/api/user/getPendingSoloGames", {
				method: "GET",
			}).then((response) => {
				if (!response.ok) throw new Error("Error getting solog games");
				return response.json();
			}).then(body => {
				const games = body as GameFetchType[];
				games.sort((a, b) => b.creation_time - a.creation_time);
				setGames(games);
			})
		}
	}, [logged])

	const handleClick = (idx: number) => {
		const selectedGame = games![idx];
		setGameOptions({
			id: selectedGame.id,
			difficulty: selectedGame.difficulty,
			newGame: false,
			dict: selectedGame.dict,
			state: JSON.parse(atob(selectedGame.states)),
		});
		setMenuState(MenuState.Game);
	}


	return (
		<>
		<AbandonModal game={modal.game!} modal={modal} setModal={setModal}/>
		<div className="glass onGoingTable">
			<div className="onGoingHead"><b>{t("onGoingGames")}</b></div>
			<div className="onGoingBody">
			{ logged && games ? (
				!!games.length ? (
					games.map((game, idx) => (
						<div key={idx} className="onGoingRow">
							<span> {t(game.difficulty)}</span>
							<span> {game.dict}</span>
							<span> {game.player_one_score} - {game.player_two_score} </span>
							<span> {dayjs.unix(Math.trunc(game.creation_time / 1_000_000)).format("DD/MM HH:mm")} </span>
							<p id="onGoingDeleteOuter">
								<span id="onGoingDelete" onClick={() => setModal({active: true, game: games[idx]})}> 
									<MdDeleteForever/>
								</span>
							</p>
							<p id="onGoingPlayOuter">
								<span id="onGoingPlay" onClick={() => handleClick(idx)}>
									<IoMdPlay/>
								</span>
							</p>
						</div>
					))
				) : ( <p className="onGoingPh">{t("noOnGoingPlaceHoler")}</p> )
				) : ( <p className="onGoingPh">{t("unloggedPlaceHolder")}</p> )
			}
			</div>
		</div>
		</>
	)
}


interface NewGameMenuProps {
	setMenuState: React.Dispatch<React.SetStateAction<MenuState>>,
	gameOptions: NewGameOptions,
	setGameOptions: React.Dispatch<React.SetStateAction<NewGameOptions>>,
};


const NewGameMenu = ({setMenuState, gameOptions, setGameOptions}: NewGameMenuProps) => {
	const { t } = useTranslation("bot");

	const handleChange = (e: any, field: string) => {
		setGameOptions((prev) => ({...prev, [field]: e.target.value}));
	}

	return (
		<div className="botPageContainer">
		<div className="glass newGameMenuContainer">
			<div className="newGameItem">
				<span><b>{t("dict")}</b></span>
				<select value={gameOptions.dict} onChange={(e) => handleChange(e, "dict")}>
					<option value="FR">FR (ODS 8)</option> 
					<option value="EN">EN (SOWPODS)</option> 
				</select>
			</div>
			<div className="newGameItem">
				<span><b>{t("difficulty")}</b></span>
				<select value={gameOptions.difficulty} onChange={(e) => handleChange(e, "difficulty")}>
					<option value="Beginner">{t("Beginner")}</option> 
					<option value="Medium">{t("Medium")}</option> 
					<option value="Hard">{t("Hard")}</option> 
					<option value="Expert">{t("Expert")}</option> 
				</select>
			</div>
			<div className="newGameFooter">
				<button 
					className="glass ngButton"
					onClick={() => setMenuState(MenuState.Main)}
				> {t("goBack")} </button>
				<button 
					className="glass ngButton"
					onClick={() => setMenuState(MenuState.Game)}
				> {t("confirm")} </button>
			</div>
		</div>
		</div>
	)
}

interface BotMenuProps {
	setMenuState: React.Dispatch<React.SetStateAction<MenuState>>,
	setGameOptions: React.Dispatch<React.SetStateAction<NewGameOptions>>,
};

const BotMenu = ({setMenuState, setGameOptions}: BotMenuProps) => {
	const { t } = useTranslation("bot");
	return (
		<div className="botPageContainer">
		<Menu style="botMenu">
			<div 
				className="glass menuItem"
				onClick={() => setMenuState(MenuState.NewGame)}
			>
				<p>{t("newGame")}</p>
			</div>
		<BotOngoing
			setMenuState={setMenuState}
			setGameOptions={setGameOptions}
		/>
		</Menu>
		</div>
	)
}

enum MenuState {
	Main = "Main",
	NewGame = "NewGame",
	Game = "Game"
};

export type NewGameOptions = {
	dict: string,
	difficulty: string,
	newGame: boolean,
	state: GameState[],
	id: number | null,
};

const defaultOptions = {
	dict: "FR",
	difficulty: "Medium",
	newGame: true,
	state: [],
	id: null,
};

export default function Bot () {
	const [menuState, setMenuState] = useState<MenuState>(MenuState.Main);
	const [gameOptions, setGameOptions] = useState<NewGameOptions>(defaultOptions);

	const renderState = () => {
		switch (menuState) {
			case MenuState.Main: 
				return <BotMenu 
					setMenuState={setMenuState} 
					setGameOptions={setGameOptions}
				/>
			case MenuState.NewGame: {
				return <NewGameMenu 
						setMenuState={setMenuState} 
						gameOptions={gameOptions}
						setGameOptions={setGameOptions}
					/>
			}
			case MenuState.Game: return <Game gameOptions={gameOptions}/>
		}
	}

	return (
		<div className="botPage">
			<Navbar/>
			{renderState()}
		</div>
	)
}
