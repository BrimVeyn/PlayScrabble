import { ReactNode, ChangeEvent, FormEventHandler, FormEvent } from "react"
import "./Form.css"


interface FormProps {
	children: ReactNode,
	style?: string,
	submitFn?: FormEventHandler<HTMLFormElement>,
}

export function Form(
	{
		children,
		style = "",
		submitFn = (e: FormEvent) => { e.preventDefault(); },
	}: FormProps
) {
	return (
		<form onSubmit={submitFn} className={`form ${style}`}>
			{children}
		</form>
	)
}

interface FormFieldProps {
	inputType?: string,
	inputPlaceHolder?: string,
	text: string,
	onChangeCallback?: (e: ChangeEvent<HTMLInputElement>) => void,
}

export function FormField (
	{
		inputType = "text",
		inputPlaceHolder = "",
		text,
		onChangeCallback = (_e: ChangeEvent<HTMLInputElement>) => {}
	}: FormFieldProps
) {
	return (
		<>
			<p className="formFieldText"> {text} </p>
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
