import React from "react";
import { GridLayers, Tile } from "./GridContext.types";

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
