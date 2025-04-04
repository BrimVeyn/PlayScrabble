import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import navbarEn from "./locales/en/navbar.json"
import solverEn from "./locales/en/solver.json"
import miscEn from "./locales/en/misc.json"
import landingEn from "./locales/en/landing.json"
import loginEn from "./locales/en/login.json"
import botEn from "./locales/en/bot.json"
import registerEn from "./locales/en/register.json"
import profileEn from "./locales/en/profile.json"

import navbarFr from "./locales/fr/navbar.json"
import solverFr from "./locales/fr/solver.json"
import miscFr from "./locales/fr/misc.json"
import landingFr from "./locales/fr/landing.json"
import loginFr from "./locales/fr/login.json"
import botFr from "./locales/fr/bot.json"
import registerFr from "./locales/fr/register.json"
import profileFr from "./locales/fr/profile.json"

i18n
	.use(initReactI18next) 
	.use(LanguageDetector)
	.init({
		resources: {
			en: {
				navbar: navbarEn,
				solver: solverEn,
				misc: miscEn,
				landing: landingEn,
				login: loginEn,
				bot: botEn,
				register: registerEn,
				profile: profileEn,
			},
			fr: {
				navbar: navbarFr,
				solver: solverFr,
				misc: miscFr,
				landing: landingFr,
				login: loginFr,
				bot: botFr,
				register: registerFr,
				profile: profileFr,
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
