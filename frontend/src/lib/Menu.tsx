import { useNavigate } from "react-router";
import { ReactNode } from "react";
import "./Menu.css"

interface MenuProps {
	children: ReactNode,
};

export function Menu({children}: MenuProps) {
	return (
		<div className="menu">
			{children}
		</div>
	);
}

interface MenuItemProps {
	text: string,
	redir: string | null,
};

export function MenuItem({text, redir}: MenuItemProps) {
	const navigate = useNavigate();

	return (
		<div 
			className="glass menuItem"
			onClick={() => {
				if (redir) navigate(redir);
			}}
		> 
			<p> {text} </p>
		</div>
	);
}
