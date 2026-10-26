import { Link } from 'react-router-dom'
import { instructors, stats } from '../data/data.js'

export default function About() {
  return (
    <>
      <section className="page-head"><div className="container"><p className="eyebrow light">About Us</p><h1 className="serif white">Knowledge is power,<br />Information is liberating.</h1><p>The story, mission and people behind EduFast.</p></div></section>

      <section className="section"><div className="container about-grid">
        <div className="about-visual"><div className="about-main"><img src="/images/about-students.jpg" alt="EduFast students" /></div><div className="about-small"><img src="/images/about-team.jpg" alt="" /></div><div className="exp-badge"><b>20+</b><span>Years of<br />Experience</span></div></div>
        <div className="about-copy">
          <p className="eyebrow">OUR STORY</p><h2 className="serif">From a Small Classroom in Dhaka to 25,000+ Learners Worldwide</h2>
          <p>EduFast began in 2004 as a small training centre with one belief: quality education should be practical, affordable and open to everyone. Twenty years later, our students work at startups, agencies and global companies — but our classroom spirit has not changed.</p>
          <p>Every EduFast course is built with employers, taught by practitioners, and reviewed by mentors who give you personal feedback. We measure success not by videos watched, but by jobs landed and businesses grown.</p>
          <Link to="/courses" className="btn btn-primary btn-lg">Explore Our Courses</Link>
        </div>
      </div></section>

      <section className="stats-band"><div className="container stats-grid">{stats.map(s => <div className="stat" key={s.label}><strong>{s.value.toLocaleString()}{s.suffix}</strong><span>{s.label}</span></div>)}</div></section>

      <section className="section"><div className="container">
        <p className="eyebrow center">Our Values</p><h2 className="serif center">Why Students Choose EduFast</h2>
        <div className="grid-3">
          {[['🎯', 'Practical First', 'Every lesson ends with doing. You graduate with projects, not just notes.'], ['🤝', 'Mentors, Not Just Videos', 'Real experts review your work and answer your questions personally.'], ['💰', 'Honest Pricing', 'Affordable courses, free options, local payments and a 30-day guarantee.'], ['🌍', 'Open to Everyone', 'Learn in Bangla-friendly English, at your pace, from any device, anywhere.'], ['🚀', 'Career Focused', 'CV reviews, interview practice and a hiring-partner network.'], ['❤️', 'Community Always', 'Study groups, events and alumni who keep helping each other grow.']].map(([i, t, d]) => (
            <div className="value-card" key={t}><div className="feature-icon">{i}</div><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </div></section>

      <section className="section soft"><div className="container narrow">
        <p className="eyebrow center">Our Journey</p><h2 className="serif center">Milestones</h2>
        <div className="timeline">
          {[['2004', 'EduFast founded', 'A single classroom in Dhaka with 12 students and 2 teachers.'], ['2012', 'First online courses', 'We record our first courses so students outside Dhaka can learn with us.'], ['2018', '10,000 graduates', 'Our alumni community passes ten thousand across 20+ countries.'], ['2022', 'New campus & platform', 'A modern campus in Banani and a fully rebuilt online learning platform.'], ['2026', '25,000+ learners', '350+ courses, 120+ instructors — and still growing every day.']].map(([y, t, d]) => (
            <div className="tl-item" key={y}><div className="tl-year">{y}</div><div><h3>{t}</h3><p>{d}</p></div></div>
          ))}
        </div>
      </div></section>

      <section className="section" id="instructors"><div className="container">
        <p className="eyebrow center">Team Member</p><h2 className="serif center">Meet Our Instructors</h2>
        <div className="instructor-grid">{instructors.map(i => (
          <div className="instructor" key={i.id}><img src={i.image} alt={i.name} loading="lazy" /><h3>{i.name}</h3><p className="blue-text">{i.role}</p><p className="inst-bio">{i.bio}</p><p className="inst-meta">⭐ {i.rating} · {i.students.toLocaleString()} students · {i.courses} courses</p></div>
        ))}</div>
        <div className="center mt"><Link to="/register" className="btn btn-primary btn-lg">Start Learning With Us</Link></div>
      </div></section>
    </>
  )
}
