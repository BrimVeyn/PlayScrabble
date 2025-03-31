import { useTranslation } from "react-i18next";
import { placeWord, refillRack, useGrid } from "./GridContext";
import { GameInfo, Match, GridLayers, Tile, emptyGrid, GameAction } from "./GridContext.types";
import { Modal, ModalTitle, ModalText, ModalButton, ModalFooter } from "../../../lib/Modal";
import { useState } from "react";

import "../styles/PlaceButton.css"
import { updateGameState } from "./GridContextUtils";

function getLettersPoses(grid: Array<Array<Tile>>) {
	let ret: Array<[number, number]> = [];
	for (let i = 0; i < grid.length; i++) {
		for (let j = 0; j < grid[i].length; j++) {
			if (grid[i][j].value !== '.')
				ret.push([i, j]);
		}
	}
	return ret;
}

function isAligned(poses: Array<[number, number]>, dir: number) {
	if (poses.length === 1) return true;

	for (let i = 1; i < poses.length; i++) {
		if (poses[i][dir] !== poses[i - 1][dir])
			return false;
	}
	return true;
}

function isContiguous(gridLayers: GridLayers, poses: Array<[number, number]>, dir: number) {
	const grid = gridLayers.grid;
	const pending = gridLayers.pendingGrid;

	//poses.forEach(pos => console.log(pos));

	const fixedCoord = (dir === 0) ? poses[0][0] : poses[0][1];
	const first = (dir === 1) ? poses[0][0] : poses[0][1];
	const last = (dir === 1) ? poses[poses.length - 1][0] : poses[poses.length - 1][1];

	//console.debug(fixedCoord, first, last);

	for (let i = first; i <= last; i++) {
		if (dir === 0 && pending[fixedCoord][i].value === '.' && grid[fixedCoord][i].value === '.')
			return false;
		if (dir === 1 && pending[i][fixedCoord].value === '.' && grid[i][fixedCoord].value === '.')
			return false;
	}
	
	return true;
}

function isInContact(grid: Array<Array<Tile>>, poses: Array<[number, number]>) {
	for (let pos of poses) {
		if (pos[0] + 1 < grid.length && grid[pos[0] + 1][pos[1]].value !== '.') {
			return 1;
		} else if (pos[0] - 1 >= 0 && grid[pos[0] - 1][pos[1]].value !== '.') {
			return 1;
		} else if (pos[1] + 1 < grid.length && grid[pos[0]][pos[1] + 1].value !== '.') {
			return 0;
		} else if (pos[1] - 1 >= 0 && grid[pos[0]][pos[1] - 1].value !== '.') {
			return 0;
		}
	}
	return null;
}

function getChar(gridLayers: GridLayers, pos: [number, number], dir: number) {
	if (pos[0] >= 15 || pos[0] < 0 || pos[1] >= 15 || pos[1] < 0)
		return ".";
	if (dir === 0) {
		return (gridLayers.grid[pos[0]][pos[1]].value === ".") ? (gridLayers.pendingGrid[pos[0]][pos[1]].value === ".") ? "." : gridLayers.pendingGrid[pos[0]][pos[1]].value : gridLayers.grid[pos[0]][pos[1]].value;
	} else {
		return (gridLayers.grid[pos[1]][pos[0]].value === ".") ? (gridLayers.pendingGrid[pos[1]][pos[0]].value === ".") ? "." : gridLayers.pendingGrid[pos[1]][pos[0]].value : gridLayers.grid[pos[1]][pos[0]].value;
	}
}

function getWord(gridLayers: GridLayers, pos: [number, number], dir: number) {
	const fixedCoord = (dir === 0) ? pos[0] : pos[1];
	const dynCoord = (dir === 0) ? pos[1] : pos[0];

	let first = dynCoord;
	while (getChar(gridLayers, [fixedCoord, first - 1], dir) !== '.') {
		first -= 1;
	}
	let last = dynCoord;
	while (getChar(gridLayers, [fixedCoord, last + 1], dir) !== '.') {
		last += 1;
	}
	
	let dummy: string = "";
	for (let i = first; i <= last; i++) {
		dummy += getChar(gridLayers, [fixedCoord, i], dir);
	}
	return dummy;
}


function getBounds(gridLayers: GridLayers, pos: [number, number], dir: number) {
	const fixedCoord = (dir === 0) ? pos[0] : pos[1];
	const dynCoord = (dir === 0) ? pos[1] : pos[0];

	let first = dynCoord;
	while (getChar(gridLayers, [fixedCoord, first - 1], dir) !== '.') {
		first -= 1;
	}
	let last = dynCoord;
	while (getChar(gridLayers, [fixedCoord, last + 1], dir) !== '.') {
		last += 1;
	}
	
	return [first, last];
}

function collectWords(gridLayers: GridLayers, poses: Array<[number, number]>, dir: number) {
	let ret: Array<string> = [];

	let dummy = getWord(gridLayers, poses[0], dir);
	if (dummy.length !== 1) ret.push(dummy);

	for (let pos of poses) {
		dummy = getWord(gridLayers, pos, (dir === 0) ? 1 : 0);
		if (dummy.length !== 1) ret.push(dummy);
	}

	console.debug(ret);
	return ret;
}

function onMiddleRow(poses: Array<[number, number]>) {
	let centerPiece = false
	for (let pos of poses) {
		if (pos[0] !== 7)
			return false;
		if (pos[1] === 7) centerPiece = true;
	}
	return centerPiece;
}

