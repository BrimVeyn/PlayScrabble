import { useEffect } from 'react'
import { useGrid, letterScore } from './GridContext'
import "./styles/Grid.css"

//NOTE: modifier Values: 
// 0 None
// 1 Double Word
// 2 Tripple Word
// 3 Double Letter
// 4 Tripple letter

const gridModifiers: Array<Array<number>> = [
    [2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2],
    [0, 1, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0, 0, 3, 0, 3, 0, 0, 0, 1, 0, 0],
    [3, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 3],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
    [0, 0, 3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3, 0, 0],
    [2, 0, 0, 3, 0, 0, 0, 1, 0, 0, 0, 3, 0, 0, 2],
    [0, 0, 3, 0, 0, 0, 3, 0, 3, 0, 0, 0, 3, 0, 0],
    [0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 4, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
    [3, 0, 0, 1, 0, 0, 0, 3, 0, 0, 0, 1, 0, 0, 3],
    [0, 0, 1, 0, 0, 0, 3, 0, 3, 0, 0, 0, 1, 0, 0],
    [0, 1, 0, 0, 0, 4, 0, 0, 0, 4, 0, 0, 0, 1, 0],
    [2, 0, 0, 3, 0, 0, 0, 2, 0, 0, 0, 3, 0, 0, 2]
]


function Grid() {
	const {grid, cursor, ghostGrid, setCursor, direction, handleKeyDown} = useGrid();

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleKeyDown]);

	return (
		<>
			<div className="s-grid">
				<ul>
					{grid.map((item, index) => (
						<li className="s-grid-row" key={index}>
							{item.split('').map((letter, letterIndex) => {
								const isSelected:boolean = (cursor && cursor.ctx == "grid" && (cursor.cell[0] == index && cursor.cell[1] == letterIndex)) ? true : false;
								const fClass:string = (letter !== '.') ? "full" : "empty";
								const gLetter:string = ghostGrid[index][letterIndex];
								const gClass:string = (gLetter !== '.' && letter === '.') ? "ghost" : "";
								const hasScore:boolean = (letter !== '.' || gLetter !== '.');
								const modClass: string = (() => {
									switch (gridModifiers[index][letterIndex]) {
										case 1: return "dword";
										case 2: return "tword";
										case 3: return "dletter";
										case 4: return "tletter";
										default: return ""; // Provide a default return value
									}
								})();
								const modText: string = (() => {
									switch(gridModifiers[index][letterIndex]) {
										case 1: return "MD";
										case 2: return "MT";
										case 3: return "LT";
										case 4: return "LD";
										default: return "";
									}
								})();
								return (
									<div 
										className="s-grid-cell" 
										key={letterIndex}
										onClick={() => setCursor({ctx: "grid", cell: [index, letterIndex]})}
									> 
										<p key={index * letterIndex} className={`s-grid-tile-modifier ${modClass}`}>
											<p className="s-grid-tile-modifier-text"> {modText} </p>
										</p>
										<p className={`s-grid-tile ${fClass} ${gClass}`}>
											{(letter == '.') ? (gLetter == '.') ? '' : gLetter : letter} 
										</p>
										
										{ hasScore && 
											<p className="score"> 
												{letterScore[letter.charCodeAt(0) - 65] || 
												letterScore[gLetter.charCodeAt(0) - 65]}
											</p>
										}
										{ isSelected && 
											<>
												<p className="selected"></p>
												<p className={direction}></p>
											</>
										}
									</div>
								)
							})}
						</li>
					))}
				</ul>
			</div>
		</>
	)
}


export default Grid;
