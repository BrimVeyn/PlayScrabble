import { createContext, useContext, useState, ReactNode } from "react";

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

type Match = {
	word: string;
	score: number;
	dir: number;
	pos: [number, number];
	savedCoord: number;
};


// Define the context type
interface GridContextType {
	grid: Array<string>;
	setGrid: (grid: Array<string>) => void;
	ghostGrid: Array<string>;
	setGhostGrid: (ghostGrid: Array<string>) => void;
	rack: string;
	setRack: (rack: string) => void;
	cursor: {ctx: string, cell: [number, number]} | null;
	setCursor: (cursor: {ctx: string, cell: [number, number]} | null) => void;
	direction: string;
	setDirection: (direction: string) => void;
	lastResults: Array<Match> | null
	setLastResults: (results: Array<Match> | null) => void;
	handleKeyDown: (e: KeyboardEvent) => void;
}

// Create the context with default values (to avoid errors before provider mounts)
const GridContext = createContext<GridContextType | undefined>(undefined);

// Custom hook to use the context
export const useGrid = () => {
	const context = useContext(GridContext);
	if (!context) {
		throw new Error("useGrid must be used within a GridProvider");
	}
	return context;
};

// Context provider component
export const GridProvider = ({ children }: { children: ReactNode }) => {
	const [grid, setGrid] = useState<Array<string>>(emptyGrid);
	const [ghostGrid, setGhostGrid] = useState<Array<string>>(emptyGrid);
	const [rack, setRack] = useState<string>(".......");
	const [cursor, setCursor] = useState<{ctx: string, cell: [number, number]} | null>(null);
	const [direction, setDirection] = useState<string>("right");
	const [lastResults, setLastResults] = useState<Array<Match> | null>(null);

	const handleKeyDown = (e: KeyboardEvent) => {
		if (!grid || !cursor) return;

		const [row, col] = cursor.cell;

		if (letters.includes(e.key)) {
			setLastResults(null);
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
					return { ctx: prev.ctx, cell: [row, col + 1] };
				} else if (prev.ctx === "grid" && direction === "right" && col < grid[row].length - 1) {
					return { ctx: prev.ctx, cell: [row, col + 1] };
				} else if (prev.ctx === "grid" && direction === "down" && row < grid.length - 1) {
					return { ctx: prev.ctx, cell: [row + 1, col] };
				}
				return prev;
			});
			return;
		}
		
		if (e.code == "Space") {
			if (cursor.ctx !== "rack") return;
			const jokerCount = rack.split("?").length - 1;
			if (jokerCount == 2) return ;
			setCursor((prev) => {
				if (!prev) return null;
				setRack(() => {
					const newRack = rack.substring(0, col) + "?" + rack.substring(col + 1);
					return newRack;
				});
				if (prev.ctx === "rack" && col < rack.length - 1) {
					return { ctx: prev.ctx, cell: [row, col + 1] };
				}
				return prev;
			});
		}

		switch (e.key) {
			case "Backspace":
				setLastResults(null);
				setGhostGrid(emptyGrid);
				setCursor((prev) => {
					if (!prev) return prev;
					(prev.ctx === "grid") && setGrid((prevGrid) => {
						const newGrid = [...prevGrid];
						newGrid[row] = newGrid[row].substring(0, col) + "." + newGrid[row].substring(col + 1);
						return newGrid;
					});
					(prev.ctx === "rack") && setRack(() => {
						const newRack = rack.substring(0, col) + "." + rack.substring(col + 1);
						return newRack;
					});
					if (direction === "right" && col > 0) return { ctx: prev.ctx, cell: [row, col - 1] };
					else if (direction === "down" && row > 0) return { ctx: prev.ctx, cell: [row - 1, col] };
					return prev;
				});
				break;
			case "ArrowDown":
				(cursor.ctx === "grid") && setDirection((prev) => {
					if (prev === "right") return "down";
					if (row < grid.length - 1) setCursor((prev) => {
						if (!prev) return prev;
						return { ctx: prev.ctx, cell: [row + 1, col] };
					});
					return prev;
				});
				break;
			case "ArrowRight":
				setDirection((prev) => {
					if (prev === "down") return "right";
					if (cursor.ctx == "rack") {
						setCursor((prevC) => {
							if (!prevC) return prevC;
							if (col < rack.length - 1) return { ctx: prevC.ctx, cell: [0, col + 1]};
							return prevC;
						});
					} else if (col < grid[row].length - 1) setCursor((prevC) => {
						if (!prevC) return prevC;
						return { ctx: prevC.ctx, cell: [row, col + 1] };
					});
					return prev;
				});
				break;
			case "ArrowLeft":
				if (col > 0) setCursor((prev) => {
					if (!prev) return prev;
					return { ctx: prev.ctx, cell: [row, col - 1] }
				});
				setDirection("right");
				break;
			case "ArrowUp":
				if (row > 0) setCursor((prev) => {
					if (!prev) return prev;
					return { ctx: prev.ctx, cell: [row - 1, col] }
				});
				setDirection("down");
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
			direction,
			setDirection,
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
