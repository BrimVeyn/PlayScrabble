import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import navbarEn from "./locales/en/navbar.json"
import solverEn from "./locales/en/solver.json"
import letterEn from "./locales/en/letterScore.json"
import miscEn from "./locales/en/misc.json"
import landingEn from "./locales/en/landing.json"

import navbarFr from "./locales/fr/navbar.json"
import solverFr from "./locales/fr/solver.json"
import letterFr from "./locales/fr/letterScore.json"
import miscFr from "./locales/fr/misc.json"
import landingFr from "./locales/fr/landing.json"

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
				landing: landingEn
			},
			fr: {
				navbar: navbarFr,
				solver: solverFr,
				letterScore: letterFr,
				misc: miscFr,
				landing: landingFr
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
