import { TbMoneybag } from "react-icons/tb";
import "../styles/Purse.css"
import { Tooltip } from "react-tooltip";
import { useGrid } from "./GridContext";
import { useEffect, useState } from "react";

function Purse() {
	const { playerInfo } = useGrid();
	const [content, setContent] = useState<Array<{key: string, value: number}>>([{key:"", value:0}]);

	useEffect(() => {
		const newContent = playerInfo.purse
			.map((value, index) => ({key: String.fromCharCode(index + 65), value: value}))
		setContent(newContent);
	}, [playerInfo]);

	return (
		<>
			<button 
				className="glass purseButton"
				data-tooltip-id="purseTooltip"
			>
				<TbMoneybag/>
			</button>
			<Tooltip id="purseTooltip"
				className="purseTooltip"
			>
				<div className="purseTooltipContent">
					{content.map((o, idx) => (
						<p key={idx} className="purseItem">
							<span className="purseKey">{o.key}</span>
							:
							<span className="purseValue">{o.value}</span>
						</p>
					))}
				</div>
			</Tooltip>
		</>
	)
}


export default Purse;
