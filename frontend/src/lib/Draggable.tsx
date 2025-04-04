import { ReactNode, Component, ContextType, ReactElement } from "react";
import { GridContext } from "../solo/bot/components/GridContext"
import { emptyGrid, } from "../solo/bot/components/GridContext.types";
import { updatePlayers, updatePlayersIdx, updateTile } from "../solo/bot/components/GridContextUtils";
import "./RackDraggable.css"

interface DraggableProps {
	children: ReactNode;
	char: string;
	col: number;
	row?: number;
	id: string,
	parentSelector: string;
}

interface DraggableState {
	x: number;
	y: number;
	isDragging: boolean;
	offsetX: number;
	offsetY: number;
}

abstract class Draggable extends Component<DraggableProps, DraggableState> {
	static contextType = GridContext;
	declare context: ContextType<typeof GridContext>;

	state = {
		x: 0,
		y: 0,
		isDragging: false,
		offsetX: 0, //NOTE: Used for touch handlers
		offsetY: 0, //NOTE: -----------------------
	}

	abstract onDragStart(e: TouchEvent | MouseEvent): void;
	abstract onDragMove(e: TouchEvent | MouseEvent): void;
	abstract onDragEnd(e: TouchEvent | MouseEvent): void;
	abstract render(): ReactElement<any>

	static collides(pointer: [number, number], rect: DOMRect): boolean {
		return (pointer[0] > rect.left && pointer[0] < rect.right && pointer[1] > rect.top && pointer[1] < rect.bottom)
	}

	static isTouchEvent(e: MouseEvent | TouchEvent): e is TouchEvent {
		return typeof TouchEvent !== 'undefined' && e instanceof TouchEvent;
	}

	static isMouseEvent(e: MouseEvent | TouchEvent): e is MouseEvent {
		return typeof MouseEvent !== 'undefined' && e instanceof MouseEvent;
	}

	static getRect(selector: string): DOMRect {
		const element = document.querySelector(selector);
		if (!element) {
			throw new Error("Element not found");
		}
		return element.getBoundingClientRect();
	}

	constructor(props: DraggableProps) {
		super(props);
		this.dragStart = this.dragStart.bind(this);
		this.dragMove = this.dragMove.bind(this);
		this.dragEnd = this.dragEnd.bind(this);
	}

	protected getPointer(e: TouchEvent | MouseEvent): [number, number] {
		if (Draggable.isTouchEvent(e)) {
			return [ e.changedTouches[0].clientX, e.changedTouches[0].clientY ];
		} else if (Draggable.isMouseEvent(e)) {
			return [e.clientX, e.clientY];
		}
		throw new Error("Event type not supported");
	}

	protected dragStart(e: React.MouseEvent | React.TouchEvent): void {
		e.preventDefault();

		//NOTE: Prevent draggable behavior when cursor is available, replaced by onClick in parent component
		if (this.context!.cursor)
			return;

		//HACK: Modifying zIndex so the tile can appear above the grid while being dragged;
		const grid = document.querySelector('.s-grid') as HTMLElement;
		grid.style.zIndex = "0";

		console.log(this.props.id);
		const currentElement = document.querySelector('#' + this.props.id) as HTMLElement;
		const currentRect = currentElement.getBoundingClientRect();
		const parentNode = document.querySelector(this.props.parentSelector) as HTMLElement;
		const parentRect = parentNode.getBoundingClientRect();
		
		let params = {} as {
			startX: number, startY: number,
			offsetX: number, offsetY: number,
			eventMove: 'touchmove' | 'mousemove', eventEnd: 'mouseup' | 'touchend', 
		};

		if (Draggable.isMouseEvent(e.nativeEvent)) {
			params.startX = e.nativeEvent.clientX - parentRect.left - (currentRect.width / 2);
			params.startY = e.nativeEvent.clientY - parentRect.top - (currentRect.height / 2);
			params.eventMove= 'mousemove'; params.eventEnd = 'mouseup';
		} else if (Draggable.isTouchEvent(e.nativeEvent)) {
			const touch = e.nativeEvent.touches[0];
			params.offsetY = parentRect.top + (currentRect.width / 2);
			params.offsetX = parentRect.left + (currentRect.height / 2);
			params.startX = touch.clientX - params.offsetX;
			params.startY = touch.clientY - params.offsetY;
			params.eventMove= 'touchmove'; params.eventEnd = 'touchend';
		} else {
			throw new Error("Event Type not supported");
		}

		this.setState({ x: params.startX, y: params.startY, isDragging: true, offsetX: params.offsetX, offsetY: params.offsetY});
		window.addEventListener(params.eventMove, this.dragMove, {passive: false});
		window.addEventListener(params.eventEnd, this.dragEnd, {passive: false});

		this.onDragStart(e.nativeEvent);
	}

