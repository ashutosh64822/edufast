import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CourseCard, { Stars } from '../components/CourseCard.jsx'
import { categories, courses, events, instructors, stats, testimonials } from '../data/data.js'

function Counter({ value, suffix }) {
  const [n, setN] = useState(0)
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      const start = performance.now()
      const tick = (t) => { const p = Math.min(1, (t - start) / 1400); setN(Math.round(value * p)); if (p < 1) requestAnimationFrame(tick) }
      requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    obs.observe(el); return () => obs.disconnect()
  }, [value])
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>
}

export default function Home() {
  const { coursesData: courses } = useApp()
  const [cat, setCat] = useState('all')
  const [tIndex, setTIndex] = useState(0)
  const [query, setQuery] = useState('')
  const heroVisualRef = useRef(null)
  const navigate = useNavigate()

  // Gentle 3D tilt / parallax on the hero photo as the mouse moves
  const tiltHero = (e) => {
    const el = heroVisualRef.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`
  }
  const resetHero = () => { if (heroVisualRef.current) heroVisualRef.current.style.transform = '' }
  const featured = (cat === 'all' ? courses : courses.filter(c => c.category === cat)).slice(0, 6)

  useEffect(() => { const t = setInterval(() => setTIndex(i => (i + 1) % testimonials.length), 5000); return () => clearInterval(t) }, [])
  const search = (e) => { e.preventDefault(); navigate(`/courses?q=${encodeURIComponent(query)}`) }

  return (
    <>
      {/* HERO — recreates the Dribbble design */}
      <section className="hero" onMouseMove={tiltHero} onMouseLeave={resetHero}>
        <span className="blob blob-1" aria-hidden="true" /><span className="blob blob-2" aria-hidden="true" /><span className="blob blob-3" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow-dark hero-anim" style={{ animationDelay: '.05s' }}>Welcome to <b>Edu<span>Fast</span>!</b> <span className="wave">👋</span></p>
            <h1 className="hero-anim" style={{ animationDelay: '.15s' }}>Start <span className="grad-text">Better<br />Life</span> From Here</h1>
            <p className="hero-sub">World-class training and development programs developed by top teachers. Learn skills that get you hired — anytime, anywhere.</p>
            <form className="hero-search" onSubmit={search}>
              <input placeholder="What do you want to learn? e.g. React, Python, Design…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search courses" />
              <button className="btn btn-primary" type="submit">Search</button>
            </form>
            <div className="hero-cta">
              <Link to="/courses" className="btn btn-outline btn-lg">Learn More</Link>
              <Link to="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
            </div>
            <div className="discount-card">
              <img src="/images/course-laptop.jpg" alt="" />
              <div><strong className="big-discount">20%</strong></div>
              <p>Discount on<br />Holiday Courses<br /><code>Use code: HOLIDAY20</code></p>
            </div>
          </div>
          <div className="hero-visual" ref={heroVisualRef} aria-hidden="true">
            <span className="spin-ring" />
            <span className="dot d1" /><span className="dot d2" /><span className="dot d3" /><span className="dot d4" /><span className="dot d5" /><span className="dot d6 navy" /><span className="dot d7 navy" />
            <div className="hero-ring"><img src="/images/hero-person.png" alt="EduFast mentor portrait" /></div>
            <div className="float-card fc1">🎓 <div><b>25,000+</b><span>Students learning</span></div></div>
            <div className="float-card fc2">⭐ <div><b>4.9 / 5.0</b><span>Average rating</span></div></div>
          </div>
        </div>
      </section>

      {/* SCROLLING SKILLS MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee-track">
          {[...Array(2)].map((_, dup) => (
            <span className="marquee-group" key={dup}>
              {['💻 Web Development', '📊 Data Science', '🎨 UI/UX Design', '📣 Digital Marketing', '💼 Business Analysis', '🏛️ Architecture', '🐍 Python', '⚛️ React & Next.js', '🤖 Machine Learning', '🏆 Get Certified'].map(s => <span className="marquee-item" key={dup + s}>{s}<i>✦</i></span>)}
            </span>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="section features">
        <div className="container grid-3">
          {[
            { icon: '🖥️', title: 'Online Courses', text: 'World-class training and development programs you can follow at your own pace, from any device.', link: '/courses' },
            { icon: '👨‍🏫', title: 'Expert Mentor', text: 'Learn directly from industry experts with personal feedback, code reviews and live Q&A sessions.', link: '/about#instructors' },
            { icon: '🎓', title: 'Certificates', text: 'Earn a verifiable certificate for every course you finish and share it with employers worldwide.', link: '/courses' },
          ].map(f => (
            <div className="feature" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div><h3 className="serif blue-text">{f.title}</h3><p>{f.text} <Link to={f.link}>Read More</Link></p></div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="stats-band">
        <div className="container stats-grid">
          {stats.map(s => <div key={s.label} className="stat"><strong><Counter value={s.value} suffix={s.suffix} /></strong><span>{s.label}</span></div>)}
        </div>
      </section>

      {/* ABOUT PREVIEW */}
      <section className="section">
        <div className="container about-grid">
          <div className="about-visual">
            <div className="about-main"><img src="/images/about-students.jpg" alt="Students learning together" /></div>
            <div className="about-small"><img src="/images/about-team.jpg" alt="Students collaborating" /></div>
            <div className="exp-badge"><b>20+</b><span>Years of<br />Experience</span></div>
          </div>
          <div className="about-copy">
            <p className="eyebrow">ABOUT US</p>
            <h2 className="serif">Knowledge is power, Information is liberating.</h2>
            <p>For over 20 years, EduFast has helped learners in Bangladesh and around the world build real, job-ready skills. We combine expert mentors, practical projects and a supportive community — so you never learn alone.</p>
            <ul className="check-list">
              <li>✅ Practical, project-based learning — not just theory</li>
              <li>✅ Personal mentor feedback on every major project</li>
              <li>✅ Lifetime access, learn at your own pace</li>
              <li>✅ Career support: CV review & interview practice</li>
            </ul>
            <Link to="/about" className="btn btn-primary btn-lg">Read More</Link>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section soft">
        <div className="container">
          <p className="eyebrow center">Course Categories</p>
          <h2 className="serif center">Popular Topics To Learn</h2>
          <div className="cat-grid">
            {categories.filter(c => c.id !== 'all').map(c => {
              const count = courses.filter(x => x.category === c.id).length
              const img = (courses.find(x => x.category === c.id) || {}).image
              return (
                <Link key={c.id} to={`/courses?cat=${c.id}`} className="cat-card">
                  <img src={img} alt="" loading="lazy" />
                  <div><span>{count * 7 + 13} Courses</span><h3 className="serif">{c.name} {c.icon}</h3><p>Start learning {c.name.toLowerCase()} with expert-led, practical lessons.</p></div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* FEATURED COURSES */}
      <section className="section">
        <div className="container">
          <p className="eyebrow center">Featured Courses</p>
          <h2 className="serif center">Explore Our Best Courses</h2>
          <div className="filter-pills center">
            {categories.map(c => <button key={c.id} className={`pill ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>)}
          </div>
          <div className="course-grid">
            {featured.map(c => <CourseCard key={c.id} course={c} />)}
          </div>
          <div className="center mt"><Link to="/courses" className="btn btn-primary btn-lg">View All Courses →</Link></div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section navy-band">
        <div className="container">
          <p className="eyebrow center light">How It Works</p>
          <h2 className="serif center white">Start Learning in 3 Easy Steps</h2>
          <div className="grid-3 steps">
            {[['1', 'Create Your Account', 'Register free in under a minute and set your learning goals.'], ['2', 'Choose Your Course', 'Pick from 350+ practical courses and enroll with lifetime access.'], ['3', 'Learn & Get Certified', 'Watch lessons, build projects, get mentor feedback and earn your certificate.']].map(([n, t, d]) => (
              <div className="step" key={n}><div className="step-num">{n}</div><h3>{t}</h3><p>{d}</p></div>
            ))}
          </div>
          <div className="center mt"><Link to="/register" className="btn btn-white btn-lg">Join EduFast Free</Link></div>
        </div>
      </section>

      {/* INSTRUCTORS */}
      <section className="section" id="instructors">
        <div className="container">
          <p className="eyebrow center">Team Member</p>
          <h2 className="serif center">Meet Our Instructors</h2>
          <div className="instructor-grid">
            {instructors.map(i => (
              <div className="instructor" key={i.id}>
                <img src={i.image} alt={i.name} loading="lazy" />
                <h3>{i.name}</h3><p className="blue-text">{i.role}</p>
                <p className="inst-meta">⭐ {i.rating} · {i.students.toLocaleString()} students</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENTS */}
      <section className="section soft" id="events">
        <div className="container">
          <p className="eyebrow center">Upcoming Events</p>
          <h2 className="serif center">Join Our Learning Events</h2>
          <div className="grid-3">
            {events.map(e => (
              <article className="event-card" key={e.id}>
                <div className="event-img"><img src={e.image} alt="" loading="lazy" /><div className="date-badge"><b>{e.day}</b><span>{e.month}</span></div></div>
                <div className="event-body"><h3 className="serif">{e.title}</h3><p className="event-meta">📍 {e.location}<br />🕘 {e.time}</p><p>{e.desc}</p><Link to="/contact">Read More →</Link></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section">
        <div className="container">
          <p className="eyebrow center">Testimonial</p>
          <h2 className="serif center">What Our Students Say</h2>
          <div className="testimonial-box">
            {testimonials.map((t, idx) => (
              <div key={t.id} className={`testimonial ${idx === tIndex ? 'show' : ''}`}>
                <img src={t.image} alt={t.name} />
                <h3>{t.name}</h3><p className="blue-text">{t.course}</p>
                <p className="testimonial-text">“{t.text}”</p><Stars value={t.stars} />
              </div>
            ))}
            <div className="slider-nav">
              <button onClick={() => setTIndex((tIndex - 1 + testimonials.length) % testimonials.length)} aria-label="Previous">←</button>
              {testimonials.map((_, idx) => <button key={idx} className={`dotnav ${idx === tIndex ? 'active' : ''}`} onClick={() => setTIndex(idx)} aria-label={`Testimonial ${idx + 1}`} />)}
              <button onClick={() => setTIndex((tIndex + 1) % testimonials.length)} aria-label="Next">→</button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-band">
        <div className="container cta-inner">
          <div><h2 className="serif white">Ready to Start a Better Life?</h2><p>Join 25,000+ students learning on EduFast today. Get 20% off with code <b>HOLIDAY20</b>.</p></div>
          <Link to="/register" className="btn btn-white btn-lg">Register Now — It's Free</Link>
        </div>
      </section>
    </>
  )
}
