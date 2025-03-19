import { TbMoneybag } from "react-icons/tb";
import "../styles/Purse.css"
import { Tooltip } from "react-tooltip";
import { useGrid } from "./GridContext";
import { useEffect, useState } from "react";

const alphabet = "ABCDEFGHIJKLMONPQRSTUVWXYZ";

function Purse() {
	const { gameInfo } = useGrid();
	const [content, setContent] = useState<Array<{key: string, value: number}>>([{key:"", value:0}]);

	useEffect(() => {
		const purseChar = gameInfo.purse.map(value => value.charCodeAt(0));
		const newContent = alphabet.split("").map((letter) => {
			return {
				key: letter,
				value: purseChar.reduce((sum, value) => (value === letter.charCodeAt(0) ? sum + 1 : sum), 0),
			}
		});
		setContent(newContent);
	}, [gameInfo]);

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
