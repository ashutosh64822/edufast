import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import CourseCard from '../components/CourseCard.jsx'
import { useApp } from '../context/AppContext.jsx'
import { categories } from '../data/data.js'

export default function Courses() {
  const { coursesData: courses } = useApp()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const cat = params.get('cat') || 'all'
  const [search, setSearch] = useState(q)
  const [level, setLevel] = useState('all')
  const [price, setPrice] = useState('all')
  const [sort, setSort] = useState('popular')

  const setCat = (c) => { const n = new URLSearchParams(params); c === 'all' ? n.delete('cat') : n.set('cat', c); setParams(n) }
  const doSearch = (v) => { setSearch(v); const n = new URLSearchParams(params); v ? n.set('q', v) : n.delete('q'); setParams(n, { replace: true }) }

  const list = useMemo(() => {
    let out = courses.filter(c =>
      (cat === 'all' || c.category === cat) &&
      (level === 'all' || c.level === level) &&
      (price === 'all' || (price === 'free' ? c.price === 0 : c.price > 0)) &&
      (c.title + c.catName + c.instructor).toLowerCase().includes((q || search).toLowerCase()))
    if (sort === 'price-low') out = [...out].sort((a, b) => a.price - b.price)
    if (sort === 'price-high') out = [...out].sort((a, b) => b.price - a.price)
    if (sort === 'rating') out = [...out].sort((a, b) => b.rating - a.rating)
    if (sort === 'popular') out = [...out].sort((a, b) => b.reviews - a.reviews)
    return out
  }, [cat, level, price, sort, q, search, courses])

  const clear = () => { setSearch(''); setLevel('all'); setPrice('all'); setSort('popular'); setParams({}) }

  return (
    <>
      <section className="page-head">
        <div className="container"><p className="eyebrow light">Our Courses</p><h1 className="serif white">Explore Courses That Build Your Career</h1><p>{courses.length} practical courses · Expert mentors · Lifetime access · Certificates included</p></div>
      </section>
      <section className="section">
        <div className="container">
          <div className="toolbar">
            <div className="search-box">🔍 <input placeholder="Search courses, topics, instructors…" value={search} onChange={e => doSearch(e.target.value)} aria-label="Search courses" /></div>
            <select value={level} onChange={e => setLevel(e.target.value)} aria-label="Filter by level"><option value="all">All Levels</option><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>All Levels</option></select>
            <select value={price} onChange={e => setPrice(e.target.value)} aria-label="Filter by price"><option value="all">Any Price</option><option value="free">Free</option><option value="paid">Paid</option></select>
            <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort courses"><option value="popular">Most Popular</option><option value="rating">Highest Rated</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option></select>
          </div>
          <div className="filter-pills">
            {categories.map(c => <button key={c.id} className={`pill ${cat === c.id ? 'active' : ''}`} onClick={() => setCat(c.id)}>{c.icon} {c.name}</button>)}
          </div>
          <p className="result-count">Showing <b>{list.length}</b> of {courses.length} courses {search && <>for “{search}”</>}</p>
          {list.length === 0 ? (
            <div className="empty big"><div className="empty-icon">🔎</div><h3>No courses found</h3><p>Try a different keyword or clear your filters.</p><button className="btn btn-primary" onClick={clear}>Clear Filters</button></div>
          ) : (
            <div className="course-grid">{list.map(c => <CourseCard key={c.id} course={c} />)}</div>
          )}
        </div>
      </section>
    </>
  )
}
