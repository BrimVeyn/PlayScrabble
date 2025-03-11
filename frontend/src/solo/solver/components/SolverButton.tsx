import { useState } from 'react';
import { useGrid, letters } from './GridContext';
import { useTranslation } from 'react-i18next';

import '../styles/SolverButton.css';

export default function SolverButton() {
    const { grid, rack, setLastResults } = useGrid();
	const {t} = useTranslation("solver");
    const [loading, setLoading] = useState(false);

    const callSolver = async () => {
        if (![...rack].some(char => (letters.includes(char) || char == '?'))) return;
        setLoading(true);

        const lang = "FR"; //TODO: dynamically get locale
        const gridNumbers = grid.map(row =>
            row.split('').map(char => (char === '.' ? 0 : char.charCodeAt(0)))
        );
        const sentRack = rack.replace(/\./g, "");
        const payload = { lang: lang, grid: gridNumbers, rack: sentRack };
		localStorage.setItem("solverGridState", grid.flat().toString());

        try {
            const response = await fetch(`https://scrabble.brimveyn.dev/solver/solve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('Erreur serveur');

            const data = await response.json();
            const formattedData = data.map((item: any) => ({
                word: item[0],
                score: item[1],
                dir: item[2],
                pos: item[3],
                savedCoord: item[4],
				letterCount: item[5],
				joker: item[6],
				jokerPoses: item[7],
            }));
            setLastResults(formattedData);
        } catch (error) {
            console.error('Error calling solver:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="solverButtonContainer">
            <button onClick={callSolver} disabled={loading}>
                {loading ? t("resButtonLoading") : t("resButtonText")}
            </button>
        </div>
    );
}