function getJokersPoses(gridLayers: GridLayers, poses: Array<[number, number]>): [[number, number],[number,number]] {
	let it: number = 0;
	let jokerIt: number = 0;
	const jokers = gridLayers.pendingGrid.reduce<[[number, number],[number,number]]>((acc, row, rowI) => {
		row.map((col, colI) => {
			if (it < poses.length && poses[it][0] === rowI && poses[it][1] === colI) {
				if (col.joker) {
					acc[0][jokerIt] = col.value.charCodeAt(0);
					acc[1][jokerIt++] = it;
				}
				it++;
			}
			return col;
		})
		return acc;
	}, [[0, 0], [-1, -1]])
	return jokers;
}

function getWordList(gameInfo: GameInfo, gridLayers: GridLayers) {
	const pending = gridLayers.pendingGrid;

	const poses = getLettersPoses(pending);
	let alignedVert = isAligned(poses, 1);
	let alignedHor = isAligned(poses, 0);
	const contacts = isInContact(gridLayers.grid, poses);
	const firstTurnException = (onMiddleRow(poses) && gameInfo.turnNo == 0);

	if (contacts === null && !firstTurnException) {
		console.debug("Not in contact");
		return null;
	} else if (poses.length === 1 && contacts === 1) {
		alignedVert = true;
		alignedHor = false;
	} else if (poses.length === 1) {
		alignedVert = false;
		alignedHor = true;
	}

	alignedVert && console.debug("Aligned vertically");
	alignedHor && console.debug("Aligned horizontaly");

	if (!alignedVert && !alignedHor) {
		console.debug("Not aligned");
		return null;
	}

	const [jokers, jokerPoses] = getJokersPoses(gridLayers, poses);
	console.log("jokerPoses poses:", jokerPoses);

	if (alignedVert && isContiguous(gridLayers, poses, 1)) {
		const [start, end] = getBounds(gridLayers, poses[0], 1);
		const match: Match = {
			word: getWord(gridLayers, poses[0], 1),
			dir: 0,
			score: 0,
			placedLetters: poses.length,
			range: [start, end],
			perpCoord: poses[0][1],
			jokers: jokers,
			jokerPoses: jokerPoses,
		};
		console.log(match);
		return {match: match, wordList: collectWords(gridLayers, poses, 1)};
	} else if (alignedHor && isContiguous(gridLayers, poses, 0)) {
		const [start, end] = getBounds(gridLayers, poses[0], 0);
		const match: Match = {
			word: getWord(gridLayers, poses[0], 0),
			dir: 1,
			score: 0,
			placedLetters: poses.length,
			range: [start, end],
			perpCoord: poses[0][0],
			jokers: jokers,
			jokerPoses: jokerPoses,
		};
		console.log(match);
		return {match: match, wordList: collectWords(gridLayers, poses, 0)};
	}
	console.info("Not contiguous");

	return null;
}

async function validateWords(gridLayers: GridLayers, data: {match: any, wordList: Array<string>}) {
	const grid: Array<Array<number>> = gridLayers.grid
		.map((rowV) => (rowV
		.map((colV) => (colV.value === "." ? 0 : colV.value.charCodeAt(0)))));
	console.log(grid);

	const payload = {
		lang: "FR", //TODO: Lang dynamic
		grid: grid,
		wordList: data.wordList,
		match: data.match,
	};

	console.log(JSON.stringify(payload));
	return fetch("https://scrabble.brimveyn.dev/solver/getScore", {
		method: "POST",
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
	.then((response) => response.json())
	.then((value) => {
		console.info(value)
		return value;
	})
	.catch((e) => console.error(e));
}

function PlaceButton() {
	const {t} = useTranslation("bot");
	const { players, gridLayers, gameInfo, setGameInfo, setGridLayers, setTurnChange, setPlayers } = useGrid();
	const [modal, setModal] = useState<boolean>(false);

	const handlePlace = async () => {
		if (gameInfo.playing !== 0) {
			console.log("Not your turn");
			return ;
		}
		if (getLettersPoses(gridLayers.pendingGrid).length === 0) {
			console.log("You haven't placed any letter");
			return ;
		}
		const data = getWordList(gameInfo, gridLayers);
		if (data === null) {
			return ;
		}
		const ok = await validateWords(gridLayers, data);
		if (ok.err.length == 0) {
			console.log("Yes !");
			data.match.score = ok.score;
			console.log("Filled match: ", data.match);
			placeWord({players, gameInfo, gridLayers, setGridLayers, match: data.match});
			setGridLayers((prev) => ({...prev, pendingGrid: emptyGrid}));
			const [newRack, newPurse] = refillRack({key: 0, gameInfo, players});
			setPlayers((prev) => {
				let next = new Map(prev);
				next.set(0, {rack: newRack, score: next.get(0)!.score + data.match.score});
				return next;
			})
			updateGameState(GameAction.PlayedWord, data.match, setGameInfo, players);
			setGameInfo((prev) => ({...prev, purse: newPurse, turnNo: prev.turnNo + 1, playing: 1}));
			setTurnChange(true);
		} else {
			console.debug("solver/getScore:", ok.err);
		}
	}

	return (
		<>
		<button 
			className="glass actionButton"
			id ="placeButton"
			onClick={() => {
				//NOTE: Disable the button when its not your turn
				if (gameInfo.playing === 1) return ;
				setModal(true)
			}}
		>
			{t("placeButtonText")}
		</button>
		{ modal && (
			<Modal>
					<ModalTitle text={t("placeModalConfirmTitle")}/>
					<ModalText text={t("placeModalConfirmText")}/>
					<ModalFooter>
						<ModalButton text={t("no")} style={"modalButtonDeny"} callback={() => setModal(false)}/>
						<ModalButton text={t("yes")} style={"modalButtonAccept"} callback={() => {
							handlePlace();
							setModal(false);
						}}/>
					</ModalFooter>
			</Modal>
		)}
		</>
	);
}

export default PlaceButton;
