import { FixedSizeList as List } from "react-window";
import { useGrid } from "./GridContext";
import { emptyGrid } from "./GridContext.types";
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
	const { setGridLayers, lastResults, setLastResults } = useGrid();
	const { t } = useTranslation("solver");
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

	const showGhostWord = (idx: number) => {
		if (!lastResults) return ;

		const match = lastResults[idx];

		switch (match.dir) {
			case 1: { //HORIZONTAL
				const row = match.perpCoord;
				const newGrid = [...emptyGrid];
				let it: number = match.range[0];
				//TODO: Also render jokers poses
				newGrid[row] = newGrid[row].map((col, x) => {
					if (x !== it || it > match.range[1]) return col;
					it++;
					return {...col, value: match.word[it - 1 - match.range[0]]};
				});
				setGridLayers((prev) => ({...prev, ghostGrid: newGrid}));
				break;
			}
			case 0: { //VERTICAL
				const newGrid = [...emptyGrid];
				for (let row = match.range[0]; row <= match.range[1]; row++) {
					newGrid[row] = newGrid[row].map((col, x) => {
						if (x !== match.perpCoord) return col;
						return {...col, value: match.word[row - match.range[0]]};
					});
				}
				setGridLayers((prev) => ({...prev, ghostGrid: newGrid}));
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
				<div className="resBody" onMouseLeave={() => setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}))}>
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
										<p className="p20"> {match.placedLetters || 0} </p>
										<p className="p10"> {match.dir == 0 ? t("resRowVert") : t("resRowHor")} </p>
										<p className="p10"> {match.jokers ? match.jokers.filter(n => n != 0).length : 0 } </p>
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
