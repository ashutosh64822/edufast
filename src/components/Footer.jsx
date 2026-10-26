import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'
import { api } from '../lib/api.js'

export default function Footer() {
  const [email, setEmail] = useState('')
  const { toast, backendOnline } = useApp()
  const subscribe = async (e) => {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Please enter a valid email address'); return }
    try { await api('/api/newsletter', { method: 'POST', body: { email }, auth: false }); toast('Subscribed! Welcome to the EduFast newsletter 🎉'); setEmail('') }
    catch (err2) { toast(err2.message) }
  }
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link to="/" className="logo light">EDU<span>FAST</span><em>.</em></Link>
          <p>World-class training and development programs developed by top teachers. Start a better life from here.</p>
          <p className="footer-contact">📍 Banani, Dhaka 1213, Bangladesh<br />📧 hello@edufast.com<br />📞 +880 1700-000000</p>
          <div className="socials">
            <a href="#" aria-label="Facebook">f</a><a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="Twitter / X">𝕏</a><a href="#" aria-label="YouTube">▶</a><a href="#" aria-label="Instagram">◎</a>
          </div>
        </div>
        <div>
          <h4>Online Platform</h4>
          <Link to="/about">About</Link><Link to="/courses">Courses</Link>
          <Link to="/about#instructors">Instructors</Link><Link to="/#events">Events</Link>
          <Link to="/my-learning">My Learning</Link>
        </div>
        <div>
          <h4>Links</h4>
          <Link to="/contact">Contact Us</Link><Link to="/about">Our Story</Link>
          <Link to="/courses">News and Articles</Link><Link to="/contact#faq">FAQ's</Link>
          <Link to="/register">Sign in / Registration</Link>
        </div>
        <div>
          <h4>Newsletter</h4>
          <p>Enter your email address to register to our newsletter subscription.</p>
          <form className="newsletter" onSubmit={subscribe}>
            <input type="email" placeholder="Enter Email..." value={email} onChange={e => setEmail(e.target.value)} aria-label="Email address" />
            <button className="btn btn-primary" type="submit">Subscribe</button>
          </form>
          <p className="pay-note">We accept 💳 Cards · bKash · Nagad · Rocket</p>
        </div>
      </div>
      <div className="footer-bottom"><div className="container">© {new Date().getFullYear()} EduFast. All rights reserved. Made with ❤️ in Dhaka. · <span className="api-status">{backendOnline ? '🟢 Server connected' : backendOnline === false ? '🔴 Server offline' : '🟡 Connecting…'}</span></div></div>
    </footer>
  )
}
