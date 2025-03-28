import React, { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext"
import { Menu } from "../../lib/Menu"
import Navbar from "../../navbar/Navbar"

import "./Bot.css"
import { useTranslation } from "react-i18next"
import Game from "./Game"
import { authFetch } from "../../lib/authFetch"


type Game = {
	difficulty: string,
	gridState: string,
	rackState: string,
	purseState: string,
};

const testGames = [
	{difficulty: "Hard", gridState: "", rackState: "ABCD...", purseState: ""},
	{difficulty: "Medium", gridState: "", rackState: "DEFG...", purseState: ""},
];


function BotOngoing () {
	const { logged } = useAuth();
	const [games, setGames] = useState<Array<Game> | null>(null);
	const { t } = useTranslation("bot");

	useEffect(() => {
		//TODO: Fetch users's game history
		if (logged) {
			authFetch("https://scrabble.brimveyn.dev/api/user/getSoloGames", {
				method: "GET",
			})
			setGames(testGames);
		}
	}, [logged])

	return (
		<div className="glass onGoingTable">
			<div className="onGoingHead"><b>{t("onGoingGames")}</b></div>
			<div className="onGoingBody">
			{ logged ? (
				games ? (
					games.map((game, idx) => (
						<p key={idx} className="onGoingRow">
							<span> {idx} </span>
							<span> {t(game.difficulty)} </span>
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

const defaultOptions = {dict: "FR", difficulty: "Medium"};

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
};

const BotMenu = ({setMenuState}: BotMenuProps) => {
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
		<BotOngoing/>
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
};

export default function Bot () {
	const [menuState, setMenuState] = useState<MenuState>(MenuState.Main);
	const [gameOptions, setGameOptions] = useState<NewGameOptions>(defaultOptions);

	const renderState = () => {
		switch (menuState) {
			case MenuState.Main: return <BotMenu setMenuState={setMenuState}/>
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
