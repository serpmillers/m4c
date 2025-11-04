import { useEffect, useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900 text-slate-100">
      <header className="border-b border-slate-800/80 sticky top-0 z-10 backdrop-blur bg-slate-950/50">
        <div className="mx-auto max-w-5xl p-4 flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-violet-500"></div>
          <a href="/" className="font-semibold tracking-wide">MOVAI</a>
          <div className="ml-auto flex items-center gap-2">
            <a href="/login" className="text-sm text-slate-300 hover:text-white">Sign in</a>
            <a href="#" onClick={(e)=>{e.preventDefault(); if(!localStorage.getItem('user_id')) localStorage.setItem('user_id','1'); window.location.href='/survey'}} className="text-sm rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5">Sign up</a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-6">
        <Routes>
          <Route path="/" element={<HomeOrDashboard />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/survey" element={<SurveyPage />} />
          <Route path="/recommend" element={<RecommendPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App

function HomeOrDashboard() {
  const hasUser = typeof window !== 'undefined' && !!localStorage.getItem('user_id')
  return hasUser ? <RecommendPage /> : <HomePage />
}

function HomePage() {
  const navigate = useNavigate()
  function goNext() {
    if (!localStorage.getItem('user_id')) localStorage.setItem('user_id', '1')
    navigate('/survey')
  }
  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(1200px_500px_at_80%_-20%,#7c3aed22,transparent)] pointer-events-none" />
      <div className="aspect-[21/9] sm:aspect-[16/7] bg-[linear-gradient(180deg,#0b0f1b,transparent_40%),linear-gradient(0deg,#0b0f1b,transparent_60%)]" />
      <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end gap-4">
        <div className="text-4xl sm:text-5xl font-light tracking-wide">Discover, Decide <br className="hidden sm:block" />& Enjoy</div>
        <div className="flex gap-3">
          <button onClick={goNext} className="rounded-full bg-violet-600 hover:bg-violet-500 px-5 py-2.5 text-sm font-medium">Sign up</button>
          <button onClick={goNext} className="rounded-full bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-sm font-medium">Sign in</button>
        </div>
      </div>
    </section>
  )
}

function LoginPage() {
  const [userId, setUserId] = useState('1')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: Number(userId) })
      })
      if (!res.ok) throw new Error('Login failed')
      const data = await res.json()
      localStorage.setItem('token', data.token)
      localStorage.setItem('user_id', String(data.user_id))
      navigate('/survey')
    } catch (e) {
      setError(e.message || 'Login error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Welcome</h1>
        <p className="text-slate-400">Sign in with a user id to begin</p>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-md bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/20">
        <label className="block text-sm mb-2">User ID</label>
        <input className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="number" min="0" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <button type="submit" disabled={loading} className="mt-4 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium disabled:opacity-60">
          {loading ? 'Signing in…' : 'Continue'}
        </button>
        {error && <div className="mt-3 text-sm text-rose-400">{error}</div>}
      </form>
    </div>
  )
}

