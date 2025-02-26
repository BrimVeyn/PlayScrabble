import { createContext, useContext, useState, ReactNode } from "react";

const emptyGrid: Array<string> = [
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...........A...",
	"...........K...",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
	"...............",
];

// Define the context type
interface GridContextType {
  grid: Array<string>;
  setGrid: (grid: string[]) => void;
}

// Create the context with default values (to avoid errors before provider mounts)
const GridContext = createContext<GridContextType | undefined>(undefined);

// Custom hook to use the context
export const useGrid = () => {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error("useGrid must be used within a GridProvider");
  }
  return context;
};

// Context provider component
export const GridProvider = ({ children }: { children: ReactNode }) => {
	const [grid, setGrid] = useState<Array<string> >(emptyGrid);
	const [rack, setRack] = useState<string>("......A");
	const [cursor, setCursor] = useState<{ctx: string, cell: [number, number]} | null>(null);

  return (
    <GridContext.Provider value={{ grid, setGrid, rack, setRack, cursor, setCursor}}>
      {children}
    </GridContext.Provider>
  );
};
