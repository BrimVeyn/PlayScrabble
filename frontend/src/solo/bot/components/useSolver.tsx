import { GridLayers, Match, PlayerInfo } from "./GridContext";

interface callSolverProps {
	gridLayers: GridLayers
	playerInfo: PlayerInfo
	setLastResults: React.Dispatch<React.SetStateAction<Array<Match> | null>>;
}

async function callSolver ({gridLayers, playerInfo, setLastResults}: callSolverProps) {

	const rack = playerInfo.turn === 0 ? playerInfo.playerOneRack : playerInfo.playerTwoRack;
	const grid = gridLayers.grid;
	const lang = "FR"; //TODO: dynamically get locale
	const gridNumbers = grid.map(row =>
		row.split('').map(char => (char === '.' ? 0 : char.charCodeAt(0)))
	);
	const sentRack = rack.replace(/\./g, "");
	const payload = { lang: lang, grid: gridNumbers, rack: sentRack };

	try {
		const response = await fetch(`https://scrabble.brimveyn.dev/solver/solve`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) throw new Error('Erreur serveur');

		const data = await response.json();
		const formattedData = data.map((item: any) => ({
			word: item[0],
			score: item[1],
			dir: item[2],
			pos: item[3],
			savedCoord: item[4],
			letterCount: item[5],
			joker: item[6],
			jokerPoses: item[7],
		}));
		setLastResults(formattedData);
	} catch (error) {
		console.error('Error calling solver:', error);
	} 
};

export default callSolver;