	protected dragMove(e: TouchEvent | MouseEvent): void {
		e.preventDefault();
		if (!this.state.isDragging) 
			return;

		if (Draggable.isTouchEvent(e)) {
			this.setState((prev) => ({
				...prev,
				x: e.touches[0].clientX - prev.offsetX,
				y: e.touches[0].clientY - prev.offsetY,
			}));
		} else if (Draggable.isMouseEvent(e)) {
			this.setState((prev) => ({
				...prev,
				x: prev.x + e.movementX,
				y: prev.y + e.movementY,
			}));
		}
		this.onDragMove(e);
	}

	protected dragEnd(e: TouchEvent | MouseEvent): void {
		let moveEvent: 'touchmove' | 'mousemove';
		let endEvent: 'touchend' | 'mouseup';

		if (Draggable.isTouchEvent(e)) {
			moveEvent = 'touchmove';
			endEvent = 'touchend';
		} else if (Draggable.isMouseEvent(e)) {
			moveEvent = 'mousemove';
			endEvent = 'mouseup';
		} else {
			throw new Error("Event Type not supported");
		}
		window.removeEventListener(moveEvent!, this.dragMove);
		window.removeEventListener(endEvent!, this.dragEnd);
		this.setState({isDragging: false});

		this.onDragEnd(e);
	}

	gridToRack(): void {
		if (!this.props.row)
			throw new Error("row undefined");

		const retrieve = this.props.char;
		updatePlayers(this.context!.setGameInfo, ".", retrieve);
		this.context!.setGridLayers((prev) => {
			const newPending = prev.pendingGrid.map((row, rowI) => row.map((col, colI) => {
				if (rowI === this.props.row! && colI === this.props.col) return {value: ".", joker: false};
				return col;
			}))
			return {...prev, pendingGrid: newPending};
		});
	}

	rackToRack(pos: number): void {
		this.context!.setGameInfo((prev) => {
			const next = new Map(prev.players);
			let newRack: string = next.get(0)!.rack;
			newRack = newRack.split("").map((l, idx) => {
				if (idx === this.props.col) return newRack[pos];
				if (idx === pos) return newRack[this.props.col];
				return l;
			}).join("");

			next.set(0, {...next.get(0)!, rack: newRack});
			return {...prev, players: next };
		})
	}


	rackToGrid(pos: [number, number]) {
		const [row, col] = [pos[0], pos[1]];

		const isJoker = this.props.char === "?";
		//TODO: Joker handling
		if (isJoker) {
			this.context!.setJokerModal(true);
		}

		const pendingEmpty = (this.context!.gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (this.context!.gridLayers.grid[row][col].value === ".");
		this.context!.setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));

		if (!pendingEmpty) {
			const retrieve = this.context!.gridLayers.pendingGrid[row][col].joker ? "?" : this.context!.gridLayers.pendingGrid[row][col].value;
			updatePlayersIdx(this.context!.setGameInfo, this.props.col, retrieve);
			updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
		} else if (gridEmpty) {
			updateTile(this.context!.gridLayers.pendingGrid, pos, this.context!.setGridLayers, this.props.char, false);
			updatePlayersIdx(this.context!.setGameInfo, this.props.col, ".");
		}
	}

	gridToGrid (pos: [number, number]): void {
		const [row, col] = [pos[0], pos[1]];
		this.context!.setGridLayers((prev) => ({...prev, ghostGrid: emptyGrid}));

		const pendingEmpty = (this.context!.gridLayers.pendingGrid[row][col].value === ".");
		const gridEmpty = (this.context!.gridLayers.grid[row][col].value === ".");
		if (pendingEmpty && gridEmpty) {
			this.context!.setGridLayers((prev) => {
				const newPending = prev.pendingGrid.map((rowV, rowI) => rowV.map((colV, colI) => {
					if (rowI === this.props.row! && colI === this.props.col)
						return prev.pendingGrid[row][col];
					if (rowI === row && colI === col)
						return prev.pendingGrid[this.props.row!][this.props.col];
					return colV;
				}))
				return {...prev, pendingGrid: newPending};
			});
		}

	}

	getRackCollidingCell(e: MouseEvent | TouchEvent): number | null {
		const pointer = this.getPointer(e);
		const rackRect = Draggable.getRect('.rackContainer');
		const rackUnit = (rackRect.width / 7);

		if (!Draggable.collides(pointer, rackRect))
			return null;

		return Math.trunc((pointer[0] - rackRect.left) / rackUnit);
	}

	getGridCollidingCell(e: MouseEvent | TouchEvent): [number, number] | null {
		const pointer = this.getPointer(e);
		const gridRect = Draggable.getRect('.s-grid');
		const gridUnit = (gridRect.width / 15);

		if (!Draggable.collides(pointer, gridRect))
			return null;

		return [
			Math.trunc((pointer[1] - gridRect.top) / gridUnit),
			Math.trunc((pointer[0] - gridRect.left) / gridUnit),
		]
	}

}

export default Draggable;
