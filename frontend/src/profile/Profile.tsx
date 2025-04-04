import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Page from "../lib/Page";

import "./Profile.css"
import { authFetch } from "../auth/authFetch";
import { GameFetchType } from "../solo/bot/components/GridContext.types";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { FaEye } from "react-icons/fa";

function Profile () {
	const { logged, userInfo, setRefresh } = useAuth();
	const [gameHistory, setGameHistory] = useState<GameFetchType[] | null>(null);
	const { t } = useTranslation("profile");

	useEffect(() => {
		if (!logged) return ;
		setRefresh(true);
		authFetch("https://scrabble.brimveyn.dev/api/user/getGameHistory", {
			method: "GET",
		}).then(response => {
			if (!response.ok) throw new Error("/user/getGameHistory failed");
			return response.json();
		}).then(body => {
			const games = body as GameFetchType[];
			games.sort((a, b) => b.creation_time - a.creation_time);
			setGameHistory(games);
		}) .catch(e => console.error(e));
	}, [logged]);

	const rounded_average_spw = userInfo?.average_score_per_word.toFixed(2);
	const rounded_average_spg = userInfo?.average_score_per_game.toFixed(2);

	return (
		<Page id="profilePage">
			<div className="glass profileContentContainer">
				<p className="usernameP"> {userInfo?.username} </p>
				<div className="profileSection">
					<p className="profileSectionTitle">Stats</p>
					<p className="profileSectionField">{`Score moyen par mot: ${rounded_average_spw}`}</p>
					<p className="profileSectionField">{`Score moyen par partie: ${rounded_average_spg}`}</p>
					<p className="profileSectionField">{`Meilleur mot: ${userInfo?.best_word} - ${userInfo?.most_score_word}`}</p>
					<p className="profileSectionField">{`Meilleur score: ${userInfo?.most_score_game}`}</p>
					<p className="profileSectionField">{`Longest word: ${userInfo?.longest_word}`}</p>
					<p className="profileSectionField">{`Nombre de partie joue: ${userInfo?.games_played}`}</p>
				</div>
				<div className="profileSection">
					<p className="profileSectionTitle">Historique</p>
					{gameHistory ? (
						<div className="profileHistoryContainer">
						{gameHistory.map((game, idx) => {
							let status = (game.player_one_score > game.player_two_score) ? "win" : "lose";
							if (game.status === "abandoned") status = "abandoned"
							const date = dayjs.unix(Math.trunc(game.creation_time / 1_000_000)).format('DD-MM-YYYY HH:mm');
							return (
								<div key={idx} className="profileHistoryRow">
									<span data-result={status}>{t(status).toUpperCase()}</span>
									<span>{t(game.difficulty, {ns: "bot"})}</span>
									<span>{game.player_one_score} - {game.player_two_score}</span>
									<span>{game.dict}</span>
									<span>{date}</span>
									<p id="watchButtonOuter"><span id="watchButton"><FaEye/></span></p>
								</div>
							)
						})}
						</div>
					) : (
						<>
						</>
					)}
				</div>
			</div>
		</Page>
	)
}

export default Profile;
