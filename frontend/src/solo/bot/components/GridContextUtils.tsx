import React from "react";
import { Direction, GameAction, Match, GameState, GameInfo, GridLayers, Cursor, Tile } from "./GridContext.types";

export function randInt(max: number) {
	return Math.floor(Math.random() * max);
}

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
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>,
	haystack: string,
	needle: string,
) {
	setGameInfo((prev) => {
		const next = new Map(prev.players);
		const goal = next.get(0)!.rack.indexOf(haystack);
		const newRack = next.get(0)!.rack.split("")
		.map((letter, idx) => idx === goal ? needle : letter).join("");
		next.set(0, {...next.get(0)!, rack:newRack});
		return {...prev, players: next};
	});
}

export function updatePlayersIdx(
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>,
	goal: number,
	needle: string,
) {
	setGameInfo((prev) => {
		const next = new Map(prev.players);
		const newRack = next.get(0)!.rack.split("")
		.map((letter, idx) => idx === goal ? needle : letter).join("");
		next.set(0, {...next.get(0)!, rack:newRack});
		return {...prev, players: next};
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

export function updateCursorClick(
	gridLayers: GridLayers,
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
				let newCell = [prev.cell[0], prev.cell[1] + 1];
				while (newCell[1] < 14 && gridLayers.grid[newCell[0]][newCell[1]].value !== ".")
					newCell = [newCell[0], newCell[1] + 1];
				if (prev.direction === "down") return {...prev, direction: "right"};
				if (prev.cell[1] < 14) return {...prev, direction: "right", cell: [newCell[0], newCell[1]]};
				return prev;
			}
			case Direction.DOWN: {
				let newCell = [prev.cell[0] + 1, prev.cell[1]];
				while (newCell[0] < 14 && gridLayers.grid[newCell[0]][newCell[1]].value !== ".")
					newCell = [newCell[0] + 1, newCell[1]];

				if (prev.direction === "right") return {...prev, direction: "down"};
				if (prev.cell[0] < 14) return {...prev, direction: "down", cell: [newCell[0], newCell[1]]};
				return prev;
			}
			case Direction.LEFT: {
				if (prev.cell[1] > 0) return {...prev, direction: "right", cell: [prev.cell[0], prev.cell[1] - 1]};
				return prev;
			}
		}
	});
}

export const updateGameState = (
	action: GameAction,
	match: Match | null = null,
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>,
): void => {
	setGameInfo((prev) => {
		const oldStates = Array.from(prev.gameOptions.state);
		const newState: GameState = {
			action: action,
			player_id: prev.playing === 0 ? 1 : 0,
			rack_0: prev.players.get(0)!.rack,
			rack_1: prev.players.get(1)!.rack,
			score_0: prev.players.get(0)!.score,
			score_1: prev.players.get(1)!.score,
			purse: prev.purse,
			turnNo: prev.turnNo,
			match: match,
		};
		oldStates.push(newState);
		return {...prev, gameOptions: {...prev.gameOptions, state: oldStates}}
	});
}
