import { useNavigate } from "react-router";
import Navbar from "../navbar/Navbar";

export default function Solo() {
	const navigate = useNavigate();

	return (
		<>
		<Navbar/>
		<div className="soloContainer">
			<button onClick={() => navigate("/solo/solver")}>
				Solver
			</button>
		</div>
		</>
	);
}
