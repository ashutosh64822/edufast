import { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { faqs } from '../data/data.js'

export default function Contact() {
  const { toast } = useApp()
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: 'General Question', message: '' })
  const [errors, setErrors] = useState({})
  const [sent, setSent] = useState(false)
  const [open, setOpen] = useState(0)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const [sending, setSending] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (form.name.trim().length < 2) er.name = 'Please enter your name'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Enter a valid email'
    if (form.message.trim().length < 10) er.message = 'Message should be at least 10 characters'
    setErrors(er)
    if (Object.keys(er).length) return
    setSending(true)
    try {
      await api('/api/contact', { method: 'POST', body: form, auth: false })
      setSent(true); toast('Message saved on server! We reply within 24 hours 📩')
    } catch (err2) { toast('❌ ' + err2.message) }
    finally { setSending(false) }
  }

  return (
    <>
      <section className="page-head"><div className="container"><p className="eyebrow light">Contact</p><h1 className="serif white">We'd Love to Hear From You</h1><p>Questions about a course, payments, or your career path? Talk to a real human.</p></div></section>
      <section className="section"><div className="container contact-grid">
        <div className="contact-info">
          {[['📍', 'Visit Us', 'House 12, Road 5, Banani,\nDhaka 1213, Bangladesh'], ['📧', 'Email Us', 'hello@edufast.com\nsupport@edufast.com'], ['📞', 'Call / WhatsApp', '+880 1700-000000\nSat–Thu, 9 AM – 8 PM'], ['💬', 'Live Support', 'Average reply time: under\n24 hours on working days']].map(([i, t, d]) => (
            <div className="info-card" key={t}><div className="feature-icon">{i}</div><div><h3>{t}</h3><p style={{ whiteSpace: 'pre-line' }}>{d}</p></div></div>
          ))}
          <div className="map-card"><div className="map-pin">📍</div><p><b>EduFast Campus</b><br />Banani, Dhaka — find us on Google Maps as “EduFast Dhaka”</p></div>
        </div>
        <div className="form-card">
          {sent ? (
            <div className="empty"><div className="empty-icon">✅</div><h3>Message sent successfully!</h3><p>Thanks, {form.name.split(' ')[0]}. Our team will reply to <b>{form.email}</b> within 24 hours.</p><button className="btn btn-primary" onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', subject: 'General Question', message: '' }) }}>Send Another Message</button></div>
          ) : (
            <form onSubmit={submit} noValidate>
              <h2 className="serif">Send a Message</h2>
              <label>Full Name *<input value={form.name} onChange={set('name')} placeholder="Your name" />{errors.name && <small className="err">{errors.name}</small>}</label>
              <label>Email Address *<input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />{errors.email && <small className="err">{errors.email}</small>}</label>
              <label>Phone (optional)<input value={form.phone} onChange={set('phone')} placeholder="+880 1XXX-XXXXXX" /></label>
              <label>Subject<select value={form.subject} onChange={set('subject')}><option>General Question</option><option>Course Advice</option><option>Payment Help</option><option>Certificate Issue</option><option>Become an Instructor</option><option>Business / Partnership</option></select></label>
              <label>Message *<textarea rows="5" value={form.message} onChange={set('message')} placeholder="How can we help you?" />{errors.message && <small className="err">{errors.message}</small>}</label>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Send Message →'}</button>
            </form>
          )}
        </div>
      </div></section>

      <section className="section soft" id="faq"><div className="container narrow">
        <p className="eyebrow center">FAQ</p><h2 className="serif center">Frequently Asked Questions</h2>
        <div className="accordion">{faqs.map((f, i) => (
          <div key={f.q} className={`acc-item ${open === i ? 'open' : ''}`}>
            <button className="acc-head" onClick={() => setOpen(open === i ? -1 : i)}><span>{f.q}</span><span>{open === i ? '−' : '+'}</span></button>
            {open === i && <div className="acc-body"><p>{f.a}</p></div>}
          </div>
        ))}</div>
      </div></section>
    </>
  )
}
