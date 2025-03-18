import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import callSolver from "./useSolver";
import { testGrid } from "../../solver/components/GridContext";

export const emptyGrid: Array<string> = [
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
];

export const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

const startPurse: Array<number> = [ 9, 2, 2, 3, 15, 2, 2, 2, 8, 1, 1, 5, 3, 6, 6, 2, 1, 6, 6, 6, 6, 2, 1, 1, 1, 1 ];

export type Match = {
	word: string;
	score: number;
	dir: number;
	pos: [number, number];
	savedCoord: number;
	letterCount: number;
	joker: [number, number];
	jokerPoses: [number, number];
};

type Cursor = {
	ctx: "grid" | "rack";
	cell: [number, number];
	direction: "right" | "down";
};

export type GridLayers = {
	grid: Array<string>;
	ghostGrid: Array<string>;
	pendingGrid: Array<string>;
};

export type PlayerInfo = {
	purse: Array<number>,
	turn: number,
	playerOneRack: string,
	playerTwoRack: string,
};

interface GridContextType {
	gridLayers: GridLayers;
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>;
	playerInfo: PlayerInfo;
	setPlayerInfo: React.Dispatch<React.SetStateAction<PlayerInfo>>;
	cursor: Cursor | null;
	setCursor: React.Dispatch<React.SetStateAction<Cursor | null>>;
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

interface fillRackProps {
	player: number
	playerInfo: PlayerInfo,
	setPlayerInfo: React.Dispatch<React.SetStateAction<PlayerInfo>>;
}

function randInt(max: number) {
	return Math.floor(Math.random() * max);
}

const refillRack = ({player, playerInfo, setPlayerInfo}: fillRackProps) => {
	let rack = player === 1 ? playerInfo.playerOneRack : playerInfo.playerTwoRack;

	const emptySlots = rack.split("").map((elem, idx) => { if (elem === '.') return idx}).filter((elem) => elem !== undefined)
	while (emptySlots.length > 0) {
		const letter = randInt(25);
		if (playerInfo.purse[letter] === 0) {
			continue;
		}
		playerInfo.purse[letter] -= 1;
		rack = rack.split("").map((prev, idx) => {
			if (idx == emptySlots[0])
				return String.fromCharCode(letter + 65);
			return prev;
		}).join("");
		console.log("Added: ", letter, "Rack: ", rack);
		emptySlots.shift();
	}
	setPlayerInfo((prev) => {
		if (player === 1) return {...prev, playerOneRack: rack};
		return {...prev, playerTwoRack: rack};
	})
	console.log(emptySlots);
}

const defaultPlayerInfo = {
	purse: startPurse,
	playerOneRack: ".......",
	playerTwoRack: ".......",
	turn: randInt(2),
};

const defaultLayers = {
	grid: testGrid,
	ghostGrid: emptyGrid,
	pendingGrid: emptyGrid,
};

const GRID_SIZE = 15;

export const GridProvider = ({ children }: { children: ReactNode }) => {
	//TODO: Pass purse as a prop
	const [gridLayers, setGridLayers] = useState<GridLayers>(defaultLayers);
	const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(defaultPlayerInfo);
	const [cursor, setCursor] = useState<Cursor | null>(null);
	const [lastResults, setLastResults] = useState<Array<Match> | null>(null);
	const [turnChange, setTurnChange] = useState<boolean>(true);


	useEffect(() => {
		refillRack({player: 1, playerInfo, setPlayerInfo});
		refillRack({player: 2, playerInfo, setPlayerInfo});
	}, []);

	useEffect(() => {
		//const fetchSolver = async () => {
		//	await callSolver({gridLayers, playerInfo, setLastResults});
		//}
		//
		//if (turnChange === true) {
		//	fetchSolver();
		//}
	}, [turnChange]);

	const handleKeyDownMobile = (ch: string) => {
		if (!cursor) return;
		const [row, col] = cursor.cell;
		if (letters.includes(ch)) {
			setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
			setCursor((prev) => {
				if (!prev) return prev;
				if (prev.ctx === "grid") {
					if (gridLayers.grid[row][col] === '.' && playerInfo.playerOneRack.includes(ch.toUpperCase())) {
						setGridLayers((prevGrid) => {
							const newGrid = [...prevGrid.pendingGrid];
							newGrid[row] = newGrid[row].substring(0, col) + ch.toUpperCase() + newGrid[row].substring(col + 1);
							return {...prevGrid, pendingGrid: newGrid};
						});

						setPlayerInfo((prevPlayer) => {
							const target = prevPlayer.playerOneRack.indexOf(ch.toUpperCase());
							const newRack = prevPlayer.playerOneRack
								.split("")
								.map((letter, idx) => idx === target ? "." : letter)
								.join("");
							return {...prevPlayer, playerOneRack: newRack};
						})

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
					if (gridLayers.grid[row][col] === '.' && playerInfo.playerOneRack.includes(e.key.toUpperCase())) {
						setGridLayers((prevGrid) => {
							const newGrid = [...prevGrid.pendingGrid];
							newGrid[row] = newGrid[row].substring(0, col) + e.key.toUpperCase() + newGrid[row].substring(col + 1);
							return {...prevGrid, pendingGrid: newGrid};
						});

						setPlayerInfo((prevPlayer) => {
							const target = prevPlayer.playerOneRack.indexOf(e.key.toUpperCase());
							const newRack = prevPlayer.playerOneRack
								.split("")
								.map((letter, idx) => idx === target ? "." : letter)
								.join("");
							return {...prevPlayer, playerOneRack: newRack};
						})

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
			//if (cursor.ctx !== "rack") return;
			//
			//const jokerCount = rack.split("?").length - 1;
			//if (jokerCount >= 2) return ;
			//
			//setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
			//setCursor((prev) => {
			//	if (!prev) return null;
			//	setRack(() => {
			//		const newRack = rack.substring(0, col) + "?" + rack.substring(col + 1);
			//		return newRack;
			//	});
			//	if (prev.ctx === "rack" && col < rack.length - 1) {
			//		return { ...prev, cell: [row, col + 1] };
			//	}
			//	return prev;
			//});
			//return ;
		}

		switch (e.key) {
			case "Backspace":
				setCursor((prev) => {
					if (!prev) return prev;
					setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));
					if (prev.ctx === "grid" && gridLayers.pendingGrid[row][col] !== '.') {
						setPlayerInfo((prev) => {
							const dot = prev.playerOneRack.indexOf(".");
							const newRack = playerInfo.playerOneRack
								.split("")
								.map((value, idx) => idx === dot ? gridLayers.pendingGrid[row][col] : value)
								.join("");
							return {...prev, playerOneRack: newRack};
						})
						setGridLayers((prev) => {
							const newGrid = [...prev.pendingGrid];
							newGrid[row] = newGrid[row].substring(0, col) + "." + newGrid[row].substring(col + 1);
							return {...prev, pendingGrid: newGrid};
						});
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
			playerInfo,
			setPlayerInfo,
			setLastResults,
			handleKeyDown,
			handleKeyDownMobile
		}}>
			{children}
		</GridContext.Provider>
	);
};
