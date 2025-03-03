import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'

import NotFound from './404/NotFound.tsx'
import Solver from './solver/Solver.tsx'

import './index.css'
import './i18n.jsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Solver />} />
				<Route path="/404" element={<NotFound />} />
				<Route path="*" element={<Navigate to="/404" />} />
			</Routes>
			<Routes>
			</Routes>
		</BrowserRouter>
  </StrictMode>,
)
