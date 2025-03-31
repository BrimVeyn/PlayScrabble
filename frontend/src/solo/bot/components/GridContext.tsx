import React, { createContext, useReducer, useContext, useState, ReactNode, useEffect } from "react";
import { letterFrequencies, emptyGrid, GridLayers, Direction, Tile, PlayerInfo, GameInfo, Match, Cursor, letterScores, GameAction } from "./GridContext.types.ts"
import { randInt, updateTile, updatePlayers, updateCursor, updateGameState } from "./GridContextUtils.tsx";
import { NewGameOptions } from "../Bot.tsx";
import callSolver from "./useSolver";

export const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

interface GameState {
    gridLayers: GridLayers;
    players: Map<number, PlayerInfo>;
    gameInfo: GameInfo;
    cursor: Cursor | null;
    lastResults: Array<Match> | null;
    turnChange: boolean;
    jokerModal: boolean;
    endOfGame: boolean;
}

type GameStateAction =
    | { type: "SET_GRID_LAYERS"; payload: GridLayers }
    | { type: "SET_PLAYERS"; payload: Map<number, PlayerInfo> }
    | { type: "SET_GAME_INFO"; payload: GameInfo }
    | { type: "SET_CURSOR"; payload: Cursor | null }
    | { type: "SET_LAST_RESULTS"; payload: Array<Match> | null }
    | { type: "SET_TURN_CHANGE"; payload: boolean }
    | { type: "SET_JOKER_MODAL"; payload: boolean }
    | { type: "SET_END_OF_GAME"; payload: boolean }
	| { type: "BATCH_UPDATE"; payload: Partial<GameState> };

export const gameReducer = (state: GameState, action: GameStateAction): GameState => {
    switch (action.type) {
        case "SET_GRID_LAYERS":
            return { ...state, gridLayers: action.payload };
        case "SET_PLAYERS":
            return { ...state, players: action.payload };
        case "SET_GAME_INFO":
            return { ...state, gameInfo: action.payload };
        case "SET_CURSOR":
            return { ...state, cursor: action.payload };
        case "SET_LAST_RESULTS":
            return { ...state, lastResults: action.payload };
        case "SET_TURN_CHANGE":
            return { ...state, turnChange: action.payload };
        case "SET_JOKER_MODAL":
            return { ...state, jokerModal: action.payload };
        case "SET_END_OF_GAME":
            return { ...state, endOfGame: action.payload };
		case "BATCH_UPDATE":
			return { ...state, ...action.payload };
        default:
            return state;
    }
};

export interface GridContextType {
	gridLayers: GridLayers;
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>;
	players: Map<number, PlayerInfo>
	setPlayers: React.Dispatch<React.SetStateAction<Map<number, PlayerInfo>>>;
	gameInfo: GameInfo,
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>;
	turnChange: boolean,
	setTurnChange: React.Dispatch<React.SetStateAction<boolean>>;
	cursor: Cursor | null;
	setCursor: React.Dispatch<React.SetStateAction<Cursor | null>>;
	jokerModal: boolean;
	setJokerModal: React.Dispatch<React.SetStateAction<boolean>>; 
	endOfGame: boolean;
	setEndOfGame: React.Dispatch<React.SetStateAction<boolean>>; 
	lastResults: Array<Match> | null
	setLastResults: React.Dispatch<React.SetStateAction<Array<Match> | null>>;
	handleKeyDown: (e: KeyboardEvent) => void;
}

export const GridContext = createContext<GridContextType | undefined>(undefined);

export const useGrid = () => {
	const context = useContext(GridContext);
	if (!context) {
		throw new Error("useGrid must be used within a GridProvider");
	}
	return context;
};

interface RefillRackProps {
	key: number,
	gameInfo: GameInfo
	players: Map<number, PlayerInfo>,
}

export const refillRack = ({key, gameInfo, players}: RefillRackProps): [string, string[]] => {
	let rack: string = players.get(key)!.rack;
	let purse: Array<string> = [...gameInfo.purse];

	const emptySlots = rack.split("").map((elem, idx) => { if (elem === '.') return idx}).filter((elem) => elem !== undefined)
	while (purse.length > 0 && emptySlots.length > 0) {
		const randomIndex = randInt(purse.length);
		let letter = purse[randomIndex];
		if (letter === '[') letter = '?';
        purse.splice(randomIndex, 1); 

		rack = rack.split("").map((prev, idx) => {
			if (idx == emptySlots[0]) return letter;
			return prev;
		}).join("");

		emptySlots.shift();
	}
	return [rack, purse];
}

