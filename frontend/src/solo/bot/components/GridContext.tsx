import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { NewGameOptions } from "../Bot.tsx";
import { letterFrequencies, emptyGrid, GridLayers, Tile, PlayerInfo, GameInfo, Match, Cursor } from "./GridContext.types.ts"
import callSolver from "./useSolver";
import { updateTile, updatePlayers } from "./GridContextUtils.tsx";

export const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
interface GridContextType {
	gridLayers: GridLayers;
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>;
	players: Map<number, PlayerInfo>
	setPlayers: React.Dispatch<React.SetStateAction<Map<number, PlayerInfo>>>;
	gameInfo: GameInfo,
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>;
	cursor: Cursor | null;
	setCursor: React.Dispatch<React.SetStateAction<Cursor | null>>;
	jokerModal: boolean;
	setJokerModal: React.Dispatch<React.SetStateAction<boolean>>; 
	lastResults: Array<Match> | null
	setLastResults: React.Dispatch<React.SetStateAction<Array<Match> | null>>;
	handleKeyDown: (e: KeyboardEvent) => void;
	handleKeyDownMobile: (ch: string) => void;
}

const GridContext = createContext<GridContextType | undefined>(undefined);

export const useGrid = () => {
	const context = useContext(GridContext);
	if (!context) {
		throw new Error("useGrid must be used within a GridProvider");
	}
	return context;
};


function randInt(max: number) {
	return Math.floor(Math.random() * max);
}

interface RefillRackProps {
	key: number,
	gameInfo: GameInfo
	players: Map<number, PlayerInfo>,
}

const refillRack = ({key, gameInfo, players}: RefillRackProps): [string, string[]] => {
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

const GRID_SIZE = 15;


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

function placeWord({players, gameInfo, gridLayers, setGridLayers, match}: PlaceWordProps) {
	//TODO: update score
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
			let it = match.pos[0];
			const newGrid: Array<Array<Tile>> = gridLayers.grid.map((row, rowI) => {
				if (rowI !== match.savedCoord) return row;
				return row.map((col, colI) => {
					if (colI !== it || it > match.pos[1]) return col;
					it++;
					const idx = it - 1 - match.pos[0];
					if (col.value === ".") {
						newRack = removeFromRack(newRack, match.word[idx]);
					} else {
						return col;
					}
					const isJoker = (idx === match.jokerPoses[0] || idx === match.jokerPoses[1]);
					return {joker: isJoker , value: match.word[it - 1 - match.pos[0]]};
				});
			});
			setGridLayers((prev) => ({...prev, grid: newGrid}));
			break;
		}
		case 0: { //NOTE: Vertical
			let it = match.pos[0];
			const newGrid = gridLayers.grid.map((row, rowI) => {
				if (rowI !== it) return row;
				return row.map((col, colI) => {
					if (colI !== match.savedCoord || it > match.pos[1]) return col;
					it++;
					const idx = it - 1 - match.pos[0];
					if (col.value === ".") {
						newRack = removeFromRack(newRack, match.word[idx]);
					} else {
						return col;
					}
					const isJoker = (idx === match.jokerPoses[0] || idx === match.jokerPoses[1]);
					return {joker: isJoker , value: match.word[it - 1 - match.pos[0]]};
				});
			})
			setGridLayers((prev) => ({...prev, grid: newGrid}));
			break;
		}
	}
	return newRack;
}

