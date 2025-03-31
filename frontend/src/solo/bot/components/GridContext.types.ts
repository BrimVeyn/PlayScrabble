import { NewGameOptions } from "../Bot";

export type Match = {
	word: string;
	score: number;
	dir: number;
	range: [number, number];
	perpCoord: number;
	letterCount: number;
	jokers: [number, number];
	jokerPoses: [number, number];
};

export const letterScores: Map<string, string> = new Map([
	["FR", "1,3,3,2,1,4,2,4,1,8,10,1,2,1,1,3,8,1,1,1,1,4,10,10,10,10"]
]);

export enum Direction {
	UP,
	RIGHT,
	DOWN,
	LEFT,
};

export type Cursor = {
	cell: [number, number];
	direction: "right" | "down";
	clickedTime: number;
};

export type Tile = {
	value: string,
	joker: boolean,
};

export type GridLayers = {
	grid: Array<Array<Tile>>
	ghostGrid: Array<Array<Tile>>
	pendingGrid: Array<Array<Tile>>
};

export type GameInfo = {
	purse: Array<string>,
	playing: number,
	players: Map<number, PlayerInfo>,
	turnNo: number,
	gameOptions: NewGameOptions,
};

export type PlayerInfo = {
	rack: string,
	score: number,
}

export const GRID_SIZE: number = 15;

export const emptyGrid: Array<Array<Tile>> = Array(GRID_SIZE).fill(
	Array(GRID_SIZE).fill({value: ".", joker: false})
);

export const letterFrequencies: Array<number> = [ 9, 2, 2, 3, 15, 2, 2, 2, 8, 1, 1, 5, 3, 6, 6, 2, 1, 6, 6, 6, 6, 2, 1, 1, 1, 1, 2 ];

export const alphabet:string = "ABCDEFGHIJKLMOPQRSTUVWXYZ";

export enum GameAction {
	GameStart = "game_start",
	GameEnd = "game_end",
	PlayedWord = "played_word",
	Passed = "passed",
	Rerolled = "rerolled",
	Abandonned = "abandonned",
}

export type GameState = {
	turnNo: number,
	player_id: number,
	rack_0: string,
	score_0: number,
	rack_1: string,
	score_1: number,
	purse: string[],
	action: GameAction,
	match: Match | null,
}
