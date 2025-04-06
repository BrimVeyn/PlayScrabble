import { useNavigate } from "react-router";
import { ReactNode } from "react";
import "./Menu.css"

interface MenuProps {
	children: ReactNode,
	style?: string,
};

export function Menu({children, style = ""}: MenuProps) {
	return (
		<div className={`menu ${style}`}>
			{children}
		</div>
	);
}

interface MenuItemProps {
	text: string,
	redir?: string | null,
	style?: string,
	id?: string,
};

export function MenuItem({text, redir = null, style = "", id}: MenuItemProps) {
	const navigate = useNavigate();

	return (
		<div 
			className={`glass menuItem ${style}`}
			id={id}
			onClick={() => {
				if (redir) navigate(redir);
			}}
		> 
			<p> {text} </p>
		</div>
	);
}
