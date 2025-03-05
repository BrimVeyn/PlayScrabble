import React, { useEffect, useState } from "react";
import { useGrid } from "./GridContext";
import "./styles/Rack.css"
import "./styles/Grid.css"
import { useTranslation } from "react-i18next";

function MobileRack() {
	const [isInvalid, setIsInvalid] = useState<boolean>(false);
	const {rack, setRack} = useGrid();
	const {t} = useTranslation("solver");

	useEffect(() => {
		console.log(rack);
	}, [rack]);

	const handeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key == "Enter") {
			e.currentTarget.blur();
		}
	}

	const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.currentTarget.value.length > 7) {
			setIsInvalid(true);
		} else {
			setIsInvalid(false);
			const filteredValue = e.currentTarget.value.toUpperCase().split("").filter((char) => char >= 'A' && char <= 'Z').join();
			setRack(filteredValue);
		}
	}

	return (
		<>
		<div className="rackContainer">
			<input 
				className="rackInput" 
				type="text"
				onChange={(e) => handleTyping(e)}
				onKeyDown={(e) => handeKeyDown(e)}
				placeholder="LETTRES"
			/> 
		</div>
		{isInvalid ? 
			<div className="rackError">
				<p>{t("rackErrorMessage")}</p>
			</div>
		: 
			<></>}
		</>
	);
}

function DesktopRack () {
	const {rack, cursor, setCursor, handleKeyDown} = useGrid();
	const {t} = useTranslation("letterScore");

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleKeyDown]);

	return (
		<div className="rackContainer">
		{rack.split('').map((letter, idx) => {
			const fClass:string = (letter == '.') ? "empty" : "full";
			const hasScore: boolean = (letter !== '.');
			const isSelected = (cursor && cursor.ctx === "rack" && cursor.cell[1] == idx);

			return (
				<div className="s-grid-cell" key={idx}
				onClick={() => {
					setCursor({ctx: "rack", cell: [0, idx], direction: "right"});
				}}
				> 
				<p className={`s-grid-tile ${fClass}`}> 
				{letter}
				</p>
				{ isSelected && <p className="selected"></p> }
				{ hasScore && 
					<p className="score">
				{t("letterScore").split(",")[letter.charCodeAt(0) - 65]}
				</p>
				}
				</div>
			)
		})}
		</div>
	);
}

export default function Rack() {
	const isMobile = window.matchMedia("(max-width: 768px)").matches;

	return (
		isMobile ?
			<MobileRack/> 
		:
			<DesktopRack/>
	);
}
