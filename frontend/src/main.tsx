import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router'

import NotFound from './404/NotFound.tsx'
import Solver from './solver/Solver.tsx'

import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Solver />} />
				<Route path="*" element={<NotFound />} />
			</Routes>
		</BrowserRouter>
  </StrictMode>,
)
