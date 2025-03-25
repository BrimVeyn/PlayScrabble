import { ReactNode, Component, ContextType } from "react";
import { GridContext } from "../solo/bot/components/GridContext"
import { updatePlayersIdx, updateTile } from "../solo/bot/components/GridContextUtils";
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

	placeLetter = (pos: [number, number]) => {
		//TODO: Joker handling
		updatePlayersIdx(this.context!.setPlayers, this.props.idx, ".");
		updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
		this.context!.setCursor((prev) => ({...prev!, cell: [pos[0], pos[1]]}));
		this.setState({ onGrid: true });
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
		this.setState({ x: startX, y: 0, isDragging: true});

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

	handleMouseUp = (e: MouseEvent): void => {
		const cell: [number, number] | null = this.getGridCellCoords(e);
		if (cell) {
			this.placeLetter(cell);
			console.log("Collides with: ", cell);
		}
		this.setState({isDragging: false});
		window.removeEventListener('mouseup', this.handleMouseUp);
		window.removeEventListener('mousemove', this.handleMouseMove);
	}

	render() {
		const draggedClass = this.state.isDragging ? "dragged" : "";

		return (
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
		)
	}
}

export default Dragable;
