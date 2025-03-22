import { ReactNode } from "react";
import "./Modal.css"


interface ModalTitleProps {
	text: string
	style?: string
}

export function ModalTitle ({text, style=""}: ModalTitleProps) {
	return (
		<p className={`modalTitle ${style}`}>{text}</p>
	)
}

interface ModalTextProps {
	text: string
	style?: string
}

export function ModalText({text, style=""}: ModalTextProps) {
	return (
		<p className={`modalText ${style}`}>{text}</p>
	)
}

interface ModalFooterProps {
	children: ReactNode,
	style?: string,
}

export function ModalFooter({children, style=""}: ModalFooterProps) {
	return (
		<div className={`modalFooter ${style}`}>
			{children}
		</div>
	)
}

interface ModalButtonProps {
	text: string,
	style?: string,
	callback?: () => void;
}

export function ModalButton({text, style="", callback}: ModalButtonProps) {
	return (
		<button className={`modalButton ${style}`} onClick={callback} >
			{text}
		</button>
	)
}

interface ModalProps {
	children: ReactNode,
	style?: string,
}

export function Modal ({children, style=""}: ModalProps) {
	return (
		<div className="modalBackground">
			<div className="modalOuterContent">
				<div className={`modalInnerContent ${style}`}>
					{children}
				</div>
			</div>
		</div>
	)
}

export default Modal;
