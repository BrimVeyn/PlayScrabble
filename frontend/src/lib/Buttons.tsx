import { ReactNode } from "react"
import "./Buttons.css"

interface ButtonProps {
	text?: string,
	style?: string,
	onClick?: () => void,
	size?: "sm" | "md" | "xl",
	children?: ReactNode,
};

export function Button({text, style="", onClick, children, size = "md"}: ButtonProps) {
	const sizeClass = (size === "md") ? "size-md" : (size === "sm") ? "size-sm" : "size-xl";
	return (
		<button 
			className={`glass button ${sizeClass} font-noto ${style}`}
			onClick={onClick}
		>
			{text}
			{children}
		</button>
	)
}
