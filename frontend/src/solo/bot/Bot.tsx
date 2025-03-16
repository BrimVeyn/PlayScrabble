import { useEffect, useState } from "react"
import { useAuth } from "../../auth/AuthContext"
import { Menu } from "../../lib/Menu"
import Navbar from "../../navbar/Navbar"

import "./Bot.css"
import { useTranslation } from "react-i18next"
import timeNow from "../../lib/Date"
import Game from "./Game"


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
		if (!logged) return ;
		
		//TODO: Fetch users's game history
		setGames(testGames);
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

type NewGameOptions = {
	dict: string,
	difficulty: string,
};

interface NewGameMenuProps {
	setMenuState: React.Dispatch<React.SetStateAction<MenuState>>,
};

const defaultOptions = {dict: "FR", difficulty: "Medium"};

const NewGameMenu = ({setMenuState}: NewGameMenuProps) => {
	const { t } = useTranslation("bot");
	const [gameOptions, setGameOptions] = useState<NewGameOptions>(defaultOptions);

	const handleChangeDict = (e: any) => {
		setGameOptions((prev) => { return {...prev, dict: e.target.value}; })
	}
	const handleChangeDiff = (e: any) => {
		setGameOptions((prev) => { return {...prev, difficulty: e.target.value}; })
	}

	return (
		<div className="glass newGameMenuContainer">
			<div className="newGameItem">
				<span><b>Dictionnaire</b></span>
				<select value={gameOptions.dict} onChange={handleChangeDict}>
					<option value="FR">FR (ODS 8)</option> 
					<option value="EN">EN (SOWPODS)</option> 
				</select>
			</div>
			<div className="newGameItem">
				<span><b>Difficulte</b></span>
				<select value={gameOptions.difficulty} onChange={handleChangeDiff}>
					<option value="Expert">{t("Expert")}</option> 
					<option value="Hard">{t("Hard")}</option> 
					<option value="Medium">{t("Medium")}</option> 
					<option value="Beginner">{t("Beginner")}</option> 
				</select>
			</div>
			<div className="newGameFooter">
				<button 
					className="glass ngButton"
					onClick={() => setMenuState(MenuState.Main)}
				> Retour </button>
				<button 
					className="glass ngButton"
					onClick={() => setMenuState(MenuState.Game)}
				> Valider </button>
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
		<Menu style="botMenu">
			<div 
				className="glass menuItem"
				onClick={() => setMenuState(MenuState.NewGame)}
			>
				<p>{t("newGame")}</p>
			</div>
		<BotOngoing/>
		</Menu>
	)
}

enum MenuState {
	Main = "Main",
	NewGame = "NewGame",
	Game = "Game"
};

export default function Bot () {
	const [menuState, setMenuState] = useState<MenuState>(MenuState.Main);

	const renderState = () => {
		switch (menuState) {
			case MenuState.Main: return <BotMenu setMenuState={setMenuState}/>
			case MenuState.NewGame: return <NewGameMenu setMenuState={setMenuState}/>
			case MenuState.Game: return <Game/>
		}
	}

	return (
		<div className="botPage">
			<Navbar/>
			<div className="botPageContainer">
				{renderState()}
			</div>
		</div>
	)
}
