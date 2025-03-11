import { useTranslation } from 'react-i18next';
import '../styles/Definitions.css'

interface DefinitionProps {
	definition: { word: string; def: string } | null;
}

export default function Definitions({definition}: DefinitionProps) {
	const {t} = useTranslation("solver");

	return (
		<div className="defContainer">
			<div className="defHeader">
				<p>{t("defTableHead")}</p>
			</div>
			<div className="defContent">
				<ul>
				{definition ? (
					definition.def.split("\n").map((line, idx) => (
						<li className="defRow" key={idx}>
							{line}
						</li>
					))
				) : (
					<p className="defPlaceholder">{t("defTableEmpty")}</p>
				)}
				</ul>
			</div>
		</div>
	);
}
