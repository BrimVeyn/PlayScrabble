import { useGrid } from "./GridContext"

function Score(){
	const { gameInfo } = useGrid();

	return (
		<>
		<span>You <b>{gameInfo.players.get(0)!.score}</b> - <b>{gameInfo.players.get(1)!.score}</b> AI</span>
		</>
	);
}

export default Score;
