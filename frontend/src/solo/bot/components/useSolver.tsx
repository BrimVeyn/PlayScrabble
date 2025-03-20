import { GridLayers, Match, Tile } from "./GridContext.types";

interface callSolverProps {
	gridLayers: GridLayers
	rack: string
	setLastResults: React.Dispatch<React.SetStateAction<Array<Match> | null>>;
}


async function callSolver ({gridLayers, rack, setLastResults}: callSolverProps) {
	const grid: Array<Array<Tile>> = gridLayers.grid;
	const lang = "FR"; //TODO: dynamically get locale
	const gridNumbers: Array<Array<number>> = grid.map(row => {
		return row.map((col) => {
			return col.value == "." ? 0 : col.value.charCodeAt(0);
		})
	});
	const sentRack = rack.replace(/\./g, "");
	const payload = { lang: lang, grid: gridNumbers, rack: sentRack };
	console.debug("solver/solve Payload:", JSON.stringify(payload));

	try {
		const response = await fetch(`https://scrabble.brimveyn.dev/solver/solve`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		});

		if (!response.ok) throw new Error('Erreur serveur');

		console.debug("Waiting for response...");
		const data = await response.json();
		//console.debug("/solver/solve:", data);
		const formattedData = data.map((item: any) => ({
			word: item[0],
			score: item[1],
			dir: item[2],
			pos: item[3],
			savedCoord: item[4],
			letterCount: item[5],
			joker: (item[6] === undefined) ? [0, 0] : item[6],
			jokerPoses: (item[7] === undefined) ? [-1, -1] : item[7],
		}));
		setLastResults(formattedData);
	} catch (error) {
		console.error('Error calling solver:', error);
	} 
};

export default callSolver;
