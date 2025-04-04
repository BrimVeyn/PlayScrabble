import { TbMoneybag } from "react-icons/tb";
import "../styles/Purse.css"
import { Tooltip } from "react-tooltip";
import { useGrid } from "./GridContext";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../lib/Buttons";

const alphabet = "ABCDEFGHIJKLMONPQRSTUVWXYZ[";

function Purse() {
	const { gameInfo } = useGrid();
	const { t } = useTranslation("bot");
	const [content, setContent] = useState<Array<{key: string, value: number}>>([{key:"", value:0}]);

	useEffect(() => {
		const purseChar = gameInfo.purse.map(value => value.charCodeAt(0));
		const newContent = alphabet.split("").reduce<{key: string, value: number}[]>((acc, letter) => {
			const value = purseChar.reduce((sum, value) => (value === letter.charCodeAt(0) ? sum + 1 : sum), 0);
			if (value === 0) return acc; 
			acc.push({
				key: (letter === "[") ? "?" : letter,
				value: value,
			});
			return acc;
		}, []);
		//console.log(newContent);
		setContent(newContent);
	}, [gameInfo]);

	return (
		<>
			<Button size="sm">
				<p style={{ 
					height: "100%", width: "100%",
					position: "absolute", top: "0", left: "0"
				}} data-tooltip-id="purseTooltip"> </p>
				<TbMoneybag/>
			</Button>
			<Tooltip id="purseTooltip" className="purseTooltip">
				{content.length ? (
					<div className="purseTooltipContent">
						{content.map((o, idx) => (
							<p key={idx} className="purseItem">
								<span className="purseKey">{o.key}</span> : <span className="purseValue">{o.value}</span>
							</p>
						))}
					</div>
				) : <span>{t("pursePlaceholder")}</span>}
			</Tooltip>
		</>
	)
}


export default Purse;
