import { ReactNode, ChangeEvent } from "react"
import "./Form.css"


interface FormProps {
	children: ReactNode,
	style?: string
}

export function Form({children, style = ""}: FormProps) {
	return (
		<div className={`form ${style}`}>
			{children}
		</div>
	)
}

interface FormFieldProps {
	inputType?: string,
	inputPlaceHolder?: string,
	text: string,
	onChangeCallback?: (e: ChangeEvent<HTMLInputElement>) => void,
}

export function FormField ({
		inputType = "text",
		inputPlaceHolder = "",
		text,
		onChangeCallback = (_e: ChangeEvent<HTMLInputElement>) => {}
}: FormFieldProps ) {
	return (
		<>
			<p className="formFielText"> {text} </p>
			<input 
				className="formFieldInput" 
				type={inputType} 
				placeholder={inputPlaceHolder}
				onChange={(e) => onChangeCallback(e)}
			/>
		</>
	)
}

interface FormButtonProps {
	text: string,
	style?: string,
	callback: () => void,
};

export function FormButton({text, style = "", callback}: FormButtonProps) {
	return (
		<div className="formRow">
			<button 
				className={`formButton ${style}`}
				onClick={callback}
			> 
				{text} 
			</button>
		</div>
	)
}

interface FormErrorProps {
	text: string
}

export function FormError({text = ""}: FormErrorProps) {
	const show = text === "" ? "hidden" : "";
	return (
		<div className={`${show} formRow`}>
			<p className="formError">{text}</p>
		</div>
	)
}
