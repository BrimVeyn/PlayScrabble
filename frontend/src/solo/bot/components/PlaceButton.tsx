import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";
import { GridLayers } from "./GridContext";

function getLettersPoses(grid: Array<string>) {
	let ret: Array<[number, number]> = [];
	for (let i = 0; i < grid.length; i++) {
		for (let j = 0; j < grid[i].length; j++) {
			if (grid[i][j] !== '.')
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

	poses.forEach(pos => console.log(pos));

	const fixedCoord = (dir === 0) ? poses[0][0] : poses[0][1];
	const first = (dir === 1) ? poses[0][0] : poses[0][1];
	const last = (dir === 1) ? poses[poses.length - 1][0] : poses[poses.length - 1][1];

	console.debug(fixedCoord, first, last);

	for (let i = first; i <= last; i++) {
		if (dir === 0 && pending[fixedCoord][i] === '.' && grid[fixedCoord][i] === '.')
			return false;
		if (dir === 1 && pending[i][fixedCoord] === '.' && grid[i][fixedCoord] === '.')
			return false;
	}
	
	return true;
}

function isInContact(grid: Array<string>, poses: Array<[number, number]>) {
	for (let pos of poses) {
		if (pos[0] + 1 < grid.length && grid[pos[0] + 1][pos[1]] !== '.') {
			return 1;
		} else if (pos[0] - 1 >= 0 && grid[pos[0] - 1][pos[1]] !== '.') {
			return 1;
		} else if (pos[1] + 1 < grid.length && grid[pos[0]][pos[1] + 1] !== '.') {
			return 0;
		} else if (pos[1] - 1 >= 0 && grid[pos[0]][pos[1] - 1] !== '.') {
			return 0;
		}
	}
	return null;
}

function getChar(gridLayers: GridLayers, pos: [number, number], dir: number) {
	if (pos[0] >= 15 || pos[0] < 0 || pos[1] >= 15 || pos[1] < 0)
		return ".";
	if (dir === 0) {
		return (gridLayers.grid[pos[0]][pos[1]] === ".") ? (gridLayers.pendingGrid[pos[0]][pos[1]] === ".") ? "." : gridLayers.pendingGrid[pos[0]][pos[1]] : gridLayers.grid[pos[0]][pos[1]];
	} else {
		return (gridLayers.grid[pos[1]][pos[0]] === ".") ? (gridLayers.pendingGrid[pos[1]][pos[0]] === ".") ? "." : gridLayers.pendingGrid[pos[1]][pos[0]] : gridLayers.grid[pos[1]][pos[0]];
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

type Match = {
	word: string,
	dir: number,
	range: [number, number],
	perpCoord: number,
};

function getWordList(gridLayers: GridLayers) {
	const pending = gridLayers.pendingGrid;

	const poses = getLettersPoses(pending);
	let alignedVert = isAligned(poses, 1);
	let alignedHor = isAligned(poses, 0);
	const contacts = isInContact(gridLayers.grid, poses);
	if (contacts === null) {
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


	if (alignedVert && isContiguous(gridLayers, poses, 1)) {
		const [start, end] = getBounds(gridLayers, poses[0], 1);
		const match = {
			word: getWord(gridLayers, poses[0], 1),
			dir: 1,
			range: [start, end],
			perpCoord: poses[0][1],
			//TODO: JOKERS
		};
		console.log(match);
		console.info("VALID");
		return {match: match, wordList: collectWords(gridLayers, poses, 1)};
	} else if (alignedHor && isContiguous(gridLayers, poses, 0)) {
		const [start, end] = getBounds(gridLayers, poses[0], 0);
		const match = {
			word: getWord(gridLayers, poses[0], 0),
			dir: 0,
			range: [start, end],
			perpCoord: poses[0][0],
			//TODO: JOKERS
		};
		console.log(match);
		console.info("VALID");
		return {match: match, wordList: collectWords(gridLayers, poses, 0)};
	}

	return null;
}

async function validateWords(gridLayers: GridLayers, data: {match: any, wordList: Array<string>}) {
	const grid = gridLayers.grid
		.map((rowV) => (rowV.split("")
		.map((colV) => (colV === "." ? 0 : colV.charCodeAt(0)))));

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
	const { gridLayers, playerInfo } = useGrid();

	const handlePlace = async () => {
		if (playerInfo.turn !== 0) {
			console.log("Not your turn");
			return ;
		}
		if (getLettersPoses(gridLayers.pendingGrid).length === 0) {
			console.log("You haven't placed any letter");
			return ;
		}
		const wordList = getWordList(gridLayers);
		if (wordList === null) {
			return ;
		}
		const ok = await validateWords(gridLayers, wordList);
		if (ok.err.length == 0) {
			console.log("Yes !");
		} else {
			console.debug("solver/getScore:", ok.err);
		}
			//pendingToGrid();
			//turnSwitch();
	}

	return (
		<button 
			className="glass actionButton"
			id ="placeButton"
			onClick={handlePlace}
		>
			{t("placeButtonText")}
		</button>
	);
}

export default PlaceButton;
