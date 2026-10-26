import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { api, getToken, setToken } from '../lib/api.js'
import { courses as staticCourses } from '../data/data.js'

const AppContext = createContext(null)
const load = (key, fallback) => {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback } catch { return fallback }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => (getToken() ? load('edufast_user', null) : null))
  const [cart, setCart] = useState(() => load('edufast_cart', []))
  const [wishlist, setWishlist] = useState(() => load('edufast_wishlist', []))
  const [enrolled, setEnrolled] = useState(() => load('edufast_enrolled', []))
  const [progress, setProgress] = useState(() => load('edufast_progress', {}))
  const [orders, setOrders] = useState([])
  const [coursesData, setCoursesData] = useState(staticCourses)
  const [backendOnline, setBackendOnline] = useState(null)
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()))
  const [cartOpen, setCartOpen] = useState(false)
  const [toasts, setToasts] = useState([])

  useEffect(() => { localStorage.setItem('edufast_user', JSON.stringify(user)) }, [user])
  useEffect(() => { localStorage.setItem('edufast_cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('edufast_wishlist', JSON.stringify(wishlist)) }, [wishlist])
  useEffect(() => { localStorage.setItem('edufast_enrolled', JSON.stringify(enrolled)) }, [enrolled])
  useEffect(() => { localStorage.setItem('edufast_progress', JSON.stringify(progress)) }, [progress])

  const toast = useCallback((msg) => {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, msg }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200)
  }, [])

  const applyLearning = useCallback((learning) => {
    if (!learning) return
    if (learning.enrolled) setEnrolled(learning.enrolled)
    if (learning.progress) setProgress(learning.progress)
    if (learning.wishlist) setWishlist(learning.wishlist)
    if (learning.orders) setOrders(learning.orders)
  }, [])

  // Load live course catalog from backend (static list is the instant fallback)
  const refreshCourses = useCallback(async () => {
    try {
      const data = await api('/api/courses', { auth: false })
      if (Array.isArray(data) && data.length) setCoursesData(data)
      setBackendOnline(true)
    } catch { setBackendOnline(false) }
  }, [])
  useEffect(() => { refreshCourses() }, [refreshCourses])

  // Restore session from backend on load (account works on any device)
  useEffect(() => {
    if (!getToken()) { setAuthLoading(false); return }
    api('/api/me').then(d => { setUser(d.user); applyLearning(d.learning); setBackendOnline(true) })
      .catch(() => { setToken(''); setUser(null) }).finally(() => setAuthLoading(false))
  }, [applyLearning])

  const finishAuth = (data) => { setToken(data.token); setUser(data.user); applyLearning(data.learning); return data.user }
  const registerUser = async ({ name, email, phone, password }) => finishAuth(await api('/api/auth/register', { method: 'POST', body: { name, email, phone, password }, auth: false }))
  const loginUser = async (email, password) => finishAuth(await api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false }))
  const demoLogin = () => loginUser('demo@edufast.com', 'demo123')
  const adminLogin = () => loginUser('admin@edufast.com', 'admin123')
  const logout = () => { setToken(''); setUser(null); setEnrolled([]); setProgress({}); setWishlist([]); setOrders([]); toast('Logged out. See you soon!') }
  // legacy local-only setter (kept for compatibility)
  const login = (name, email) => setUser({ name, email })

  const addToCart = (course) => {
    if (enrolled.includes(course.id)) { toast('You already own this course 🎓'); return }
    if (cart.some(c => c.id === course.id)) { setCartOpen(true); return }
    setCart(c => [...c, course]); toast(`"${course.title}" added to cart`)
  }
  const removeFromCart = (id) => setCart(c => c.filter(x => x.id !== id))

  const toggleWishlist = async (id) => {
    const wished = wishlist.includes(id)
    setWishlist(w => wished ? w.filter(x => x !== id) : [...w, id])
    toast(wished ? 'Removed from wishlist' : 'Saved to wishlist ❤️')
    if (user && getToken()) { try { applyLearning(await api(`/api/me/wishlist/${id}`, { method: 'POST' })) } catch { /* local cache already updated */ } }
  }

  const enrollFree = async (course) => {
    if (user && getToken()) {
      try { applyLearning(await api('/api/enrollments', { method: 'POST', body: { courseId: course.id } })); toast('Enrolled! Saved to your account 🎉'); return }
      catch (e) { toast(e.message); return }
    }
    if (!enrolled.includes(course.id)) setEnrolled(e => [...e, course.id])
    setProgress(p => ({ [course.id]: 0, ...p }))
    toast('Enrolled! Find it in My Learning 🎉')
  }

  const checkout = async (promoCode = '') => {
    const ids = cart.map(c => c.id)
    if (user && getToken()) {
      const data = await api('/api/orders/checkout', { method: 'POST', body: { courseIds: ids, promoCode } })
      applyLearning(data.learning); setCart([]); setCartOpen(false)
      return data.order
    }
    // guest/local fallback (no account)
    setEnrolled(e => [...new Set([...e, ...ids])])
    setProgress(p => { const n = { ...p }; ids.forEach(i => { if (n[i] == null) n[i] = 0 }); return n })
    setCart([]); setCartOpen(false); return null
  }

  const updateProgress = (id, val) => {
    const v = Math.min(100, Math.max(0, val))
    setProgress(p => ({ ...p, [id]: v }))
    if (user && getToken()) api(`/api/enrollments/${id}/progress`, { method: 'PATCH', body: { progress: v } }).catch(() => {})
  }

  return (
    <AppContext.Provider value={{ user, login, loginUser, registerUser, demoLogin, adminLogin, logout, authLoading, cart, addToCart, removeFromCart, cartOpen, setCartOpen, checkout, wishlist, toggleWishlist, enrolled, enrollFree, progress, updateProgress, orders, coursesData, refreshCourses, backendOnline, toast }}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map(t => <div key={t.id} className="toast">{t.msg}</div>)}
      </div>
    </AppContext.Provider>
  )
}
export const useApp = () => useContext(AppContext)
