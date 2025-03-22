import { Tooltip } from "react-tooltip"
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
					<p> Joker </p>
				</div>
			</Tooltip>
		</>
	)
}
