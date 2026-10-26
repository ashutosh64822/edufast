import { useEffect, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import CartDrawer from './components/CartDrawer.jsx'
import Footer from './components/Footer.jsx'
import Navbar from './components/Navbar.jsx'
import About from './pages/About.jsx'
import Auth from './pages/Auth.jsx'
import Contact from './pages/Contact.jsx'
import CourseDetail from './pages/CourseDetail.jsx'
import Courses from './pages/Courses.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Home from './pages/Home.jsx'

function ScrollTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) { const el = document.querySelector(hash); if (el) { el.scrollIntoView({ behavior: 'smooth' }); return } }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

/* Scroll animations for the whole site:
   - reading progress bar, back-to-top button
   - auto scroll-reveal on cards / headings / blocks (staggered, works on every page) */
const REVEAL_SELECTOR = [
  'h2.serif', '.eyebrow', '.feature', '.cat-card', '.course-card', '.instructor',
  '.event-card', '.value-card', '.info-card', '.step', '.tl-item', '.learning-card',
  '.teacher-card', '.about-copy', '.about-visual', '.form-card', '.auth-side',
  '.stat', '.testimonial-box', '.buy-card', '.outcomes', '.accordion', '.map-card',
  '.dash-stats > div',
].join(',')

function ScrollFX() {
  const { pathname } = useLocation()
  const [progress, setProgress] = useState(0)
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setProgress(max > 0 ? h.scrollTop / max : 0)
      setShowTop(h.scrollTop > 600)
    }
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return
        const el = e.target
        el.classList.add('in-view'); io.unobserve(el)
        // after the reveal finishes, hand transform control back to hover effects
        setTimeout(() => {
          el.style.transitionDelay = ''
          if (el.tagName !== 'H2') el.classList.remove('fx-reveal', 'fx-zoom', 'fx-left', 'fx-right', 'in-view')
        }, 1450)
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })

    const tag = () => {
      document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        if (el.dataset.fxTagged) return
        el.dataset.fxTagged = '1'
        el.classList.add('fx-reveal')
        if (el.matches('.course-card,.cat-card,.instructor,.value-card,.stat')) el.classList.add('fx-zoom')
        else if (el.matches('.about-visual,.auth-side,.teacher-card')) el.classList.add('fx-left')
        else if (el.matches('.about-copy,.buy-card')) el.classList.add('fx-right')
        // stagger siblings (e.g. cards in a grid appear one-by-one)
        const sibs = el.parentElement ? Array.from(el.parentElement.children) : []
        const idx = Math.max(0, sibs.indexOf(el))
        el.style.transitionDelay = `${(idx % 3) * 110}ms`
        io.observe(el)
      })
    }
    tag()
    const mo = new MutationObserver(tag)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [pathname])

  return (
    <>
      <div className="scroll-progress" style={{ transform: `scaleX(${progress})` }} aria-hidden="true" />
      <button className={`back-top ${showTop ? 'show' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">↑</button>
    </>
  )
}

function NotFound() {
  return <section className="section"><div className="container empty big"><div className="empty-icon">🧭</div><h1 className="serif">404 — Page Not Found</h1><p>The page you are looking for doesn't exist or has moved.</p><Link className="btn btn-primary btn-lg" to="/">Back to Home</Link></div></section>
}

export default function App() {
  const { pathname } = useLocation()
  return (
    <>
      <ScrollTop />
      <ScrollFX />
      <div className="topbar">🎉 Holiday Sale — <b>20% OFF</b> all courses with code <b className="pulse-code">HOLIDAY20</b> · <Link to="/courses">Shop courses →</Link></div>
      <Navbar />
      <main key={pathname} className="page-enter">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/my-learning" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
