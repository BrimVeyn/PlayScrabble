import { ReactNode, Component, ContextType } from "react";
import { GridContext } from "../solo/bot/components/GridContext"
import { emptyGrid, } from "../solo/bot/components/GridContext.types";
import { updatePlayersIdx, updateTile } from "../solo/bot/components/GridContextUtils";
import "./RackDraggable.css"

interface RackDraggableProps {
	children: ReactNode;
	idx: number;
	char: string;
}

interface RackDraggableState {
	x: number;
	y: number;
	isDragging: boolean;
	offsetX: number;
	offsetY: number;
}

class RackDraggable extends Component<RackDraggableProps, RackDraggableState> {
	static contextType = GridContext;
	declare context: ContextType<typeof GridContext>;

	state = {
		x: 0,
		y: 0,
		isDragging: false,
		offsetX: 0, //NOTE: Used for touch handlers
		offsetY: 0, //NOTE: -----------------------
	}

	collides = (pointer: [number, number], rect: DOMRect): boolean => {
		return (pointer[0] > rect.left && pointer[0] < rect.right && pointer[1] > rect.top && pointer[1] < rect.bottom)
	}

	isTouchEvent = (e: MouseEvent | TouchEvent): e is TouchEvent => {
		return typeof TouchEvent !== 'undefined' && e instanceof TouchEvent;
	}

	isMouseEvent = (e: MouseEvent | TouchEvent): e is MouseEvent => {
		return typeof MouseEvent !== 'undefined' && e instanceof MouseEvent;
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
		if (isJoker)
			return this.context!.setJokerModal(true);

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
	}

	getRackCellCoords = (pointer: [number, number]): number | null => {
		const rack = document.getElementsByClassName('rackContainer')[0];
		const rackRect = rack.getBoundingClientRect();
		const rackUnit = (rackRect.width / 7);

		if (!this.collides(pointer, rackRect))
			return null;

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

	getGridCellCoords = (pointer: [number, number]): [number, number] | null => {
		const rowElements = document.getElementsByClassName('s-grid-row');
		const rows = Array.from(rowElements).map(row => {
			return Array.from(row.getElementsByClassName('s-grid-cell'));
		});
		for (let row in rows) {
			for (let col in rows) {
				const cellRect = rows[row][col].getBoundingClientRect();
				if (this.collides(pointer, cellRect))
					return [Number(row), Number(col)];
			}
		}
		return null;
	}

	handleMouseDown = (e: React.MouseEvent): void => {
		e.preventDefault();

		//NOTE: Prevent draggable behavior when cursor is available, replaced by onClick in parent component
		if (this.context!.cursor)
			return;

		//HACK: Modifying zIndex so the tile can appear above the grid while being dragged;
		const grid = document.getElementsByClassName('s-grid')[0] as HTMLElement;
		grid.style.zIndex = "0";

		const currentElement = document.getElementById(`drag-${this.props.idx}`);
		const currentRect = currentElement!.getBoundingClientRect();
		const parentNode = currentElement!.parentNode as HTMLElement;
		const parentRect = parentNode.getBoundingClientRect();
		const startX = e.clientX - parentRect.left - (currentRect.width / 2);
		const startY = e.clientY - parentRect.top - (currentRect.height / 2);

		this.setState({ x: startX, y: startY, isDragging: true});
		window.addEventListener('mouseup', this.draggindEnd);
		window.addEventListener('mousemove', this.draggingMove);
	}

	handleTouchStart = (e: React.TouchEvent): void => {
		e.preventDefault();
		if (this.context!.cursor)
			return;

		const grid = document.getElementsByClassName('s-grid')[0] as HTMLElement;
		grid.style.zIndex = "0";

		const touch = e.touches[0];
		const currentElement = document.getElementById(`drag-${this.props.idx}`);
		const currentRect = currentElement!.getBoundingClientRect();
		const parentNode = currentElement!.parentNode as HTMLElement;
		const parentRect = parentNode.getBoundingClientRect();
		const offsetY = parentRect.top + (currentRect.width / 2);
		const offsetX = parentRect.left + (currentRect.height / 2);
		const startX = touch.clientX - offsetX;
		const startY = touch.clientY - offsetY;

		this.setState({ x: startX, y: startY, offsetX: offsetX, offsetY: offsetY, isDragging: true});
		window.addEventListener('touchmove', this.draggingMove, { passive: false });
		window.addEventListener('touchend', this.draggindEnd, { passive: false });
	}

	draggingMove = (e: TouchEvent | MouseEvent): void => {
		e.preventDefault();
		if (!this.state.isDragging) 
			return;

		if (this.isTouchEvent(e)) {
			this.setState((prev) => ({
				...prev,
				x: e.touches[0].clientX - prev.offsetX,
				y: e.touches[0].clientY - prev.offsetY,
			}));
		} else if (this.isMouseEvent(e)) {
			this.setState((prev) => ({
				...prev,
				x: prev.x + e.movementX,
				y: prev.y + e.movementY,
			}));
		}
	}

	setDraggingOff = (e: TouchEvent | MouseEvent): void => {
		let moveEvent: 'touchmove' | 'mousemove';
		let endEvent: 'touchend' | 'mouseup';

		if (this.isTouchEvent(e)) {
			moveEvent = 'touchmove';
			endEvent = 'touchend';
		} else if (this.isMouseEvent(e)) {
			moveEvent = 'mousemove';
			endEvent = 'mouseup';
		}
		window.removeEventListener(moveEvent!, this.draggingMove);
		window.removeEventListener(endEvent!, this.draggindEnd);
		this.setState({isDragging: false});
	}

	draggindEnd = (e: TouchEvent | MouseEvent): void => {
		let pointer: [number, number];

		if (this.isTouchEvent(e)) {
			pointer = [ e.changedTouches[0].clientX, e.changedTouches[0].clientY ];
		} else if (this.isMouseEvent(e)) {
			pointer = [e.clientX, e.clientY];
		}

		const grid = document.getElementsByClassName('s-grid')[0] as HTMLElement;
		grid.style.zIndex = "1";

		const gridCell: [number, number] | null = this.getGridCellCoords(pointer!);
		if (gridCell !== null) {
			this.placeLetter(gridCell);
			return this.setDraggingOff(e);
		}
		const rackCEll: number | null = this.getRackCellCoords(pointer!);
		if (rackCEll !== null) {
			this.swapRack(rackCEll);
			return this.setDraggingOff(e);
		}
		return this.setDraggingOff(e);
	}

	render() {
		const draggedClass = this.state.isDragging ? "dragged" : "";

		return (
			<>
				{this.state.isDragging &&  <div id={`drag-${this.props.idx}`} className="s-grid-cell undragable"/> }
			<div 
				className={`dragableContainer ${draggedClass}`}
				onMouseDown={this.handleMouseDown}
				onTouchStart={this.handleTouchStart}
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

export default RackDraggable;