const startPurse: Array<string> = letterFrequencies.flatMap((value, i) => {
	return Array(value).fill(String.fromCharCode(65 + i))
})

const startGameInfo = {
	purse: startPurse,
	playing: 0,
	turnNo: 0,
};

const startLayers = {
	grid: emptyGrid,
	ghostGrid: emptyGrid,
	pendingGrid: emptyGrid,
};

interface GridProviderProps {
	children: ReactNode,
	gameOptions: NewGameOptions,
};

interface PlaceWordProps {
	players: Map<number, PlayerInfo>,
	gameInfo: GameInfo
	gridLayers: GridLayers,
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>,
	match: Match,
}

function removeFromRack(rack: string, col: string) {
	const idx = rack.indexOf(col);
	if (idx == -1) return rack;
	const newRack = rack.substring(0, idx) + "." + rack.substring(idx + 1);
	return newRack;
}

export function placeWord({players, gameInfo, gridLayers, setGridLayers, match}: PlaceWordProps) {
	let newRack = players.get(gameInfo.playing)!.rack;
	if (match.jokerPoses[0] !== -1) {
		const count = match.jokerPoses.reduce((sum, value) => {
			if (value !== -1) return sum + 1;
			return sum;
		}, 0);
		for (let i = 0; i < count; i++) {
			const jokerIdx = newRack.indexOf("?");
			newRack = newRack.substring(0, jokerIdx) + "." + newRack.substring(jokerIdx + 1);
		}
	}
	console.log("Rack:", newRack);

	switch (match.dir) {
		case 1: { //NOTE: Horizontal
			let it = match.range[0];
			const newGrid: Array<Array<Tile>> = gridLayers.grid.map((row, rowI) => {
				if (rowI !== match.perpCoord) return row;
				return row.map((col, colI) => {
					if (colI !== it || it > match.range[1]) return col;
					it++;
					const idx = it - 1 - match.range[0];
					if (col.value === ".") {
						newRack = removeFromRack(newRack, match.word[idx]);
					} else {
						return col;
					}
					const isJoker = (idx === match.jokerPoses[0] || idx === match.jokerPoses[1]);
					return {joker: isJoker , value: match.word[it - 1 - match.range[0]]};
				});
			});
			setGridLayers((prev) => ({...prev, grid: newGrid}));
			break;
		}
		case 0: { //NOTE: Vertical
			let it = match.range[0];
			const newGrid = gridLayers.grid.map((row, rowI) => {
				if (rowI !== it) return row;
				return row.map((col, colI) => {
					if (colI !== match.perpCoord || it > match.range[1]) return col;
					it++;
					const idx = it - 1 - match.range[0];
					if (col.value === ".") {
						newRack = removeFromRack(newRack, match.word[idx]);
					} else {
						return col;
					}
					const isJoker = (idx === match.jokerPoses[0] || idx === match.jokerPoses[1]);
					return {joker: isJoker , value: match.word[it - 1 - match.range[0]]};
				});
			})
			setGridLayers((prev) => ({...prev, grid: newGrid}));
			break;
		}
	}
	return newRack;
}

function pickRandomMatch(gameInfo: GameInfo, results: Array<Match>) {
	const resultSize = results.length;
	const difficultyMap: Map<string, number> = new Map([
		["Beginner", resultSize - Math.floor(0.6 * resultSize)],
		["Medium", resultSize - Math.floor(0.7 * resultSize)],
		["Hard", resultSize - Math.floor(0.8 * resultSize)],
		["Expert", resultSize - Math.floor(1 * resultSize)],
	]);
	const index = randInt(difficultyMap.get(gameInfo.gameOptions.difficulty)!);
	console.info("Size: ", resultSize, "Chosen:", index);

	return results[index];
}

const defaultPlayers: Map<number, PlayerInfo> = new Map([
    [0, { score: 0, rack: "......." }],
    [1, { score: 0, rack: "......." }]
]);

