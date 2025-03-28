import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { authFetch } from "../lib/authFetch";

interface AuthContextType {
	logged: boolean,
	setRefresh: React.Dispatch<React.SetStateAction<boolean>>,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within the AuthProvider");
	}
	return context;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [logged, setLogged] = useState<boolean>(false);
	const [refresh, setRefresh] = useState<boolean>(true);

	useEffect(() => {
		if (refresh == false) return ;

		authFetch("https://scrabble.brimveyn.dev/api/me", {
			method: 'GET',
			headers: {'Content-Type': 'application/json' },
		})
		.then(response => {
			if (!response.ok) {
				setLogged(false);
				throw new Error("[Auth]: Unknown user");
			}
			setLogged(true);
			console.info("[Auth]: Connected")
		})
		.catch((e) => console.info(e))
		setRefresh(false);
	}, [refresh]);

	return (
		<AuthContext.Provider value={{
			logged,
			setRefresh,
		}}>
			{children}
		</AuthContext.Provider>
	);
}
