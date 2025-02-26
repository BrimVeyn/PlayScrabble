import { useState } from 'react';

interface GridProps {
	grid: Array<string> | null;
}

export default function SolverButton({grid}: GridProps) {

	const callSolver = (grid: Array<string> | null) => {
		if (!grid) return;

		const pseudoRack = "SALOPE";
		const lang = "FR";

		// Convert grid to Array<number>
		const gridNumbers = grid.map(row =>
			row.split('').map(char => (char === '.' ? 0 : char.charCodeAt(0)))
		);

		// Create JSON payload
		const payload = {
			lang: lang,
			grid: gridNumbers,
			rack: pseudoRack,
		};

		console.log(payload);

		// Send POST request with JSON body
		fetch(`http://localhost:8081/solve`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
			.then(response => response.json())
			.then(data => console.log('Solver Response:', data))
			.catch(error => console.error('Error calling solver:', error));
	};

	return (
		<>
		<button 
			className="solverButton"
			onClick={() => callSolver(grid)}
		>
			Test 
		</button>
		</>
	);
}
