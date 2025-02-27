import SolverButton from "./SolverButton";
import { useGrid, emptyGrid } from "./GridContext";

import "./Results.css"
import { useEffect } from "react";

function Results() {
	const {setGhostGrid, lastResults} = useGrid();

	useEffect(() => {
		console.log("Results in result button:", lastResults);
	}, [lastResults])

	const showGhostWord = (idx: number) => {
		if (!lastResults) return ;

		const match = lastResults[idx];

		switch (match.dir) {
			case 1: { //HORIZONTAL
				const row = match.savedCoord;
				const newGrid = [...emptyGrid];
				newGrid[row] = 
					newGrid[row].substring(0, match.pos[0]) +
					match.word.toUpperCase() + 
					newGrid[row].substring(match.pos[1] + 1);
				setGhostGrid(newGrid);
				break;
			}
			case 0: { //VERTICAL
				const col = match.savedCoord;
				const newGrid = [...emptyGrid];
				for (let row = match.pos[0]; row <= match.pos[1]; row++) {
					newGrid[row] = 
						newGrid[row].substring(0, col) +
						match.word[row - match.pos[0]] + 
						newGrid[row].substring(col + 1);
				}
				setGhostGrid(newGrid);
				break;
			}
			default: return ;
		}
	}

	return (
		<>
			<div className="resContainer">
				<div className="resTable">
					<div className="resHead">
						<p>Word</p>
						<p>Score</p>
					</div>
					<div className="resBody">
						{lastResults ? (
							lastResults.map((match, idx) => (
								<div 
									key={idx} 
									className="resRow" 
									onMouseEnter={() => showGhostWord(idx)} 
									onMouseLeave={() => setGhostGrid(emptyGrid)}
								> 
									<p> {match.word} </p>
									<p> {match.score} </p>
								</div>
							))
						) : 
							<SolverButton/>
						}
					</div>
				</div>
			</div>
		</>
	)
}

export default Results;
