import { useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Contatos from './pages/Contatos'
import Campanhas from './pages/Campanhas'
import Fluxos from './pages/Fluxos'

export default function App() {
  const [email, setEmail] = useState<string | null>(localStorage.getItem('email'))

  function handleLogin(emailUsuario: string) {
    setEmail(emailUsuario)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('email')
    setEmail(null)
  }

  if (!email) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>📱 Dispar<span>ador</span></h1>
          <p className="sidebar-user">👤 {email}</p>
        </div>
        <p className="sidebar-subtitle">Menu</p>
        <NavLink to="/contatos" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="sidebar-icon">👥</span> Contatos
        </NavLink>
        <NavLink to="/campanhas" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="sidebar-icon">📣</span> Campanhas
        </NavLink>
        <NavLink to="/fluxos" className={({ isActive }) => isActive ? 'active' : ''}>
          <span className="sidebar-icon">🔄</span> Fluxos
        </NavLink>

        <div className="sidebar-bottom">
          <button className="sidebar-logout" onClick={handleLogout}>
            🚪 Sair
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate to="/contatos" />} />
          <Route path="/contatos" element={<Contatos />} />
          <Route path="/campanhas" element={<Campanhas />} />
          <Route path="/fluxos" element={<Fluxos />} />
        </Routes>
      </main>
    </div>
  )
}
