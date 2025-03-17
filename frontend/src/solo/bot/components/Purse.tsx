import { TbMoneybag } from "react-icons/tb";
import "../styles/Purse.css"
import { Tooltip } from "react-tooltip";
import { useGrid } from "./GridContext";
import { useEffect, useState } from "react";

function Purse() {
	const { playerInfo } = useGrid();
	const [content, setContent] = useState<string>("");

	useEffect(() => {
		const newContent = playerInfo.purse
			.map((value, index) => ({key: String.fromCharCode(index + 65), value: value}))
			.map(o => o.key + o.value + ',')
			.join("");
		setContent(newContent);
	}, [playerInfo]);

	return (
		<>
			<button 
				className="glass purseButton"
				data-tooltip-id="purseTooltip"
				data-tooltip-content={content}
			>
				<TbMoneybag/>
			</button>
			<Tooltip 
				id="purseTooltip"
				className="purseTooltip"
			/>
		</>
	)
}


export default Purse;
