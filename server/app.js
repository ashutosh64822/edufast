// EduFast Express application.
// - Local/Render: server/index.js starts this app with app.listen().
// - Vercel: api/index.js exports this app as a serverless function.
// - Netlify: netlify/functions/api.js wraps this app with serverless-http.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  addMessage,
  addSubscriber,
  checkout as createCheckout,
  createCourse,
  createUser,
  databaseKind,
  deleteCourse,
  enrollInCourse,
  findUserByEmail,
  findUserById,
  getAdminStats,
  getCounts,
  getCourse,
  getLearningState,
  initDb,
  listCourses,
  now,
  publicUser,
  setProgress,
  toggleWishlist,
  uid,
  updateCourse,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = path.resolve(__dirname, '../dist')
const DIST_INDEX = path.join(DIST_DIR, 'index.html')
const JWT_SECRET = process.env.JWT_SECRET || 'edufast-dev-secret-change-me-in-production'

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET is not set. Set a long random JWT_SECRET in production.')
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
const err = (res, code, message) => res.status(code).json({ message })
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
const sign = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

const CATEGORIES = {
  development: 'Web Development',
  data: 'Data Science',
  business: 'Business',
  design: 'Design',
  marketing: 'Marketing',
  architecture: 'Architecture',
}

function courseFromBody(body, existing = {}) {
  const category = CATEGORIES[body?.category] ? body.category : (existing.category || 'development')
  return {
    ...existing,
    title: String(body?.title || existing.title || 'Untitled Course').trim(),
    category,
    catName: CATEGORIES[category],
    price: Math.max(0, Number(body?.price ?? existing.price ?? 0)),
    oldPrice: Math.max(0, Number(body?.oldPrice ?? existing.oldPrice ?? 0)),
    rating: Number(body?.rating ?? existing.rating ?? 4.8),
    reviews: Number(body?.reviews ?? existing.reviews ?? 0),
    lessons: Number(body?.lessons ?? existing.lessons ?? 20),
    hours: Number(body?.hours ?? existing.hours ?? 5),
    level: body?.level || existing.level || 'Beginner',
    instructor: body?.instructor || existing.instructor || 'EduFast Team',
    instructorImg: body?.instructorImg || existing.instructorImg || '/images/instructor-1.jpg',
    image: body?.image || existing.image || '/images/course-web.jpg',
    bestseller: Boolean(body?.bestseller ?? existing.bestseller ?? false),
    desc: body?.desc || existing.desc || 'A practical, project-based EduFast course.',
    outcomes: Array.isArray(body?.outcomes) && body.outcomes.length
      ? body.outcomes
      : (existing.outcomes || ['Learn by doing', 'Build real projects', 'Get mentor feedback', 'Earn a certificate']),
    curriculum: Array.isArray(body?.curriculum) && body.curriculum.length
      ? body.curriculum
      : (existing.curriculum || ['Getting Started', 'Core Concepts', 'Hands-on Practice', 'Final Project']),
  }
}

