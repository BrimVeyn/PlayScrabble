import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";
import { Modal, ModalButton, ModalFooter, ModalText, ModalTitle } from "../../../lib/Modal";
import { useState } from "react";
import { GameAction } from "./GridContext.types";
import { Button } from "../../../lib/Buttons";

function PassButton() {
	const {t} = useTranslation("bot");
	const [modal, setModal] = useState<boolean>(false);
	const { gameInfo, setTurnChange, setGameInfo } = useGrid();

	const handlePass = () => {
		//NOTE: Disables the button when its not your turn
		if (gameInfo.playing === 1) return ;

		setGameInfo((prev) => ({
			...prev,
			playing: 1,
			turnNo: prev.turnNo + 1
		}));
		setTurnChange({action: GameAction.Passed, match: null});
	}

	return (
		<>
			<Button
				text={t("passButtonText")}
				onClick={() => setModal(true)}
			/>
			<Modal visible={modal}>
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
		</>
	);
}

export default PassButton;
