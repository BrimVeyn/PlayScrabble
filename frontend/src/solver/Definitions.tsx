import { useTranslation } from 'react-i18next';
import './styles/Definitions.css'

export default function Definitions() {
	const {t} = useTranslation("solver");

	return (
		<div className="defContainer">
			<div className="defHeader">
				<p>{t("defTableHead")}</p>
			</div>
			<div className="defContent">
				<p>{t("defTableEmpty")}</p>
			</div>
		</div>
	);
}
