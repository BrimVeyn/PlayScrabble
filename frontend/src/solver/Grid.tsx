import { useState, useEffect } from 'react'
import { useGrid } from './GridContext'
import "./Grid.css"

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

const letters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'


function Grid() {
	const [direction, setDirection] = useState<string>("right");
	const [pendingUpdate, setPendingUpdate] = useState<{ cell: [number, number], key: string } | null>(null);

	const {grid, setGrid, cursor, setCursor} = useGrid();

	useEffect(() => {
		if (pendingUpdate && grid) {
			const { cell, key } = pendingUpdate;
			const newGrid = [...grid];
			newGrid[cell[0]] = newGrid[cell[0]].substring(0, cell[1]) + key.toUpperCase() + newGrid[cell[0]].substring(cell[1] + 1);
			setGrid(newGrid);
			setPendingUpdate(null);
		}
	}, [pendingUpdate, grid, setGrid]);

	const handleKeyDown = (e: KeyboardEvent) => {
		if (grid && cursor) {
			const [row, col] = cursor.cell;

			if (letters.includes(e.key)) {
				setCursor((prev) => {
					if (!prev || prev.ctx === "rack") return prev;
					setPendingUpdate({cell: [row, col], key: e.key});
					if (direction == "right" && col < grid[row].length - 1) return {ctx: "grid", cell: [row, col + 1]};
					else if (direction == "down" && row < grid.length - 1) return {ctx: "grid", cell: [row + 1, col]};
					return prev;
				})
				return ;
			}
			switch (e.key) {
				case 'ArrowDown': {
					setDirection((prev) => {
						if (prev == "right") return "down";
						if (row < grid.length - 1) setCursor({ctx: "grid", cell: [row + 1, col]});
						return prev;
					}); break;
				}
				case 'ArrowRight': {
					setDirection((prev) => {
						if (prev == "down") return "right";
						if (col < grid[row].length - 1) setCursor({ctx: "grid", cell: [row, col + 1]});
						return prev;
					}); break;
				}
				case 'ArrowLeft': if (col > 0) setCursor({ctx: "grid", cell: [row, col - 1]}); break;
				case 'ArrowUp': if (row > 0) setCursor({ctx: "grid", cell: [row - 1, col]}); break;
				case 'Backspace':
					setPendingUpdate({cell: [row, col], key: '.'});
					setCursor((prev) => {
						if (!prev || prev.ctx == "rack") return prev;
						if (direction == "right" && col > 0) return {ctx: "grid", cell: [row, col - 1]};
							else if (direction == "down" && row > 0) return {ctx: "grid", cell: [row - 1, col]};
						return prev;
					})
					break;
				default: break;
			}
		}
		return ;
	};

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [grid, cursor, direction]);

	return (
		<>
			<div className="s-grid">
				{ grid ? (
					<ul>
						{grid.map((item, index) => (
							<li className="s-grid-row" key={index}>
								{item.split('').map((letter, letterIndex) => {
									const isSelected:boolean = (cursor && (cursor.cell[0] == index && cursor.cell[1] == letterIndex)) ? true : false;
									const fClass:string = (letter == '.') ? "empty" : "full";
									const modClass: string = (() => {
										switch (gridModifiers[index][letterIndex]) {
											case 1: return "dword";
											case 2: return "tword";
											case 3: return "dletter";
											case 4: return "tletter";
											default: return ""; // Provide a default return value
										}
									})();									
									return (
										<div className="s-grid-cell" key={letterIndex}
											onClick={() => setCursor({ctx: "grid", cell: [index, letterIndex]})}
										> 
											<p key={index * letterIndex} className={`s-grid-tile-modifier ${modClass}`}>
											</p>
											<p className={`s-grid-tile ${fClass}`}>
												{(letter == '.') ? ' ' : letter} 
											</p>
											{ isSelected && 
												<>
													<p className="selected"></p>
													<p className={direction}></p>
												</>
											}
										</div>
									)
								}
								)}
							</li>
						))}
					</ul>
				) : (
						<h1> Loading... </h1>
					)
				}
			</div>
		</>
	)
}


export default Grid;
