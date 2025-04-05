import { ReactNode, Component } from "react";
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
  visible: boolean;
  children: React.ReactNode;
  style?: string;
  onClose?: () => void;
}

interface ModalState {
  show: boolean;
  animationClass: string;
}

export class Modal extends Component<ModalProps, ModalState> {
	timeoutId: number | null = null;

	constructor(props: ModalProps) {
		super(props);
		this.state = {
			show: props.visible,
			animationClass: props.visible ? "fadeIn" : "",
		};
	}

	componentDidUpdate(prevProps: ModalProps) {
		if (prevProps.visible !== this.props.visible) {
			if (this.props.visible) {
				this.setState({ show: true, animationClass: "" }, () => {
					requestAnimationFrame(() => {
						this.setState({ animationClass: "fadeIn" });
					});
				});
			} else {
				this.setState({ animationClass: "fadeOut" });
				this.timeoutId = setTimeout(() => {
					this.setState({ show: false });
					if (this.props.onClose) this.props.onClose();
				}, 300); // Same as transition duration
			}
		}
	}

	componentWillUnmount() {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
	}

	render() {
		const { children, style = "" } = this.props;
		const { show, animationClass } = this.state;

		if (!show) return null;

		return (
			<div className={`modalBackground ${animationClass}`}>
				<div className="modalOuterContent">
					<div className={`modalInnerContent ${style}`}>
						{children}
					</div>
				</div>
			</div>
		);
	}
}

export default Modal;
