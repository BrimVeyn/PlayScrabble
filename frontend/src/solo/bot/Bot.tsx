import React, { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext"
import { GameState, GameInfo } from "./components/GridContext.types"

import { Menu } from "../../lib/Menu"
import Navbar from "../../navbar/Navbar"
import Game from "./Game"

import { useTranslation } from "react-i18next"
import { authFetch } from "../../auth/authFetch"

import "./Bot.css"


type GetSoloGamesType = {
	id: number,
	creation_time: number,
	dict: string,
	difficulty: string,
	status: string,
	states: string,
	player_one_id: number,
	player_two_id: number | null,
	player_one_score: number,
	player_two_score: number,
}


function BotOngoing ({setMenuState, setGameOptions}: BotMenuProps) {
	const { logged } = useAuth();
	const [games, setGames] = useState<GetSoloGamesType[] | null>(null);
	const { t } = useTranslation("bot");

	useEffect(() => {
		if (logged) {
			authFetch("https://scrabble.brimveyn.dev/api/user/getSoloGames", {
				method: "GET",
			}).then((response) => {
				if (!response.ok) throw new Error("Error getting solog games");
				return response.json();
			}).then(body => {
				console.log(body);
				setGames(body);
			})
			//setGames(testGames);
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
		<div className="glass onGoingTable">
			<div className="onGoingHead"><b>{t("onGoingGames")}</b></div>
			<div className="onGoingBody">
			{ logged ? (
				games ? (
					games.map((game, idx) => (
						<p key={idx} className="onGoingRow" onClick={() => handleClick(idx)}>
							<span> {t(game.difficulty)}</span>
							<span> {game.dict}</span>
							<span> {game.player_one_score} </span> -
							<span> {game.player_two_score} </span>
						</p>
					))
				) : ( <p className="onGoingPh">{t("noOnGoingPlaceHoler")}</p> )
				) : ( <p className="onGoingPh">{t("unloggedPlaceHolder")}</p> )
			}
			</div>
		</div>
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