export function createApp({ serveStatic = true } = {}) {
  const app = express()
  const api = express.Router()

  app.disable('x-powered-by')
  app.set('trust proxy', 1)
  app.use(cors({
    origin: process.env.FRONTEND_ORIGIN
      ? process.env.FRONTEND_ORIGIN.split(',').map(origin => origin.trim())
      : true,
  }))
  app.use(express.json({ limit: '1mb' }))

  api.use(asyncHandler(async (req, res, next) => {
    await initDb()
    next()
  }))

  const requireAuth = asyncHandler(async (req, res, next) => {
    const token = (req.headers.authorization || '').replace('Bearer ', '')
    if (!token) return err(res, 401, 'Please log in first')
    try {
      const payload = jwt.verify(token, JWT_SECRET)
      req.user = await findUserById(payload.sub)
      if (!req.user) return err(res, 401, 'Account no longer exists')
      return next()
    } catch {
      return err(res, 401, 'Session expired — please log in again')
    }
  })

  const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') return err(res, 403, 'Admin access only')
    return next()
  }

  // ---------- Health ----------
  api.get('/health', asyncHandler(async (req, res) => {
    const counts = await getCounts()
    res.json({ status: 'ok', service: 'EduFast API', database: databaseKind, time: now(), counts })
  }))

  // ---------- Courses (public) ----------
  api.get('/courses', asyncHandler(async (req, res) => {
    const { q = '', cat = 'all', category, level = 'all', price = 'all', sort = 'popular' } = req.query
    const selectedCategory = category || cat
    let out = (await listCourses()).filter(course =>
      (selectedCategory === 'all' || course.category === selectedCategory) &&
      (level === 'all' || course.level === level) &&
      (price === 'all' || (price === 'free' ? course.price === 0 : course.price > 0)) &&
      `${course.title}${course.catName}${course.instructor}`.toLowerCase().includes(String(q).toLowerCase()))
    if (sort === 'price-low') out = [...out].sort((a, b) => a.price - b.price)
    if (sort === 'price-high') out = [...out].sort((a, b) => b.price - a.price)
    if (sort === 'rating') out = [...out].sort((a, b) => b.rating - a.rating)
    if (sort === 'popular') out = [...out].sort((a, b) => (b.reviews || 0) - (a.reviews || 0))
    res.json(out)
  }))

  api.get('/courses/:id', asyncHandler(async (req, res) => {
    const course = await getCourse(Number(req.params.id))
    return course ? res.json(course) : err(res, 404, 'Course not found')
  }))

  // ---------- Auth ----------
  api.post('/auth/register', asyncHandler(async (req, res) => {
    const { name = '', email = '', phone = '', password = '' } = req.body || {}
    if (name.trim().length < 2) return err(res, 400, 'Please enter your full name')
    if (!validEmail(email)) return err(res, 400, 'Enter a valid email address')
    if (password.length < 6) return err(res, 400, 'Password must be at least 6 characters')

    const candidate = {
      id: uid(),
      name: name.trim(),
      email: email.toLowerCase(),
      phone,
      role: 'student',
      passHash: bcrypt.hashSync(password, 10),
      createdAt: now(),
    }
    try {
      const user = await createUser(candidate)
      return res.status(201).json({ token: sign(user), user: publicUser(user), learning: await getLearningState(user.id) })
    } catch (error) {
      if (error.code === 'DUPLICATE_EMAIL') return err(res, 409, 'An account with this email already exists — please log in')
      throw error
    }
  }))

  api.post('/auth/login', asyncHandler(async (req, res) => {
    const { email = '', password = '' } = req.body || {}
    const user = await findUserByEmail(email)
    if (!user || !bcrypt.compareSync(password, user.passHash)) return err(res, 401, 'Wrong email or password')
    return res.json({ token: sign(user), user: publicUser(user), learning: await getLearningState(user.id) })
  }))

  api.get('/me', requireAuth, asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user), learning: await getLearningState(req.user.id) })
  }))

  api.get('/me/learning', requireAuth, asyncHandler(async (req, res) => {
    res.json(await getLearningState(req.user.id))
  }))

  // ---------- Enrollments / progress / wishlist / orders ----------
  api.post('/enrollments', requireAuth, asyncHandler(async (req, res) => {
    const courseId = Number(req.body?.courseId)
    const course = await getCourse(courseId)
    if (!course) return err(res, 404, 'Course not found')
    if (course.price > 0) return err(res, 400, 'This is a paid course — please checkout first')
    await enrollInCourse(req.user.id, courseId)
    return res.json(await getLearningState(req.user.id))
  }))

  api.patch('/enrollments/:courseId/progress', requireAuth, asyncHandler(async (req, res) => {
    const updated = await setProgress(req.user.id, Number(req.params.courseId), Number(req.body?.progress) || 0)
    if (!updated) return err(res, 404, 'You are not enrolled in this course')
    return res.json(await getLearningState(req.user.id))
  }))

  api.post('/me/wishlist/:courseId', requireAuth, asyncHandler(async (req, res) => {
    await toggleWishlist(req.user.id, Number(req.params.courseId))
    res.json(await getLearningState(req.user.id))
  }))

  api.post('/orders/checkout', requireAuth, asyncHandler(async (req, res) => {
    const { courseIds = [], promoCode = '' } = req.body || {}
    const order = await createCheckout(req.user.id, courseIds, promoCode)
    if (!order) return err(res, 400, 'Your cart is empty or you already own these courses')
    return res.status(201).json({ order, learning: await getLearningState(req.user.id) })
  }))

  // ---------- Contact & newsletter ----------
  api.post('/contact', asyncHandler(async (req, res) => {
    const { name = '', email = '', phone = '', subject = 'General Question', message = '' } = req.body || {}
    if (name.trim().length < 2) return err(res, 400, 'Please enter your name')
    if (!validEmail(email)) return err(res, 400, 'Enter a valid email')
    if (message.trim().length < 10) return err(res, 400, 'Message should be at least 10 characters')
    const saved = await addMessage({
      id: uid(),
      name: name.trim(),
      email,
      phone,
      subject,
      message: message.trim(),
      read: false,
      createdAt: now(),
    })
    return res.status(201).json({ ok: true, id: saved.id })
  }))

  api.post('/newsletter', asyncHandler(async (req, res) => {
    const { email = '' } = req.body || {}
    if (!validEmail(email)) return err(res, 400, 'Enter a valid email address')
    await addSubscriber(email)
    return res.json({ ok: true })
  }))

  // ---------- Admin ----------
  api.get('/admin/stats', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    res.json(await getAdminStats())
  }))

  api.post('/admin/courses', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    if (!String(req.body?.title || '').trim()) return err(res, 400, 'Course title is required')
    const course = await createCourse(courseFromBody(req.body))
    return res.status(201).json(course)
  }))

  api.put('/admin/courses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    const existing = await getCourse(Number(req.params.id))
    if (!existing) return err(res, 404, 'Course not found')
    const updated = await updateCourse(existing.id, courseFromBody(req.body, existing))
    return res.json(updated)
  }))

  api.delete('/admin/courses/:id', requireAuth, requireAdmin, asyncHandler(async (req, res) => {
    await deleteCourse(Number(req.params.id))
    res.json({ ok: true })
  }))

  api.use((req, res) => err(res, 404, 'API endpoint not found'))

  app.use('/api', api)
  app.use('/.netlify/functions/api', api)

  if (serveStatic && fs.existsSync(DIST_INDEX)) {
    app.use(express.static(DIST_DIR, {
      setHeaders(res, filePath) {
        if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache')
      },
    }))
    app.get('*', (req, res) => res.sendFile(DIST_INDEX))
  } else {
    app.get('/', (req, res) => res.json({
      status: 'ok',
      service: 'EduFast API',
      database: databaseKind,
      message: 'Frontend build not found. Run `npm run build` to serve the website from this service.',
    }))
  }

  app.use((error, req, res, next) => {
    console.error(error)
    if (res.headersSent) return next(error)
    return err(res, 500, process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message)
  })

  return app
}

export default createApp()
