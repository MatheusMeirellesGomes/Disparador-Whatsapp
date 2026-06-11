import { Routes, Route, NavLink } from 'react-router-dom'
import Contatos from './pages/Contatos'
import Campanhas from './pages/Campanhas'
import Fluxos from './pages/Fluxos'

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <h1>📱 Disparador</h1>
        <NavLink to="/contatos" className={({ isActive }) => isActive ? 'active' : ''}>
          Contatos
        </NavLink>
        <NavLink to="/campanhas" className={({ isActive }) => isActive ? 'active' : ''}>
          Campanhas
        </NavLink>
        <NavLink to="/fluxos" className={({ isActive }) => isActive ? 'active' : ''}>
          Fluxos
        </NavLink>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Contatos />} />
          <Route path="/contatos" element={<Contatos />} />
          <Route path="/campanhas" element={<Campanhas />} />
          <Route path="/fluxos" element={<Fluxos />} />
        </Routes>
      </main>
    </div>
  )
}
