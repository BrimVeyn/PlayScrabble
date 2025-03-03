import SolverButton from "./SolverButton";
import { FixedSizeList as List } from "react-window";
import { useGrid, emptyGrid } from "./GridContext";
import { useEffect, useState } from "react";
import { FaSortAlphaDown, FaSortAlphaUpAlt, FaSortNumericDown, FaSortNumericUpAlt } from "react-icons/fa";
import { GrDirections } from "react-icons/gr";
import { MdOutlineQuestionMark } from "react-icons/md";
import { TiSortAlphabetically, TiSortNumerically } from "react-icons/ti";

import "./styles/Results.css"
import { useTranslation } from "react-i18next";

function toggleAscii(sortWay: string | null, setSortWay: (value: any) => void) {
    if (sortWay === "ascii-asc") setSortWay("ascii-des");
    else setSortWay("ascii-asc");
}

function toggleScore(sortWay: string | null, setSortWay: (value: any) => void) {
    if (sortWay === "score-des") setSortWay("score-asc");
    else setSortWay("score-des");
}

function Results() {
	const {rack, grid, setGhostGrid, lastResults, setLastResults} = useGrid();
	const {t} = useTranslation("solver");
	const [sortWay, setSortWay] = useState<"ascii-asc" |"ascii-des" | "score-asc" | "score-des" | null>(null);

	useEffect(() => {
		if (!lastResults || !sortWay) return ;
		switch (sortWay) {
			case "score-des": setLastResults([...lastResults].sort((a, b) => b.score - a.score)); break;
			case "score-asc": setLastResults([...lastResults].sort((a, b) => a.score - b.score)); break;
			case "ascii-asc": setLastResults([...lastResults].sort((a, b) => a.word.localeCompare(b.word))); break;
			case "ascii-des": setLastResults([...lastResults].sort((a, b) => -(a.word.localeCompare(b.word)))); break;
		}
	}, [sortWay])

	useEffect(() => {
		setSortWay(null);
		setLastResults(null);
	}, [grid, rack]);

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
		<div className="resContainer">
			<div className="resTable">
				<div className="resHead">
					<div className="resHeadItem" onClick={() => toggleAscii(sortWay, setSortWay)}>
						<p>{t("resTableWord")}</p>
						{ sortWay === "ascii-asc" && <FaSortAlphaDown />
						|| sortWay === "ascii-des" && <FaSortAlphaUpAlt />
						|| <TiSortAlphabetically/>}
					</div>
					<div className="resHeadItem" onClick={() => toggleScore(sortWay, setSortWay)}>
						<p>{t("resTableScore")}</p>
						{ sortWay === "score-asc" && <FaSortNumericDown />
						|| sortWay === "score-des" && <FaSortNumericUpAlt />
						|| <TiSortNumerically/>}
					</div>
					<div className="resHeadItem">
						<p>{t("resTableDir")}</p>
						<GrDirections/>
					</div>
					<div className="resHeadItem">
						<p>{t("resTableJoker")}</p>
						<MdOutlineQuestionMark/>
					</div>
				</div>
				<div className="resBody" onMouseLeave={() => setGhostGrid(emptyGrid)}>
					{lastResults ? (
						<List
							height={500} 
							itemCount={lastResults.length}
							itemSize={50}
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
										<p> {match.dir == 0 ? t("resRowVert") : t("resRowHor")} </p>
										<p> {match.joker ? 
											match.joker.filter(n => n != 0).length
											: 0 } 
										</p>
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
	)
}

export default Results;
