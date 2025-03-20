import { Tooltip } from "react-tooltip"
import { alphabet } from "./GridContext.types"
import "../styles/JokerTooltip.css"

export default function JokerToolTip() {

	return (
		<>
			<div id="clickable" data-tooltip-id='jokerTooltip'></div>
			<Tooltip
				id="jokerTooltip"
				isOpen={true}
				place="top"
				anchorSelect='#clickable'
				clickable
			>
				<div data-for="jokerTooltip" id="jokerTooltipContent">
					{alphabet.split("").map((letter: string) => (
						<div key={letter} className="jokerItem">{letter}</div>
					))}
				</div>
			</Tooltip>
		</>
	)
}
