import React from "react";
import { GameBackendType, Direction, GameAction, Match, GameState, GameInfo, GridLayers, Cursor, Tile } from "./GridContext.types";
import { authFetch } from "../../../auth/authFetch";
import { UserInfo } from "../../../auth/AuthContext";
import dayjs from "dayjs";

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
				if (prev.cell[0] > 0) return {...prev, direction: Direction.DOWN, cell: [prev.cell[0] - 1, prev.cell[1]]};
				return prev;
			}
			case Direction.RIGHT: {
				if (prev.direction === Direction.DOWN) return {...prev, direction: Direction.RIGHT};
				if (prev.cell[1] < 14) return {...prev, direction: Direction.RIGHT, cell: [prev.cell[0], prev.cell[1] + 1]};
				return prev;
			}
			case Direction.DOWN: {
				if (prev.direction === Direction.RIGHT) return {...prev, direction: Direction.DOWN};
				if (prev.cell[0] < 14) return {...prev, direction: Direction.DOWN, cell: [prev.cell[0] + 1, prev.cell[1]]};
				return prev;
			}
			case Direction.LEFT: {
				if (prev.cell[1] > 0) return {...prev, direction: Direction.RIGHT, cell: [prev.cell[0], prev.cell[1] - 1]};
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
				if (prev.cell[0] > 0) return {...prev, direction: Direction.DOWN, cell: [prev.cell[0] - 1, prev.cell[1]]};
				return prev;
			}
			case Direction.RIGHT: {
				let newCell = [prev.cell[0], prev.cell[1] + 1];
				while (newCell[1] < 14 && gridLayers.grid[newCell[0]][newCell[1]].value !== ".")
					newCell = [newCell[0], newCell[1] + 1];
				if (prev.direction === Direction.DOWN) return {...prev, direction: Direction.RIGHT};
				if (prev.cell[1] < 14) return {...prev, direction: Direction.RIGHT, cell: [newCell[0], newCell[1]]};
				return prev;
			}
			case Direction.DOWN: {
				let newCell = [prev.cell[0] + 1, prev.cell[1]];
				while (newCell[0] < 14 && gridLayers.grid[newCell[0]][newCell[1]].value !== ".")
					newCell = [newCell[0] + 1, newCell[1]];

				if (prev.direction === Direction.RIGHT) return {...prev, direction: Direction.DOWN};
				if (prev.cell[0] < 14) return {...prev, direction: Direction.DOWN, cell: [newCell[0], newCell[1]]};
				return prev;
			}
			case Direction.LEFT: {
				if (prev.cell[1] > 0) return {...prev, direction: Direction.RIGHT, cell: [prev.cell[0], prev.cell[1] - 1]};
				return prev;
			}
		}
	});
}

export type PlayedWord = {
	word: string,
	score: number,
}

export type GameUpdatePayloadType = {
	id: number,
	status: string,
	states: string,
	player_one_score: number,
	player_two_score: number,
	last_played_word: PlayedWord | null,
}


export function pushGameStateUpdates(
	gameInfo: GameInfo,
	setGameInfo: React.Dispatch<React.SetStateAction<GameInfo>>,
	userInfo: UserInfo,
): void {
	const states = gameInfo.gameOptions.state;

	if (states.length === 0) return ;
	const lastState = states[states.length - 1];

	if (lastState.action === GameAction.GameStart) {
		const payload: GameBackendType = {
			creation_time: dayjs().unix(),
			dict: gameInfo.gameOptions.dict,
			difficulty: gameInfo.gameOptions.difficulty,
			status: "pending",
			states: btoa(JSON.stringify(states)),
			player_one_id: userInfo.id,
			player_two_id: null,
			player_one_score: lastState.score_0,
			player_two_score: lastState.score_1,
		}
		authFetch("https://scrabble.brimveyn.dev/api/game/solo/createGame", {
			method: 'POST',
			headers: {'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}).then(response => {
			if (!response.ok) throw new Error("/createGame failed");
			return response.json();
		}).then((body: {gameId: number}) => {
			setGameInfo((prev) => ({...prev, gameOptions: {...prev.gameOptions, id: body.gameId}}))
		}).catch(e => console.log(e));
	} else {
		const gameId = gameInfo.gameOptions.id;
		let status = "pending";
		if (lastState.action === GameAction.GameEnd) status = "done";
		if (lastState.action === GameAction.Abandoned) status = "abandoned";

		const last_played_word: PlayedWord | null = (lastState.action === GameAction.PlayedWord && lastState.player_id === 0) ? 
			{ word: lastState.match!.word, score: lastState.match!.score } :
			null;

		const payload: GameUpdatePayloadType = {
			id: gameInfo.gameOptions.id!,
			status: status,
			states: btoa(JSON.stringify(states)),
			player_one_score: lastState.score_0,
			player_two_score: lastState.score_1,
			last_played_word: last_played_word,
		}

		console.log(JSON.stringify(payload));
		authFetch(`https://scrabble.brimveyn.dev/api/game/solo/updateGame/${gameId}`, {
			method: 'POST',
			headers: {'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}).then(response => {
			if (!response.ok) throw new Error("/updateGame failed");
		}).catch(e => console.log(e));
	}
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
			purse: purseToNumberArray(prev.purse),
			turnNo: prev.turnNo,
			match: match,
		};
		oldStates.push(newState);
		return {...prev, gameOptions: {...prev.gameOptions, state: oldStates}}
	});
}


export const purseToNumberArray = (purse: string[]): number[] => {
	const result = Array<number>(27).fill(0);
	purse.forEach(letter => {
		result[letter.charCodeAt(0) - 65] += 1;
	});
	return result;
}

export const numberArrayToPurse = (purse: number[]): string[] => {
	const result = purse.reduce<string[]>((acc, number, idx) => {
		for (let i = 0; i < number; i++) {
			acc.push(String.fromCharCode(idx + 65));
		}
		return acc;
	}, []);
	return result;
}
