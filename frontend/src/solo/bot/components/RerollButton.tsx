import { useTranslation } from "react-i18next";
import { refillRack, useGrid } from "./GridContext";
import { useState } from "react";
import {Modal, ModalText, ModalTitle, ModalFooter, ModalButton} from "../../../lib/Modal.tsx"
import { returnLetters } from "./LetterReturnButton.tsx";
import "../styles/RerollButton.css"
import { GameAction, letterScores } from "./GridContext.types.ts";
import { Button } from "../../../lib/Buttons.tsx";

interface VirtualRack {
	rack: string,
	selected: boolean[],
}

function RerollButton() {
	const {t} = useTranslation("bot");
	const [modal, setModal] = useState<boolean>(false);
	const { gameInfo, setTurnChange, setGameInfo, gridLayers, setGridLayers } = useGrid();
	const [virtRack, setVirtRack] = useState<VirtualRack | null>(null);

	const handleRerollClick = () => {
		//NOTE: Disable the button when its not your turn
		if (gameInfo.playing === 1) return ;

		const rack = returnLetters({gameInfo, setGameInfo, gridLayers, setGridLayers});
		setVirtRack({
			rack: rack,
			selected: Array(7).fill(false),
		});
		setModal(true);
	}

	const handleReroll = () => {
		const updatedPlayers = new Map(gameInfo.players);

		const newRack: string = updatedPlayers.get(0)!.rack.split("").map((letter, idx) =>
			virtRack?.selected[idx] ? "." : letter).join("");
		updatedPlayers.set(0, {...updatedPlayers.get(0)!, rack: newRack});

		const newPurse = Array.from(gameInfo.purse);
		for (let s = 0; s < 7; s++) {
			if (virtRack!.selected[s]) {
				newPurse.push(virtRack!.rack[s]);
			}
		}
		
		const [refilledRack, updatedPurse] = refillRack({key: 0, gameInfo, players: updatedPlayers});
		updatedPlayers.set(0, {...updatedPlayers.get(0)!, rack: refilledRack});

		setGameInfo((prev) => ({
			...prev,
			playing: 1,
			purse: updatedPurse,
			turnNo: prev.turnNo + 1,
			players: updatedPlayers,
		}));
		setModal(false);
		setTurnChange({action: GameAction.Rerolled, match: null});
	}

	const handleCellClick = (idx: number) => {
		const newSelection = [...virtRack!.selected];
		newSelection[idx] = !newSelection[idx];
		setVirtRack((prev) => ({...prev!, selected: newSelection}));
	}

	//TODO: Update dynamically from dict selection
	const letterScore = letterScores.get("FR")!.split(",");

	return (
		<>
		<Button
			text={t("rerollButtonText")}
			onClick={handleRerollClick}
		/>
		{ modal && (
			<Modal>
				<ModalTitle text={t("rerollModalConfirmTitle")}/>
				<ModalText text={t("rerollModalConfirmText")}/>
					<div className="virtRack">
						<div className="virtRackInner">
						{virtRack && virtRack.rack.split("").map((letter, idx) => {
							const fClass = letter === "." ? "empty" : "full";
							const hasScore = fClass === "full";
							const isJoker = letter === "?";
							const selectedClass = virtRack.selected[idx] ? "darkened" : "";
							return (
								<div 
									key={idx} 
									className={`s-grid-cell`}
									onClick={() => handleCellClick(idx)}
								>
									<span 
										className={`s-grid-tile ${fClass}  ${selectedClass}`}
										data-score={ (isJoker && "0" ) || (hasScore && letterScore[letter.charCodeAt(0) - 65])}
									>
										{letter}
									</span>
								</div>
							);
						})}
						</div>
					</div>
				<ModalFooter>
					<ModalButton text={t("goBack")} style={"modalButtonDeny"} callback={() => setModal(false)}/>
					<ModalButton text={t("confirm")} style={"modalButtonAccept"} callback={handleReroll}/>
				</ModalFooter>

			</Modal>
		)}
		</>
	);
}

export default RerollButton;
