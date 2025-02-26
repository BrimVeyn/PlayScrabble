import { useState } from 'react';

interface RackProps {
	rack: string
	setRack: React.Dispatch<React.SetStateAction<string>>;
}

export default function Rack({rack, setRack}: RackProps) {
	return (
		<h1> Rack lol </h1>
	);
}
