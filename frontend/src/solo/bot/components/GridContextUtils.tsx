import React from "react";
import { GridLayers, PlayerInfo, Tile } from "./GridContext.types";

export function updateTile(
	grid: Array<Array<Tile>>,
	pos: [number, number],
	setGridLayers: React.Dispatch<React.SetStateAction<GridLayers>>,
	char: string
) {
	const [row, col] = [pos[0], pos[1]];

	const newGrid = grid.map((rowV, y) => {
		if (y !== row) return [...rowV];
		return rowV.map((colV, x) => {
			if (x !== col) return colV;
			return {value: char, joker: false};
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
