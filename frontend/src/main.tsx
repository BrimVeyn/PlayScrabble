import { createRoot } from 'react-dom/client'
import { AuthProvider } from './auth/AuthContext.tsx'
import { BrowserRouter, Routes, Route } from 'react-router'

import Landing from './landing/Landing.tsx'

import Solver from './solo/solver/Solver.tsx'
import Bot from './solo/bot/Bot.tsx'

import Solo from './landing/Solo.tsx'
import NotFound from './404/NotFound.tsx'

import Login from './login/login.tsx'
import Register from './register/register.tsx'

import './index.css'
import './i18n.jsx'

createRoot(document.getElementById('root')!).render(
  //<StrictMode>
	<AuthProvider>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Landing />} />
				<Route path="/solo" element={<Solo />} />
				<Route path="/solo/solver" element={<Solver />} />
				<Route path="/solo/bot" element={<Bot/>} />
				<Route path="/login" element={<Login/>} />
				<Route path="/register" element={<Register/> } />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
	</AuthProvider>
  //</StrictMode>,
)
