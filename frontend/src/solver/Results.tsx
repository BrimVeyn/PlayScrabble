import SolverButton from "./SolverButton";
import { useGrid, emptyGrid } from "./GridContext";
import { FixedSizeList as List } from "react-window";

import "./Results.css"
import { useEffect, useState } from "react";

function Results() {
	const {setGhostGrid, lastResults, setLastResults} = useGrid();
	const [sortWay, setSortWay] = useState<"word" | "score" | null>(null);

	useEffect(() => {
		console.log("Results in result button:", lastResults);
	}, [lastResults])

	useEffect(() => {
		if (!lastResults || !sortWay) return ;
		switch (sortWay) {
			case "score":
				setLastResults([...lastResults].sort((a, b) => b.score - a.score));
				break;
			case "word":
				setLastResults([...lastResults].sort((a, b) => a.word.localeCompare(b.word)));
				break;
		}
	}, [sortWay])

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

	const rowHeight = 50; // Hauteur d'une ligne (à ajuster)

	return (
		<>
			<div className="resContainer">
				<div className="resTable">
					<div className="resHead">
						<p onClick={() => setSortWay("word")}>Word</p>
						<p onClick={() => setSortWay("score")}>Score</p>
						<p>Orientation</p>
					</div>
					<div className="resBody" onMouseLeave={() => setGhostGrid(emptyGrid)}>
						{lastResults ? (
							<List
								height={500} 
								itemCount={lastResults.length}
								itemSize={rowHeight}
								width={"100%"} 
							>
								{({ index, style }) => {
									const match = lastResults[index];
									return (
										<div 
											key={index} 
											style={style} 
											className="resRow"
											onMouseEnter={() => showGhostWord(index)}
										> 
											<p> {match.word} </p>
											<p> {match.score} </p>
											<p> {match.dir == 0 ? "Vertical" : "Horizontal"} </p>
										</div>
									);
								}}
							</List>
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
