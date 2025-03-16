import { FixedSizeList as List } from "react-window";
import { useGrid, emptyGrid } from "./GridContext";
import { useEffect, useState } from "react";
import { FaSortAlphaDown, FaSortAlphaUpAlt, FaSortNumericDown, FaSortNumericUpAlt } from "react-icons/fa";
import { TiSortAlphabetically, TiSortNumerically } from "react-icons/ti";
import Definitions from "./Definitions";

import "../styles/Results.css"
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
	const [shownDefinition, setShownDefinition] = useState<{word: string, def: string} | null>(null);

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
		setShownDefinition(null);
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

	const getDefinition = async (index: number) => {
		if (!lastResults || (shownDefinition && shownDefinition.word === lastResults[index].word)) 
			return ;
		try {
			const response = await fetch(`https://scrabble.brimveyn.dev/api/getDefinition/${lastResults[index].word}`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' },
			});
			if (!response.ok) throw new Error('Erreur serveur');

			const data = await response.text();
			setShownDefinition({word:lastResults[index].word, def: data});
			
		} catch (error) {
			console.log('Error api/getDefinition', error);
		}
	}

	return (
		<>
		<div className="resContainer">
			<div className="resTable glass">
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
					<div className="resHeadItem p20"> <p>{t("resTableLetter")}</p> </div>
					<div className="resHeadItem p10"> <p>{t("resTableDir")}</p> </div>
					<div className="resHeadItem p10"> <p>{t("resTableJoker")}</p> </div>
				</div>
				<div className="resBody" onMouseLeave={() => setGhostGrid(emptyGrid)}>
					{lastResults &&
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
										onMouseEnter={() => {
											showGhostWord(index)
											getDefinition(index)
										}}
									> 
										<p> {match.word} </p>
										<p> {match.score} </p>
										<p className="p20"> {match.letterCount || 0} </p>
										<p className="p10"> {match.dir == 0 ? t("resRowVert") : t("resRowHor")} </p>
										<p className="p10"> {match.joker ? match.joker.filter(n => n != 0).length : 0 } </p>
									</div>
								);
							}}
						</List>
					}
				</div>
				<div className="resFooter">
					{t("resFooterWord")}{lastResults ? lastResults.length : 0}
				</div>
			</div>
		</div>
			<Definitions
				definition={shownDefinition}
			/>
		</>
	)
}

export default Results;
