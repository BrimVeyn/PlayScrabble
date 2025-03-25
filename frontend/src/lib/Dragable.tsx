import { ReactNode, Component, ContextType } from "react";
import { GridContext } from "../solo/bot/components/GridContext"
import { emptyGrid, Direction } from "../solo/bot/components/GridContext.types";
import { updateCursorClick, updatePlayersIdx, updateTile } from "../solo/bot/components/GridContextUtils";
import "./Dragable.css"

interface DragableProps {
	children: ReactNode;
	idx: number;
	char: string;
}

interface DraggableState {
	x: number;
	y: number;
	isDragging: boolean;
	onGrid: boolean;
}


class Dragable extends Component<DragableProps, DraggableState> {
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

	swapRack = (pos: number): void => {
		this.context!.setPlayers((prev) => {
			const next = new Map(prev);
			let newRack: string = next.get(0)!.rack;
			newRack = newRack.split("").map((l, idx) => {
				if (idx === this.props.idx) return newRack[pos];
				if (idx === pos) return newRack[this.props.idx];
				return l;
			}).join("");

			next.set(0, {...next.get(0)!, rack: newRack});
			return next;
		})
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
			const retreive = this.context!.gridLayers.pendingGrid[row][col].joker ? "?" : this.context!.gridLayers.pendingGrid[row][col].value;
			updatePlayersIdx(this.context!.setPlayers, this.props.idx, retreive);
			updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
		} else if (gridEmpty) {
			updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
			updatePlayersIdx(this.context!.setPlayers, this.props.idx, ".");
		}
		this.updateStateAndCursor(pos);
	}

	getGridCellCoords = (e: MouseEvent): [number, number] | null => {
		const rowElements = document.getElementsByClassName('s-grid-row');
		const rows = Array.from(rowElements).map(row => {
			return Array.from(row.getElementsByClassName('s-grid-cell'));
		});
		const [pointerX, pointerY] = [e.clientX, e.clientY];
		for (let row in rows) {
			for (let col in rows) {
				const cellRect = rows[row][col].getBoundingClientRect();
				if (pointerX > cellRect.left && pointerX < cellRect.right
					&& pointerY > cellRect.top && pointerY < cellRect.bottom) {
					return [Number(row), Number(col)];
				}
			}
		}
		return null;
	}

	handleMouseDown = (e: React.MouseEvent): void => {
		e.preventDefault();
		const currentElement = document.getElementById(`drag-${this.props.idx}`);
		const currentRect = currentElement!.getBoundingClientRect();
		const parentNode = currentElement!.parentNode as HTMLElement;
		const parentRect = parentNode.getBoundingClientRect();
		const startX = e.clientX - parentRect.left - (currentRect.width / 2);
		const startY = e.clientY - parentRect.top - (currentRect.height / 2);

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

		if (this.collides(pointer, rackRect)) {
			const rackUnit = (rackRect.width / 7);
			for (let col = 0; col < 7; col++) {
				const cell: DOMRect = {
					...rackRect, 
					top: rackRect.top,
					bottom: rackRect.bottom,
					left: rackRect.left + (Number(col) * rackUnit),
					right: rackRect.right - ((6 - Number(col)) * rackUnit),
				}
				if (this.collides(pointer, cell))
					return col;
			}
		}

		return null;
	}

	handleMouseUp = (e: MouseEvent): void => {
		const setDraggingOff = () => {
			this.setState({isDragging: false});
			window.removeEventListener('mouseup', this.handleMouseUp);
			window.removeEventListener('mousemove', this.handleMouseMove);
		}

		const gridCell: [number, number] | null = this.getGridCellCoords(e);
		if (gridCell !== null) {
			this.placeLetter(gridCell);
			console.debug("Collides with grid at: ", gridCell);
			return setDraggingOff();
		}
		const rackCEll: number | null = this.getRackCellCoords(e);
		if (rackCEll !== null) {
			console.debug("Collides with rack cell at:", rackCEll);
			this.swapRack(rackCEll);
			return setDraggingOff();
		}
		return setDraggingOff();
	}

	render() {
		const draggedClass = this.state.isDragging ? "dragged" : "";

		return (
			<>
				{this.state.isDragging &&  
					<div id={`drag-${this.props.idx}`} className="s-grid-cell undragable">
						<p className={`s-grid-tile empty`}> . </p>
					</div>
				}
			<div 
				className={`dragableContainer ${draggedClass}`}
				onMouseDown={this.handleMouseDown}
				id={`drag-${this.props.idx}`}
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

export default Dragable;
