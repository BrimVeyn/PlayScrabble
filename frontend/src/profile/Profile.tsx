import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import Page from "../lib/Page";

import "./Profile.css"
import { authFetch } from "../auth/authFetch";

function Profile () {
	const { userInfo, setRefresh } = useAuth();
	const [gameHistory, setGameHistory] = useState();

	useEffect(() => {
		setRefresh(true);
		authFetch("https://scrabble.brimveyn.dev/api/user/getGameHistory", {
			method: "GET",
		}).then(response => {
			if (!response.ok) throw new Error("/user/getGameHistory failed");
			return response.json();
		}).then(body => setGameHistory(body))
		.catch(e => console.error(e));
	}, []);

	useEffect(() => {
		console.log(userInfo);
	}, [userInfo])

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
				<div className="profileSectionTitle">
					<p className="sectionTitle">Historique</p>
				</div>
			</div>
		</Page>
	)
}

export default Profile;
