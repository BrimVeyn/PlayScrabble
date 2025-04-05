import { useState } from "react";
import { Button } from "../../../lib/Buttons";
import { Modal, ModalText, ModalTitle, ModalFooter, ModalButton } from "../../../lib/Modal"
import { useTranslation } from "react-i18next";
import { useGrid } from "./GridContext";
import { authFetch } from "../../../auth/authFetch";
import { GameUpdatePayloadType } from "./GridContext.types";

function AbandonButton () {
	const [modal, setModal] = useState<boolean>(false);
	const { t } = useTranslation("bot")
	const { gameInfo } = useGrid();

	const handleAbandon = () => {
		if (!gameInfo.gameOptions.id) throw new Error("[ABANDON]: Game id undefined.");

		const payload: GameUpdatePayloadType = {
			id: gameInfo.gameOptions.id!,
			status: "abandoned",
			states: btoa(JSON.stringify(gameInfo.gameOptions.state)),
			player_one_score: gameInfo.players.get(0)!.score,
			player_two_score: gameInfo.players.get(1)!.score,
			last_played_word: null,
		}
		authFetch("https://scrabble.brimveyn.dev/api/updateGame", {
			method: "POST",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		}).then(response => {
			if (!response.ok) throw new Error("[ABANDON]: Update failed");
		}).catch(e => console.log(e));

		setModal(false);
	}

	return (
		<>
		<Button 
			text="Abandon"
			onClick={() => setModal(true)}
		/>
		<Modal visible={modal}>
			<ModalTitle text={t("abandonModalConfirmTitle")}/>
			<ModalText text={t("abandonModalConfirmText")}/>
			<ModalFooter>
				<ModalButton text={t("no")} style={"modalButtonDeny"} callback={() => setModal(false)}/>
				<ModalButton text={t("yes")} style={"modalButtonAccept"} callback={() =>  handleAbandon()}/>
			</ModalFooter>

		</Modal>
		</>
	)
}


export default AbandonButton;
