import { useGrid } from "./GridContext"

function Score(){
	const { players } = useGrid();

	return (
		<>
		<span>You <b>{players.get(0)!.score}</b> - <b>{players.get(1)!.score}</b> AI</span>
		</>
	);
}

export default Score;