function pickRandomMatch(gameInfo: GameInfo, results: Array<Match>) {
	//INFO: No possibility
	if (results.length === 0) {
		console.error("Cannot play");
		//TODO: Try to change as most letters as possible
		return null;
	}

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
    [0, { score: 0, rack: "SALOP?S" }],
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
		setTimeout(() => {
			setTurnChange(true);
		}, 0);
	}, []);

	useEffect(() => {
		if (lastResults === null || gameInfo.playing === 0) return ;
		//if (lastResults === null) return ;

		let match = pickRandomMatch(gameInfo, lastResults);
		if (match === null) {
			console.error("Not words to be found !");
			return ;
		}

		const newRack = placeWord({players, gameInfo, gridLayers, setGridLayers, match});
		const updated = new Map(players);

		updated.set(gameInfo.playing, {...updated.get(gameInfo.playing)!, rack: newRack});
		const [refilledRack, updatedPurse] = refillRack({key: gameInfo.playing, gameInfo, players: updated});
		updated.set(gameInfo.playing, {score: updated.get(gameInfo.playing)!.score + match.score, rack: refilledRack});

		setPlayers(updated);
		setGameInfo((prev) => ({...prev, playing: prev.playing === 0 ? 1 : 0, purse: updatedPurse}));
		setTurnChange(true);
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

	const handleKeyDownMobile = (ch: string) => {
		if (!cursor) return;
		const [row, col] = cursor.cell;
		if (letters.includes(ch)) {
			setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
			setCursor((prev) => {
				if (!prev) return prev;
				if (prev.ctx === "grid") {
					if (gridLayers.grid[row][col].value === '.' && players.get(0)!.rack.includes(ch.toUpperCase())) {
						updateTile(gridLayers.pendingGrid, [row,col], setGridLayers, ch.toUpperCase());
						updatePlayers(setPlayers, ch.toUpperCase(), ".");

						if (prev.direction === "right" && col < GRID_SIZE - 1) return { ...prev, cell: [row, col + 1] };
						else if (prev.direction === "down" && row < GRID_SIZE - 1) return { ...prev, cell: [row + 1, col] };
					}
				}
				return prev;
			});
			return;
		}
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!cursor) return;

		const [row, col] = cursor.cell;

		if (letters.includes(e.key)) {
			setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
			setCursor((prev) => {
				if (!prev) return prev;
				if (prev.ctx === "grid") {
					const hasLetter = (players.get(0)!.rack.includes(e.key.toUpperCase()));
					const pendingEmpty = (gridLayers.pendingGrid[row][col].value === ".");
					const gridEmpty = (gridLayers.grid[row][col].value === ".");
					if (!pendingEmpty && (hasLetter || jokerModal)) {
						updatePlayers(setPlayers, e.key.toUpperCase(), gridLayers.pendingGrid[row][col].value);
						updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, e.key.toUpperCase());

						if (prev.direction === "right" && col < GRID_SIZE - 1) return { ...prev, cell: [row, col + 1] };
						else if (prev.direction === "down" && row < GRID_SIZE - 1) return { ...prev, cell: [row + 1, col] };
						
					} else if (gridEmpty && (hasLetter || jokerModal)) {
						updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, e.key.toUpperCase());
						updatePlayers(setPlayers, e.key.toUpperCase(), ".");

						if (prev.direction === "right" && col < GRID_SIZE - 1) return { ...prev, cell: [row, col + 1] };
						else if (prev.direction === "down" && row < GRID_SIZE - 1) return { ...prev, cell: [row + 1, col] };
					}
				}
				return prev;
			});
			return;
		}
		
		//TODO: Adapt for joker placing on grid
		if (e.code == "Space") {
			setJokerModal((prev) => !prev);
		}

		switch (e.key) {
			case "Backspace":
				setCursor((prev) => {
					if (!prev) return prev;
					setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
					if (prev.ctx === "grid" && gridLayers.pendingGrid[row][col].value !== '.') {
						updatePlayers(setPlayers, ".", gridLayers.pendingGrid[row][col].value);
						updateTile(gridLayers.pendingGrid, [row, col], setGridLayers, ".");
					}
					if (prev.direction === "right" && col > 0) return { ...prev, cell: [row, col - 1] };
					else if (prev.direction === "down" && row > 0) return { ...prev, cell: [row - 1, col] };

					return prev;
				});
				break;
			case "ArrowDown":
				e.preventDefault();
				setCursor((prev) => {
					if (!prev) return prev;
					if (prev.ctx === "grid") {
						if (prev.direction === "right") return {...prev, direction: "down"};
						if (row < GRID_SIZE - 1) return { ...prev, cell: [row + 1, col] };
					}
					return prev;
				});
				break;
			case "ArrowRight":
				setCursor((prev) => {
					if (!prev)  return prev;
					if (prev.direction === "down") 
						return {...prev, direction: "right"};
					if ((prev.ctx === "grid" && col < GRID_SIZE - 1) || (col < 6))
						return {...prev, cell: [row, col + 1] };
					return prev;
				});
				break;
			case "ArrowLeft":
				setCursor((prev) => {
					if (!prev) return prev;
					if (prev.cell[1] > 0) 
						return { ...prev, cell: [row, col - 1], direction: "right" }
					return { ...prev, direction: "right" }
				});
				break;
			case "ArrowUp":
				e.preventDefault();
				setCursor((prev) => {
					if (!prev) return prev;
					if (prev.cell[0] > 0)
						return { ...prev, cell: [row - 1, col], direction: "down" }
					return {...prev, direction: "down"};
				});
				break;
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
			players,
			setPlayers,
			setLastResults,
			jokerModal,
			setJokerModal,
			handleKeyDown,
			handleKeyDownMobile
		}}>
			{children}
		</GridContext.Provider>
	);
};
