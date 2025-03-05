import React, { createContext, useContext, useState, ReactNode } from "react";

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
export const testGrid: Array<string> = [
  ".......D...H...",
  "....VOTENT.U...",
  ".....RECU..M...",
  ".......H...I...",
  ".......U...DORT",
  ".....E.ET.DE...",
  ".E...M..R.E....",
  "ENFILERAI.P....",
  "P.L..R..A.EN...",
  "ANALOGUE..CI...",
  "I.I..E....H...E",
  "S.R..SALOPERIES",
  "S.E.......R...T",
  "E.........A...E",
  "..........I...R"
];

export const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

type Match = {
	word: string;
	score: number;
	dir: number;
	pos: [number, number];
	savedCoord: number;
	joker: [number, number];
	jokerPoses: [number, number];
};

type Cursor = {
	ctx: "grid" | "rack";
	cell: [number, number];
	direction: "right" | "down";
};

interface GridContextType {
	grid: Array<string>;
	setGrid: React.Dispatch<React.SetStateAction<Array<string>>>;
	ghostGrid: Array<string>;
	setGhostGrid: React.Dispatch<React.SetStateAction<Array<string>>>;
	rack: string;
	setRack: React.Dispatch<React.SetStateAction<string>>;
	cursor: Cursor | null;
	setCursor: React.Dispatch<React.SetStateAction<Cursor | null>>;
	lastResults: Array<Match> | null
	setLastResults: React.Dispatch<React.SetStateAction<Array<Match> | null>>;
	handleKeyDown: (e: KeyboardEvent) => void;
}

const GridContext = createContext<GridContextType | undefined>(undefined);

export const useGrid = () => {
	const context = useContext(GridContext);
	if (!context) {
		throw new Error("useGrid must be used within a GridProvider");
	}
	return context;
};

// Context provider component
export const GridProvider = ({ children }: { children: ReactNode }) => {
	const [grid, setGrid] = useState<Array<string>>(testGrid);
	const [ghostGrid, setGhostGrid] = useState<Array<string>>(emptyGrid);
	const [rack, setRack] = useState<string>(".......");
	const [cursor, setCursor] = useState<Cursor | null>(null);
	const [lastResults, setLastResults] = useState<Array<Match> | null>(null);

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!grid || !cursor) return;

		const [row, col] = cursor.cell;

		if (letters.includes(e.key)) {
			setGhostGrid(emptyGrid);
			setCursor((prev) => {
				if (!prev) return prev;
				(prev.ctx === "grid") && setGrid((prevGrid) => {
					const newGrid = [...prevGrid];
					newGrid[row] = newGrid[row].substring(0, col) + e.key.toUpperCase() + newGrid[row].substring(col + 1);
					return newGrid;
				});
				(prev.ctx === "rack") && setRack(() => {
					const newRack = rack.substring(0, col) + e.key.toUpperCase() + rack.substring(col + 1);
					return newRack;
				});
				if (prev.ctx === "rack" && col < rack.length - 1) {
					return { ...prev, cell: [row, col + 1] };
				} else if (prev.ctx === "grid" && prev.direction === "right" && col < grid[row].length - 1) {
					return { ...prev, cell: [row, col + 1] };
				} else if (prev.ctx === "grid" && prev.direction === "down" && row < grid.length - 1) {
					return { ...prev, cell: [row + 1, col] };
				}
				return prev;
			});
			return;
		}
		
		if (e.code == "Space") {
			if (cursor.ctx !== "rack") return;

			const jokerCount = rack.split("?").length - 1;
			if (jokerCount >= 2) return ;

			setGhostGrid(emptyGrid);
			setCursor((prev) => {
				if (!prev) return null;
				setRack(() => {
					const newRack = rack.substring(0, col) + "?" + rack.substring(col + 1);
					return newRack;
				});
				if (prev.ctx === "rack" && col < rack.length - 1) {
					return { ...prev, cell: [row, col + 1] };
				}
				return prev;
			});
			return ;
		}

		switch (e.key) {
			case "Backspace":
				setCursor((prev) => {
					if (!prev) return prev;
					(prev.ctx === "grid" && grid[row][col] !== '.') && setGrid((prevGrid) => {
						setGhostGrid(emptyGrid);
						const newGrid = [...prevGrid];
						newGrid[row] = newGrid[row].substring(0, col) + "." + newGrid[row].substring(col + 1);
						return newGrid;
					});
					(prev.ctx === "rack" && rack[0][col] !== '.') && setRack(() => {
						setGhostGrid(emptyGrid);
						const newRack = rack.substring(0, col) + "." + rack.substring(col + 1);
						return newRack;
					});
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
						if (row < grid.length - 1) return { ...prev, cell: [row + 1, col] };
					}
					return prev;
				});
				break;
			case "ArrowRight":
				setCursor((prev) => {
					if (!prev)  return prev;
					if (prev.direction === "down") return {...prev, direction: "right"};
					if (col < grid.length - 1) return {...prev, cell: [row, col + 1] };
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
			grid,
			setGrid,
			rack,
			setRack,
			cursor,
			setCursor,
			lastResults,
			ghostGrid,
			setGhostGrid,
			setLastResults,
			handleKeyDown
		}}>
			{children}
		</GridContext.Provider>
	);
};
