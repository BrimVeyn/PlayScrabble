import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { authFetch } from "../auth/authFetch"

interface AuthContextType {
	logged: boolean,
	setRefresh: React.Dispatch<React.SetStateAction<boolean>>,
	userInfo: UserInfo | null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within the AuthProvider");
	}
	return context;
}

export type UserInfo = {
	id: number,
	username: string,
	email: string,
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const [logged, setLogged] = useState<boolean>(false);
	const [refresh, setRefresh] = useState<boolean>(true);
	const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

	useEffect(() => {
		if (refresh == false) return ;

		authFetch("https://scrabble.brimveyn.dev/api/me", {
			method: 'GET',
			headers: {'Content-Type': 'application/json' },
		})
		.then(response => {
			if (!response.ok) {
				setUserInfo(null);
				setLogged(false);
				throw new Error("[Auth]: Unknown user");
			}
			return response.json();
		})
		.then((body) =>  {
			setUserInfo(body)
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
			userInfo,
		}}>
			{children}
		</AuthContext.Provider>
	);
}