export const GridProvider = ({ children, gameOptions }: GridProviderProps) => {
	const [gridLayers, setGridLayers] = useState<GridLayers>(startLayers);
	const [gameInfo, setGameInfo] = useState<GameInfo>({...startGameInfo, gameOptions: gameOptions});
	const [players, setPlayers] = useState<Map<number, PlayerInfo>>(defaultPlayers);
	const [cursor, setCursor] = useState<Cursor | null>(null);
	const [lastResults, setLastResults] = useState<Array<Match> | null>(null);
	const [turnChange, setTurnChange] = useState<boolean>(false);
	const [jokerModal, setJokerModal] = useState<boolean>(false);
	const [endOfGame, setEndOfGame] = useState<boolean>(false);

	//const initialState: GameState = {
	//	gridLayers: startLayers,
	//	players: defaultPlayers,
	//	gameInfo: { ...startGameInfo, gameOptions },
	//	cursor: null,
	//	lastResults: null,
	//	turnChange: false,
	//	jokerModal: false,
	//	endOfGame: false,
	//};
	//
	//const [state, dispatch] = useReducer(gameReducer, initialState);

	useEffect(() => {
		const [rackOne, purseOne] = refillRack({key: 0, gameInfo, players});
		const [rackTwo, purseTwo] = refillRack({key: 1, gameInfo: {...gameInfo, purse: purseOne}, players});
		setPlayers((prev) => {
			const updated = new Map(prev);
			updated.set(0, {...updated.get(0)!, rack: rackOne});
			updated.set(1, {...updated.get(1)!, rack: rackTwo});
			return updated;
		})
		setGameInfo((prev) => ({...prev, purse: purseTwo}));
		setTurnChange(true);
	}, []);

	//useEffect(() => {
	//	const [rackOne, purseOne] = refillRack({ key: 0, gameInfo, players });
	//	const [rackTwo, purseTwo] = refillRack({ key: 1, gameInfo: { ...gameInfo, purse: purseOne }, players });
	//
	//	dispatch({
	//		type: "BATCH_UPDATE",
	//		payload: {
	//			players: new Map(players)
	//			.set(0, { ...players.get(0)!, rack: rackOne })
	//			.set(1, { ...players.get(1)!, rack: rackTwo }),
	//			gameInfo: { ...gameInfo, purse: purseTwo },
	//			turnChange: true,
	//		},
	//	});
	//}, []);

	useEffect(() => {
		if (lastResults === null || gameInfo.playing === 0) return ;

		setTimeout(() => {
			if (!lastResults || lastResults.length === 0) {
				//TODO: Handle end of game
				const isBotRackEmpty = players.get(1)!.rack.split("").reduce<boolean>((acc, value) => {
					if (acc === false) return acc;
					if (value !== '.') return false;
					return true;
				}, true);
				const isPlayerRackEmpty = players.get(0)!.rack.split("").reduce<boolean>((acc, value) => {
					if (acc === false) return acc;
					if (value !== '.') return false;
					return true;
				}, true);
				const isPurseEmpty = (gameInfo.purse.length === 0);

				if (isBotRackEmpty) {
					console.log("[EOG] Bot rack empty");
					if (!isPlayerRackEmpty) {
						"[EOG] Adding player's rack score"
						const letterScore = letterScores.get("FR")!.split(",");
						const scoreToAdd = players.get(0)!.rack.split("").reduce<number>((acc, value) =>
							acc + Number(letterScore[value.charCodeAt(0) - 65])
						, 0);
						setPlayers((prev) => {
							const next = new Map(prev);
							next.set(1, {...next.get(1)!, score: next.get(1)!.score + scoreToAdd});
							return next;
						});
					}
					setEndOfGame(true);
				} else if (isPurseEmpty) {
					console.log("[EOG] Bot is passing");
					setGameInfo((prev) => ({...prev, playing: prev.playing = 0, turnNo: prev.turnNo + 1}));
					setTurnChange(true);
				} else {
					const updatedPlayers = new Map(players);

					const lettersToGiveBack = updatedPlayers.get(1)!.rack.split("").reduce<string[]>((acc, value) => {
						if (value !== '.') acc.push(value);
						return acc;
					}, []);
					const emptyRack = ".......";
					updatedPlayers.set(1, {...updatedPlayers.get(1)!, rack: emptyRack});

					const newPurse = Array.from(gameInfo.purse);
					for (let letter of lettersToGiveBack) {
						newPurse.push(letter);
					}

					const [refilledRack, updatedPurse] = refillRack({key: 1, gameInfo, players: updatedPlayers});
					updatedPlayers.set(1, {...updatedPlayers.get(1)!, rack: refilledRack});

					setGameInfo((prev) => ({ ...prev, playing: 0, purse: updatedPurse, turnNo: prev.turnNo + 1 }));
					setPlayers(updatedPlayers);
					setTurnChange(true);
					console.log("[EOG] Bot rerolls");
				}
				return ;
			}

			let match = pickRandomMatch(gameInfo, lastResults);
			const newRack = placeWord({players, gameInfo, gridLayers, setGridLayers, match});

			const updated = new Map(players);

			updated.set(gameInfo.playing, {...updated.get(gameInfo.playing)!, rack: newRack});
			const [refilledRack, updatedPurse] = refillRack({key: gameInfo.playing, gameInfo, players: updated});
			updated.set(gameInfo.playing, {score: updated.get(gameInfo.playing)!.score + match.score, rack: refilledRack});

			setPlayers(updated);
			setGameInfo((prev) => ({...prev, playing: prev.playing = 0, purse: updatedPurse, turnNo: prev.turnNo + 1}));
			setTurnChange(true);
		}, 2000);

	}, [lastResults]);

	useEffect(() => {
		const fetchSolver = async () => {
			const playing = gameInfo.playing;
			const rack = players.get(playing)!.rack
			await callSolver({gridLayers, rack, setLastResults});
			setTurnChange(false);
		}

		if (turnChange === true) {
			fetchSolver();
		}
		//updateGameState()
	}, [turnChange]);

	const handleLetters = (char: string) => {
		if (char.length !== 1 || char === "?") return ;
		const [row, col] = cursor!.cell;
		const charUp = char.toUpperCase();

		if (gridLayers.grid[row][col].value === charUp || gridLayers.pendingGrid[row][col].value === charUp) {
			updateCursor(setCursor, cursor!.direction === "right" ? Direction.RIGHT : Direction.DOWN);
			return ;
		}

		setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
		const hasLetter = (players.get(0)!.rack.includes(charUp));
		const pendingEmpty = (gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (gridLayers.grid[row][col].value === ".");

		if (!pendingEmpty && hasLetter) {
			updatePlayers(setPlayers, charUp, gridLayers.pendingGrid[row][col].joker ? "?" : gridLayers.pendingGrid[row][col].value);
			updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, charUp, jokerModal);
			updateCursor(setCursor, (cursor!.direction === "right") ? Direction.RIGHT : Direction.DOWN);
		} else if (gridEmpty && hasLetter) {
			updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, charUp, jokerModal);
			updatePlayers(setPlayers, charUp, ".");
			updateCursor(setCursor, (cursor!.direction === "right") ? Direction.RIGHT : Direction.DOWN);
		} else if (gridEmpty && !hasLetter && players.get(0)!.rack.includes('?')) {
			updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, charUp, true);
			updatePlayers(setPlayers, "?", ".");
			updateCursor(setCursor, (cursor!.direction === "right") ? Direction.RIGHT : Direction.DOWN);
		}
		return;
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!cursor) return;
		const [row, col] = cursor.cell;

		if (["Space", "Backspace", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(e.key)) {
			e.preventDefault();
		}

		if (letters.includes(e.key) && !jokerModal) {
			handleLetters(e.key);
			return ;
		}
		
		if (e.code == "Space") {
			if (players.get(0)!.rack.includes("?")) {
				setJokerModal((prev) => !prev);
				return ;
			}
		}

		switch (e.key) {
			case "Backspace":
				if (jokerModal) setJokerModal(false);
				setCursor((prev) => {
					if (!prev) return prev;
					setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
					if (gridLayers.pendingGrid[row][col].value !== '.') {
						const letterBack = (gridLayers.pendingGrid[row][col].joker) ? "?" : gridLayers.pendingGrid[row][col].value;
						updatePlayers(setPlayers, ".", letterBack);
						updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, ".", jokerModal);
					}
					updateCursor(setCursor, (prev.direction === "right") ? Direction.LEFT : Direction.UP);
					return prev;
				});
				break;
			case "ArrowDown": updateCursor(setCursor, Direction.DOWN); break;
			case "ArrowRight": updateCursor(setCursor, Direction.RIGHT); break;
			case "ArrowLeft": updateCursor(setCursor, Direction.LEFT); break;
			case "ArrowUp": updateCursor(setCursor, Direction.UP); break;
			default: break;
		}
	};

	return (
		<GridContext.Provider value={{ 
			gridLayers,
			setGridLayers,
			cursor,
			setCursor,
			lastResults,
			gameInfo,
			setGameInfo,
			turnChange,
			setTurnChange,
			players,
			setPlayers,
			setLastResults,
			jokerModal,
			endOfGame,
			setEndOfGame,
			setJokerModal,
			handleKeyDown,
		}}>
			{children}
		</GridContext.Provider>
	);
};
