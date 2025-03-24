import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";
import { Modal, ModalButton, ModalFooter, ModalText, ModalTitle } from "../../../lib/Modal";
import { useState } from "react";

function PassButton() {
	const {t} = useTranslation("bot");
	const [modal, setModal] = useState<boolean>(false);
	const { setTurnChange, setGameInfo } = useGrid();

	const handlePass = () => {
		console.log("Pass pressed");
		setTurnChange(true);
		setGameInfo((prev) => ({...prev, playing: 1}));
	}

	return (
		<>
		<button 
			className="glass actionButton"
			onClick={() => setModal(true)}
		>
			{t("passButtonText")}
		</button>
		{ modal && (
			<Modal>
				<ModalTitle text={t("passModalConfirmTitle")}/>
				<ModalText text={t("passModalConfirmText")}/>
				<ModalFooter>
					<ModalButton text={t("no")} style={"modalButtonDeny"} callback={() => setModal(false)}/>
					<ModalButton text={t("yes")} style={"modalButtonAccept"} callback={() => {
							handlePass();
							setModal(false);
						}}/>
				</ModalFooter>

			</Modal>
		)}
		</>
	);
}

export default PassButton;
