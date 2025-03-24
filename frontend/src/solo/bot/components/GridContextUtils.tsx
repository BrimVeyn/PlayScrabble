import React from "react";
import { Direction, GridLayers, Cursor, PlayerInfo, Tile } from "./GridContext.types";

export function updateTile(
	grid: Array<Array<Tile>>,
	pos: [number, number],
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>,
	char: string,
	joker: boolean
) {
	const [row, col] = [pos[0], pos[1]];

	const newGrid = grid.map((rowV, y) => {
		if (y !== row) return [...rowV];
		return rowV.map((colV, x) => {
			if (x !== col) return colV;
			return {value: char, joker: joker};
		})
	});
	setGridLayers((prevGrid) => ({...prevGrid, pendingGrid: newGrid}));
}

export function updatePlayers(
	setPlayers: React.Dispatch<React.SetStateAction<Map<number, PlayerInfo>>>,
	haystack: string,
	needle: string,
) {
	setPlayers((prevPlayer) => {
		const next = new Map(prevPlayer);
		const goal = next.get(0)!.rack.indexOf(haystack);
		const newRack = next.get(0)!.rack.split("")
		.map((letter, idx) => idx === goal ? needle : letter).join("");
		next.set(0, {...next.get(0)!, rack:newRack});
		return next;
	});
}

export function updatePlayersIdx(
	setPlayers: React.Dispatch<React.SetStateAction<Map<number, PlayerInfo>>>,
	goal: number,
	needle: string,
) {
	setPlayers((prevPlayer) => {
		const next = new Map(prevPlayer);
		const newRack = next.get(0)!.rack.split("")
		.map((letter, idx) => idx === goal ? needle : letter).join("");
		next.set(0, {...next.get(0)!, rack:newRack});
		return next;
	});
}



export function updateCursor(
	setCursor: React.Dispatch<React.SetStateAction<Cursor | null>>,
	direction: Direction,
) {
	setCursor((prev) => {
		if (!prev)  return prev;
		switch (direction) {
			case Direction.UP: {
				if (prev.cell[0] > 0) return {...prev, direction: "down", cell: [prev.cell[0] - 1, prev.cell[1]]};
				return prev;
			}
			case Direction.RIGHT: {
				if (prev.direction === "down") return {...prev, direction: "right"};
				if (prev.cell[1] < 14) return {...prev, direction: "right", cell: [prev.cell[0], prev.cell[1] + 1]};
				return prev;
			}
			case Direction.DOWN: {
				if (prev.direction === "right") return {...prev, direction: "down"};
				if (prev.cell[0] < 14) return {...prev, direction: "down", cell: [prev.cell[0] + 1, prev.cell[1]]};
				return prev;
			}
			case Direction.LEFT: {
				if (prev.cell[1] > 0) return {...prev, direction: "right", cell: [prev.cell[0], prev.cell[1] - 1]};
				return prev;
			}
		}
	});
}
