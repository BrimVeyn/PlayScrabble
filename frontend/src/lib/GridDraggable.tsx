import { ReactNode, Component, ContextType } from "react";
import { GridContext } from "../solo/bot/components/GridContext"
import { emptyGrid } from "../solo/bot/components/GridContext.types";
import { updatePlayers, updateTile } from "../solo/bot/components/GridContextUtils";
import "./GridDraggable.css"

interface GridDraggableProps {
	children: ReactNode;
	row: number;
	col: number;
	char: string;
}

interface GridDraggableState {
	x: number;
	y: number;
	isDragging: boolean;
	onGrid: boolean;
}

class GridDraggable extends Component<GridDraggableProps, GridDraggableState> {
	static contextType = GridContext;
	declare context: ContextType<typeof GridContext>;

	state = {
		x: 0,
		y: 0,
		isDragging: false,
		onGrid: false,
	}

	collides = (pointer: [number, number], rect: DOMRect): boolean => {
		return (pointer[0] > rect.left && pointer[0] < rect.right && pointer[1] > rect.top && pointer[1] < rect.bottom)
	}

	updateStateAndCursor = (pos: [number, number]):void => {
		this.setState({ onGrid: true });
		this.context!.setCursor((prev) => ({...prev!, cell: [pos[0], pos[1]]}));
	}

	cellToRack = (): void => {
		const pointedLetter = this.context!.gridLayers.pendingGrid[this.props.row][this.props.col];
		const retreive = (pointedLetter.joker) ? "?" : pointedLetter.value;
		updatePlayers(this.context!.setPlayers, ".", retreive);
		this.context!.setGridLayers((prev) => {
			const newPending = prev.pendingGrid.map((row, rowI) => row.map((col, colI) => {
				if (rowI === this.props.row && colI === this.props.col) return {value: ".", joker: false};
				return col;
			}))
			return {...prev, pendingGrid: newPending};
		});
	}

	placeLetter = (pos: [number, number]):void => {
		const [row, col] = [pos[0], pos[1]];

		const isJoker = this.props.char === "?";
		if (isJoker) {
			this.context!.setJokerModal(true);
			return this.updateStateAndCursor(pos);
		}

		const pendingEmpty = (this.context!.gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (this.context!.gridLayers.grid[row][col].value === ".");
		this.context!.setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));

		if (!pendingEmpty) {
			updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
		} else if (gridEmpty) {
			updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
		}
		this.updateStateAndCursor(pos);
	}

	getGridCellCoords = (e: MouseEvent): [number, number] | null => {
		const grid = document.getElementsByClassName('s-grid')[0];
		const gridRect = grid.getBoundingClientRect();
		const pointer: [number, number] = [e.clientX, e.clientY];

		if (!this.collides(pointer, gridRect))
			return null;

		const gridUnit = (gridRect.width / 15);
		for (let row = 0; row < 15; row++) {
			for (let col = 0; col < 15; col++) {
				const cell: DOMRect = { ...gridRect,
					top: gridRect.top + (Number(row) * gridUnit),
					bottom: gridRect.bottom - ((14 - Number(row)) * gridUnit),
					left: gridRect.left + (Number(col) * gridUnit),
					right: gridRect.right - ((14 - Number(col)) * gridUnit),
				}
				if (this.collides(pointer, cell))
					return [Number(row), Number(col)];
			}
		}
		return null;
	}

	handleMouseDown = (e: React.MouseEvent): void => {
		e.preventDefault();
		if (this.context!.cursor) {
			this.context!.setCursor(null);
		}
		const grid = document.getElementsByClassName('s-grid')[0];
		const gridRect = grid.getBoundingClientRect();
		const current = document.getElementById(`grid-drag-${this.props.row}-${this.props.col}`);
		const currentRect = current!.getBoundingClientRect();
		const startX = e.clientX - gridRect.left - (currentRect.width / 2);
		const startY = e.clientY - gridRect.top - (currentRect.height / 2);

		this.setState({ x: startX, y: startY, isDragging: true});
		window.addEventListener('mouseup', this.handleMouseUp);
		window.addEventListener('mousemove', this.handleMouseMove);
	}

	handleMouseMove = (e: MouseEvent): void => {
		if (this.state.isDragging) {
			this.setState((prev) => ({
				...prev,
				x: prev.x + e.movementX,
				y: prev.y + e.movementY,
			}));
		}
	}

	getRackCellCoords = (e: MouseEvent): number | null => {
		const rack = document.getElementsByClassName('rackContainer')[0];
		const rackRect = rack.getBoundingClientRect();
		const pointer: [number, number] = [e.clientX, e.clientY];

		if (!this.collides(pointer, rackRect))
			return null;

		const rackUnit = (rackRect.width / 7);
		for (let col = 0; col < 7; col++) {
			const cell: DOMRect = {
				...rackRect, top: rackRect.top, bottom: rackRect.bottom,
				left: rackRect.left + (Number(col) * rackUnit),
				right: rackRect.right - ((6 - Number(col)) * rackUnit),
			}
			if (this.collides(pointer, cell))
				return col;
		}
		return null;
	}

	swapGridCell = (cell: [number, number]): void => {
		this.context!.setGridLayers((prev) => {
			const pendingGrid = prev.pendingGrid.map((row, rowI) => row.map((col, colI) => {
				if (cell[0] == rowI && cell[1] == colI)
					return prev.pendingGrid[this.props.row][this.props.col];
				if (this.props.row == rowI && this.props.col == colI)
					return prev.pendingGrid[cell[0]][cell[1]];
				return col;
			}));
			return ({ ...prev, pendingGrid: pendingGrid });
		});
	}

	handleMouseUp = (e: MouseEvent): void => {
		const setDraggingOff = () => {
			this.setState({isDragging: false});
			window.removeEventListener('mouseup', this.handleMouseUp);
			window.removeEventListener('mousemove', this.handleMouseMove);
		}

		const gridCell: [number, number] | null = this.getGridCellCoords(e);
		if (gridCell !== null) {
			this.swapGridCell(gridCell);
			console.debug("Collides with grid at: ", gridCell);
			return setDraggingOff();
		}
		this.cellToRack();
		return setDraggingOff();
	}

	render() {
		const draggedClass = this.state.isDragging ? "gridDragged" : "";

		return (
			<>
				{this.state.isDragging &&  
					<div id={`grid-drag-${this.props.row}-${this.props.col}`} className="s-grid-cell undraggable"/>
				}
				<div 
					className={`gridDraggableContainer ${draggedClass}`}
					onMouseDown={this.handleMouseDown}
					id={`grid-drag-${this.props.row}-${this.props.col}`}
					style={{
						left: `${this.state.x}px`,
						top: `${this.state.y}px`,
					}}
				>
					{this.props.children}
				</div>
			</>
		)
	}
}

export default GridDraggable;
