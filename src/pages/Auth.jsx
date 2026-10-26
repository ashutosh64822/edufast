import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext.jsx'

export default function Auth({ mode = 'register' }) {
  const isRegister = mode === 'register'
  const { loginUser, registerUser, demoLogin, toast, setCartOpen, cart } = useApp()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [form, setForm] = useState({ name: '', email: '', phone: '', pass: '', confirm: '', agree: false })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const afterLogin = (u, isNew) => {
    toast(isNew ? `Welcome to EduFast, ${u.name.split(' ')[0]}! 🎉` : `Welcome back, ${u.name.split(' ')[0]}! 👋`)
    if (u.role === 'admin') navigate('/admin')
    else if (params.get('next') === 'checkout' && cart.length) { navigate('/courses'); setTimeout(() => setCartOpen(true), 300) }
    else navigate('/my-learning')
  }

  const submit = async (e) => {
    e.preventDefault(); setServerError('')
    const er = {}
    if (isRegister && form.name.trim().length < 2) er.name = 'Please enter your full name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Enter a valid email address'
    if (form.pass.length < 6) er.pass = 'Password must be at least 6 characters'
    if (isRegister && form.pass !== form.confirm) er.confirm = 'Passwords do not match'
    if (isRegister && !form.agree) er.agree = 'Please accept the terms to continue'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try {
      const u = isRegister
        ? await registerUser({ name: form.name.trim(), email: form.email.trim(), phone: form.phone, password: [SECURITY_DATA] })
        : await loginUser(form.email.trim(), form.pass)
      afterLogin(u, isRegister)
    } catch (err2) { setServerError(err2.message || 'Something went wrong — is the backend running?') }
    finally { setBusy(false) }
  }

  const demo = async () => {
    setBusy(true); setServerError('')
    try { const u = await demoLogin(); toast('Logged in as Demo Student 🎓'); navigate('/my-learning') }
    catch (err2) { setServerError(err2.message) } finally { setBusy(false) }
  }

  return (
    <section className="section auth-section"><div className="container auth-grid">
      <div className="auth-side">
        <p className="eyebrow light">{isRegister ? 'Join EduFast' : 'Welcome Back'}</p>
        <h1 className="serif white">{isRegister ? 'Start Better Life From Here' : 'Continue Your Learning Journey'}</h1>
        <ul className="auth-perks">
          <li>✅ 350+ practical, career-focused courses</li>
          <li>✅ Expert mentors & personal feedback</li>
          <li>✅ Certificates employers recognise</li>
          <li>✅ 20% holiday discount with <b>HOLIDAY20</b></li>
          <li>☁️ Your account & progress are saved on our server — log in from any device</li>
        </ul>
        <img src="/images/about-students.jpg" alt="Students learning on EduFast" />
      </div>
      <div className="form-card">
        <div className="auth-tabs">
          <Link to="/register" className={isRegister ? 'active' : ''}>Register</Link>
          <Link to="/login" className={!isRegister ? 'active' : ''}>Log In</Link>
        </div>
        <form onSubmit={submit} noValidate>
          <h2 className="serif">{isRegister ? 'Create Your Free Account' : 'Log In to EduFast'}</h2>
          {serverError && <p className="server-err">⚠️ {serverError}</p>}
          {isRegister && <label>Full Name *<input value={form.name} onChange={set('name')} placeholder="e.g. Arif Rahman" />{errors.name && <small className="err">{errors.name}</small>}</label>}
          <label>Email Address *<input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />{errors.email && <small className="err">{errors.email}</small>}</label>
          {isRegister && <label>Phone Number<input value={form.phone} onChange={set('phone')} placeholder="+880 1XXX-XXXXXX" /></label>}
          <label>Password *<span className="pass-wrap"><input type={showPass ? 'text' : 'password'} value={form.pass} onChange={set('pass')} placeholder="Minimum 6 characters" /><button type="button" className="eye" onClick={() => setShowPass(!showPass)}>{showPass ? '🙈' : '👁️'}</button></span>{errors.pass && <small className="err">{errors.pass}</small>}</label>
          {isRegister && <><label>Confirm Password *<input type={showPass ? 'text' : 'password'} value={form.confirm} onChange={set('confirm')} placeholder="Repeat your password" />{errors.confirm && <small className="err">{errors.confirm}</small>}</label>
          <label className="check-row"><input type="checkbox" checked={form.agree} onChange={set('agree')} /> I agree to the Terms of Service & Privacy Policy</label>{errors.agree && <small className="err">{errors.agree}</small>}</>}
          {!isRegister && <p className="right"><a href="#" onClick={e => { e.preventDefault(); toast('Password reset by email is coming soon 📩') }}>Forgot password?</a></p>}
          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={busy}>{busy ? 'Please wait…' : isRegister ? 'Create Account →' : 'Log In →'}</button>
        </form>
        <div className="divider">or</div>
        <button className="btn btn-outline btn-block" onClick={demo} disabled={busy}>🚀 Continue as Demo Student (no signup)</button>
        <p className="center muted small">Demo account: <b>demo@edufast.com</b> / <b>demo123</b> · Admin: <b>admin@edufast.com</b> / <b>admin123</b></p>
        <p className="center muted small">{isRegister ? <>Already have an account? <Link to="/login">Log in</Link></> : <>New to EduFast? <Link to="/register">Create an account</Link></>}</p>
        <p className="center muted small">🔒 Real backend account — your password is encrypted (hashed) on the server.</p>
      </div>
    </div></section>
  )
}
