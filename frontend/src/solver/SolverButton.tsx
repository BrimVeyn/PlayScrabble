import { useGrid } from './GridContext';
import './SolverButton.css'

const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export default function SolverButton() {
	const {grid, rack, setLastResults} = useGrid();

	const callSolver = (grid: Array<string>) => {
		if (![...rack].some(char => letters.includes(char))) 
			return ;

		const lang = "FR";
		// Convert grid to Array<number>
		const gridNumbers = grid.map(row =>
			row.split('').map(char => (char === '.' ? 0 : char.charCodeAt(0)))
		);

		const sentRack = rack.replace(/\./g, "");
		console.log("BEFORE:", rack, sentRack);

		const payload = {
			lang: lang,
			grid: gridNumbers,
			rack: sentRack,
		};

		console.log(payload);

		fetch(`http://localhost:8081/solve`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
		.then(response => response.json())
		.then(data => {
			console.log("Response:", data);
			data = data.map((item) =>({
				word: item[0],
				score: item[1],
				dir: item[2],
				pos: item[3],
				savedCoord: item[4],
			}));
			setLastResults(data);
		})
		.catch(error => console.error('Error calling solver:', error));
	};

	return (
		<>
			<div className="solverButtonContainer">
				<button 
					onClick={() => callSolver(grid)}
				>
					Trouver les solutions 
				</button>
			</div>
		</>
	);
}
