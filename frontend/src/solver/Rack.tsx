import { useGrid } from "./GridContext";
import "./Rack.css"

export default function Rack() {
	const {rack, setRack} = useGrid();

	return (
		<>
			<div className="rackContainer">
				{rack.split('').map((letter, idx) => (
					<div key={letter + idx} className='rack-cell'>
						<p key={idx} className='rack-cell'> 
							{letter}
						</p>
					</div>
				))}
			</div>
		</>
	);
}
