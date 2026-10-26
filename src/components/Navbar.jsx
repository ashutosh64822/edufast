import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function Navbar() {
  const { user, logout, cart, setCartOpen } = useApp()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', on); on()
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <Link to="/" className="logo">EDU<span>FAST</span><em>.</em></Link>
        <nav className={`nav-links ${open ? 'show' : ''}`}>
          <NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink>
          <NavLink to="/about" onClick={() => setOpen(false)}>About</NavLink>
          <NavLink to="/courses" onClick={() => setOpen(false)}>Courses</NavLink>
          <NavLink to="/contact" onClick={() => setOpen(false)}>Contact</NavLink>
          {user && <NavLink to="/my-learning" onClick={() => setOpen(false)}>My Learning</NavLink>}
          {user?.role === 'admin' && <NavLink to="/admin" onClick={() => setOpen(false)}>Admin 🛠️</NavLink>}
          <div className="nav-mobile-actions">
            {user
              ? <button className="btn btn-outline" onClick={() => { logout(); setOpen(false) }}>Logout</button>
              : <><Link className="btn btn-ghost" to="/login" onClick={() => setOpen(false)}>Log in</Link>
                 <Link className="btn btn-primary" to="/register" onClick={() => setOpen(false)}>Register</Link></>}
          </div>
        </nav>
        <div className="nav-actions">
          <button className="icon-btn" onClick={() => setCartOpen(true)} aria-label="Open cart">
            🛒{cart.length > 0 && <span className="badge">{cart.length}</span>}
          </button>
          {user ? (
            <div className="user-chip">
              <button className="avatar" onClick={() => navigate('/my-learning')} title={user.name}>{user.name.charAt(0).toUpperCase()}</button>
              <button className="btn btn-ghost hide-sm" onClick={logout}>Logout</button>
            </div>
          ) : (
            <>
              <Link className="btn btn-ghost hide-sm" to="/login">Log in</Link>
              <Link className="btn btn-primary hide-sm" to="/register">Register</Link>
            </>
          )}
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">{open ? '✕' : '☰'}</button>
        </div>
      </div>
    </header>
  )
}
