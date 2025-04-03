import { ReactNode } from "react";
import Navbar from "../navbar/Navbar";

interface PageProps {
	children: ReactNode,
	id: string,
}

function Page ({children, id}: PageProps) {
	return (
		<div 
			style={{
				height: "100vh",
				width: "100vw",
			}}
		>
			<Navbar/>
			<div id={id} style={{
				width: "100vw",
				height: "95%",
			}}>
			{children}
			</div>
		</div>
	)
}

export default Page;
