import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";
import { useEffect, useState } from "react";
import {Modal, ModalText, ModalTitle, ModalFooter, ModalButton} from "../../../lib/Modal.tsx"
import { returnLetters } from "./LetterReturnButton.tsx";

function RerollButton() {
	const {t} = useTranslation("bot");
	const [modal, setModal] = useState<boolean>(false);
	const { players, setPlayers, gridLayers, setGridLayers } = useGrid();

	const rack = [...players.get(0)!.rack];

	const handleReroll = () => {
		returnLetters({setPlayers, gridLayers, setGridLayers});
		console.log("Reroll pressed");
	}

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
