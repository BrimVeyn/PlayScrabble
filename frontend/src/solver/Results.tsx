import SolverButton from "./SolverButton";

import "./Results.css"

function Results() {
	return (
		<>
			<div className="tableHeader">
				<table>
					<tr>
						<th>Word</th>
						<th>Score</th>
					</tr>
					<SolverButton/>
				</table>

			</div>
		</>
	)
}

export default Results;
