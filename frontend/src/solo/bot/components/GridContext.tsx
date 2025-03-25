import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { NewGameOptions } from "../Bot.tsx";
import { letterFrequencies, emptyGrid, GridLayers, Direction, Tile, PlayerInfo, GameInfo, Match, Cursor } from "./GridContext.types.ts"
import callSolver from "./useSolver";
import { randInt, updateTile, updatePlayers, updateCursor } from "./GridContextUtils.tsx";

export const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
interface GridContextType {
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
    [0, { score: 0, rack: "....?.." }],
    [1, { score: 0, rack: "......." }]
]);

const defaultCursor: Cursor = {
	ctx: "grid",
	direction: "right",
	cell: [7, 7],
}

export const GridProvider = ({ children, gameOptions }: GridProviderProps) => {
	const [gridLayers, setGridLayers] = useState<GridLayers>(startLayers);
	const [gameInfo, setGameInfo] = useState<GameInfo>({...startGameInfo, gameOptions: gameOptions});
	const [players, setPlayers] = useState<Map<number, PlayerInfo>>(defaultPlayers);
	const [cursor, setCursor] = useState<Cursor | null>(defaultCursor);
	const [lastResults, setLastResults] = useState<Array<Match> | null>(null);
	const [turnChange, setTurnChange] = useState<boolean>(false);
	const [jokerModal, setJokerModal] = useState<boolean>(false);

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

	useEffect(() => {
		if (lastResults === null || gameInfo.playing === 0) return ;

		if (lastResults.length === 0) {
			//TODO: Handle end of game
			console.log("No words to be found");
			return ;
		}
		setTimeout(() => {
			let match = pickRandomMatch(gameInfo, lastResults);
			const newRack = placeWord({players, gameInfo, gridLayers, setGridLayers, match});
			const updated = new Map(players);

			updated.set(gameInfo.playing, {...updated.get(gameInfo.playing)!, rack: newRack});
			const [refilledRack, updatedPurse] = refillRack({key: gameInfo.playing, gameInfo, players: updated});
			updated.set(gameInfo.playing, {score: updated.get(gameInfo.playing)!.score + match.score, rack: refilledRack});

			setPlayers(updated);
			setGameInfo((prev) => ({...prev, playing: prev.playing = 0, purse: updatedPurse, turnNo: prev.turnNo + 1}));
			setTurnChange(true);
		}, 1000);

	}, [lastResults]);

	useEffect(() => {
		const fetchSolver = async () => {
			const playing = gameInfo.playing;
			const rack = players.get(playing)!.rack
			await callSolver({gridLayers, rack, setLastResults});
		}

		if (turnChange === true) {
			fetchSolver();
			setTurnChange(false);
		}
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
					if (prev.ctx === "grid" && gridLayers.pendingGrid[row][col].value !== '.') {
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
			setJokerModal,
			handleKeyDown,
		}}>
			{children}
		</GridContext.Provider>
	);
};
