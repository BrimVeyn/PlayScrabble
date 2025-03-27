import Draggable from "./Draggable";
import { ReactElement } from "react";
import "./RackDraggable.css"

class RackDraggable extends Draggable {

	onDragMove(_e: TouchEvent | MouseEvent): void {}
	onDragStart(_e: TouchEvent | MouseEvent): void {}

	onDragEnd(e: TouchEvent | MouseEvent): void {
		const grid = document.querySelector('.s-grid') as HTMLElement;
		grid.style.zIndex = "1";

		const gridCell: [number, number] | null = this.getGridCollidingCell(e);
		if (gridCell !== null)
			return this.rackToGrid(gridCell);

		const rackCell: number | null = this.getRackCollidingCell(e);
		if (rackCell !== null)
			return this.rackToRack(rackCell);
	}

	render(): ReactElement<any> {
		const draggedClass = this.state.isDragging ? "dragged" : "";
		return (
			<>
				{this.state.isDragging &&  <div id={this.props.id} className="s-grid-cell undragable"/> }
			<div 
				className={`dragableContainer ${draggedClass}`}
				onMouseDown={this.dragStart}
				onTouchStart={this.dragStart}
				id={this.props.id}
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
