import { ReactElement } from "react";
import Draggable from "./Draggable";
import "./GridDraggable.css"

class GridDraggable extends Draggable {

	onDragMove(_e: TouchEvent | MouseEvent): void {}
	onDragStart(_e: TouchEvent | MouseEvent): void {}

	onDragEnd(e: TouchEvent | MouseEvent): void {
		const gridCell: [number, number] | null = this.getGridCollidingCell(e);
		if (gridCell !== null)
			return this.gridToGrid(gridCell);

		this.gridToRack();
	}

	render(): ReactElement<any> {
		const draggedClass = this.state.isDragging ? "gridDragged" : "";
		return (
			<>
				{this.state.isDragging &&  
					<div id={this.props.id} className="s-grid-cell undraggable"/>
				}
				<div 
					className={`gridDraggableContainer ${draggedClass}`}
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

export default GridDraggable;