function SurveyPage() {
  const [schema, setSchema] = useState({ genres: [], years: [] })
  const [selectedGenres, setSelectedGenres] = useState([])
  const [minYear, setMinYear] = useState('')
  const [maxYear, setMaxYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false
    async function loadSchema() {
      try {
        const res = await fetch(`${API_BASE}/survey/schema`)
        if (!res.ok) throw new Error('Failed to load survey schema')
        const data = await res.json()
        if (!ignore) setSchema(data)
      } catch (e) {
        if (!ignore) setError(e.message || 'Error loading survey')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    loadSchema()
    return () => { ignore = true }
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    const userId = localStorage.getItem('user_id')
    try {
      await fetch(`${API_BASE}/survey/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: Number(userId),
          genres: selectedGenres,
          min_year: minYear ? Number(minYear) : null,
          max_year: maxYear ? Number(maxYear) : null
        })
      })
    } catch {}
    const params = new URLSearchParams()
    if (selectedGenres.length) params.set('genres', selectedGenres.join(','))
    if (minYear) params.set('min_year', String(minYear))
    if (maxYear) params.set('max_year', String(maxYear))
    navigate(`/recommend?${params.toString()}`)
  }

  if (loading) return <div className="text-slate-400">Loading survey…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Tell us your taste</h1>
        <p className="text-slate-400">Pick a few genres and a year range</p>
      </div>
      <form onSubmit={onSubmit} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 shadow-xl shadow-black/20">
        <fieldset>
          <legend className="text-sm text-slate-400">Genres</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {schema.genres.map((g) => {
              const active = selectedGenres.includes(g)
              return (
                <button
                  type="button"
                  key={g}
                  className={`px-3 py-1 rounded-full border text-sm transition ${active ? 'bg-violet-600 border-violet-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'}`}
                  onClick={() => {
                    setSelectedGenres((prev) => active ? prev.filter(x => x !== g) : [...prev, g])
                  }}
                >{g}</button>
              )
            })}
          </div>
        </fieldset>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="text-sm">
            Min year
            <input className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="number" value={minYear} onChange={(e) => setMinYear(e.target.value)} />
          </label>
          <label className="text-sm">
            Max year
            <input className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 outline-none focus:ring-2 focus:ring-violet-500" type="number" value={maxYear} onChange={(e) => setMaxYear(e.target.value)} />
          </label>
        </div>
        <button type="submit" className="mt-6 inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 font-medium">
          See recommendations
        </button>
      </form>
    </div>
  )
}

function RecommendPage() {
  const [recs, setRecs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [featured, setFeatured] = useState(null)

  useEffect(() => {
    let ignore = false
    async function run() {
      const userId = localStorage.getItem('user_id') || '1'
      const qs = new URLSearchParams(window.location.search)
      qs.set('n', '12')
      try {
        const res = await fetch(`${API_BASE}/recommend/${encodeURIComponent(userId)}?${qs.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch recommendations')
        const data = await res.json()
        const list = Array.isArray(data.recommendations) ? data.recommendations : []
        if (!ignore) {
          setRecs(list)
          setFeatured(list[0] || null)
        }
      } catch (e) {
        if (!ignore) setError(e.message || 'Error fetching recs')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => { ignore = true }
  }, [])

  if (loading) return <div className="text-slate-400">Loading…</div>
  if (error) return <div className="text-rose-400">{error}</div>

  return (
    <div className="flex flex-col gap-10">
      {featured && (
        <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[radial-gradient(1200px_500px_at_80%_-20%,#7c3aed20,transparent),linear-gradient(to_bottom,#0b1020,#0b1020)]">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            <div className="col-span-2 aspect-[3/1] sm:aspect-[21/9] bg-gradient-to-br from-slate-800 to-slate-900"></div>
            <div className="p-6 flex flex-col gap-3 justify-center">
              <div className="text-xs uppercase tracking-wider text-slate-400">Featured</div>
              <h2 className="text-3xl font-semibold leading-tight line-clamp-2">{featured.title}</h2>
              <div className="text-sm text-slate-400">Predicted rating <span className="text-slate-200 font-medium">{featured.predicted_rating?.toFixed?.(2) ?? featured.predicted_rating}</span></div>
              <div className="mt-2 flex gap-2">
                <button className="rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-medium">Play trailer</button>
                <button className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-medium">Add to watchlist</button>
              </div>
            </div>
          </div>
        </section>
      )}

      <Section title="Recommendations for you">
        <Carousel>
          {recs.map((r) => (
            <MovieCard key={r.movie_id} title={r.title} score={r.predicted_rating} />
          ))}
        </Carousel>
      </Section>

      <Section title="Popular now">
        <Carousel>
          {recs.slice().reverse().map((r) => (
            <MovieCard key={`p-${r.movie_id}`} title={r.title} score={r.predicted_rating} />
          ))}
        </Carousel>
      </Section>

      <Section title="Browse by genre">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 aspect-video" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 aspect-video" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 aspect-video" />
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Carousel({ children }) {
  return (
    <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-4 min-w-full">
        {children}
      </div>
    </div>
  )
}

function MovieCard({ title, score }) {
  return (
    <div className="w-[220px] shrink-0 rounded-xl overflow-hidden bg-slate-900/50 border border-slate-800 hover:border-violet-600/50 transition shadow-xl shadow-black/20">
      <div className="aspect-[2/3] bg-gradient-to-b from-slate-800 to-slate-900" aria-hidden />
      <div className="p-3 flex items-center justify-between">
        <div className="text-sm font-medium line-clamp-2 pr-2">{title}</div>
        <div className="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700">{score?.toFixed?.(2) ?? score}</div>
      </div>
    </div>
  )
}
