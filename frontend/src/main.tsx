import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'

import NotFound from './404/NotFound.tsx'
import Solver from './solver/Solver.tsx'
import Landing from './landing/Landing.tsx'
import Solo from './landing/Solo.tsx'

import './index.css'
import './i18n.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Landing />} />
				<Route path="/solo/solver" element={<Solver />} />
				<Route path="/solo" element={<Solo />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
  </StrictMode>,
)
