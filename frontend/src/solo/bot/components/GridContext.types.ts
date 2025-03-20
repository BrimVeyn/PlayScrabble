import { NewGameOptions } from "../Bot";

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

export type Cursor = {
	ctx: "grid" | "rack";
	cell: [number, number];
	direction: "right" | "down";
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
