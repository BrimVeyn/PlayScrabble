import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import navbarEn from "./locales/en/navbar.json"
import solverEn from "./locales/en/solver.json"
import letterEn from "./locales/en/letterScore.json"
import miscEn from "./locales/en/misc.json"
import landingEn from "./locales/en/landing.json"
import loginEn from "./locales/en/login.json"
import botEn from "./locales/en/bot.json"

import navbarFr from "./locales/fr/navbar.json"
import solverFr from "./locales/fr/solver.json"
import letterFr from "./locales/fr/letterScore.json"
import miscFr from "./locales/fr/misc.json"
import landingFr from "./locales/fr/landing.json"
import loginFr from "./locales/fr/login.json"
import botFr from "./locales/fr/bot.json"

i18n
	.use(initReactI18next) 
	.use(LanguageDetector)
	.init({
		resources: {
			en: {
				navbar: navbarEn,
				solver: solverEn,
				letterScore: letterEn,
				misc: miscEn,
				landing: landingEn,
				login: loginEn,
				bot: botEn
			},
			fr: {
				navbar: navbarFr,
				solver: solverFr,
				letterScore: letterFr,
				misc: miscFr,
				landing: landingFr,
				login: loginFr,
				bot: botFr
			},
		},
		detection: {
			order: ["localStorage", "navigator"], 
			caches: ["localStorage"], 
		},
		fallbackLng: "fr",
		interpolation: { escapeValue: false }
	});

export default i18n;
