import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";
import { useEffect, useState } from "react";
import {Modal, ModalText, ModalTitle, ModalFooter, ModalButton} from "../../../lib/Modal.tsx"
import { returnLetters } from "./LetterReturnButton.tsx";
import "../styles/RerollButton.css"

type VirtualRack = {
	vOne: string,
	vTwo: string,
};

function RerollButton() {
	const {t} = useTranslation("bot");
	const [modal, setModal] = useState<boolean>(false);
	const { players, setPlayers, gridLayers, setGridLayers } = useGrid();
	const [virtRack, setVirtRack] = useState<VirtualRack | null>(null);

	useEffect(() => {
		setVirtRack({ vOne: players.get(0)!.rack, vTwo: players.get(0)!.rack })
	}, [])

	const handleReroll = () => {
		returnLetters({setPlayers, gridLayers, setGridLayers});
		console.log("Reroll pressed");
	}

	const handleLeftClick = () => {

	}

	const letterScores = t("letterScore", {ns: "letterScore"}).split(",");

	return (
		<>
		<button 
			className="glass actionButton"
			onClick={() => setModal(true)}
		>
			{t("rerollButtonText")}
		</button>
		{ modal && (
			<Modal>
				<ModalTitle text={t("rerollModalConfirmTitle")}/>
				<ModalText text={t("rerollModalConfirmText")}/>
					<div className="virtRack">
						{virtRack && virtRack.vOne.split("").map((letter, idx) => {
							const fClass = letter === "." ? "empty" : "full";
							const hasScore = fClass === "full";
							const isJoker = letter === "?";
							return (
								<div 
									key={idx} 
									className="s-grid-cell"
									onClick={() => handleLeftClick()}
								>
									<span 
										className={`s-grid-tile ${fClass}`}
										data-score={ (isJoker && "0" ) || (hasScore && letterScores[letter.charCodeAt(0) - 65])}
									>
										{letter}
									</span>
								</div>
							);
						})}
					</div>
				<ModalFooter>
					<ModalButton text={t("goBack")} style={"modalButtonDeny"} callback={() => setModal(false)}/>
					<ModalButton text={t("confirm")} style={"modalButtonAccept"} callback={() => {
							handleReroll();
							setModal(false);
						}}/>
				</ModalFooter>

			</Modal>
		)}
		</>
	);
}

export default RerollButton;
