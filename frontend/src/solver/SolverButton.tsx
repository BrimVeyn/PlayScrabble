import { useState } from 'react';
import { useGrid, letters } from './GridContext';
import './SolverButton.css';

export default function SolverButton() {
    const { grid, rack, setLastResults } = useGrid();
    const [loading, setLoading] = useState(false);

    const callSolver = async () => {
        if (![...rack].some(char => (letters.includes(char) || char == '?'))) return;
        setLoading(true);

        const lang = "FR";
        const gridNumbers = grid.map(row =>
            row.split('').map(char => (char === '.' ? 0 : char.charCodeAt(0)))
        );
        const sentRack = rack.replace(/\./g, "");
        const payload = { lang: lang, grid: gridNumbers, rack: sentRack };

        try {
            const response = await fetch(`http://localhost:8081/solve`, {
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
				joker: item[5],
				jokerPoses: item[6],
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
                {loading ? "Chargement..." : "Trouver les solutions"}
            </button>
        </div>
    );
}

