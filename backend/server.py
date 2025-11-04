# ma fork/backend/server.py  (modified)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pickle
import os
import pandas as pd
from utils.preprocess import load_movies
from db import init_db, load_profile as db_load_profile, upsert_profile as db_upsert_profile, load_profile_by_account, load_profile_by_email, next_user_id
from movies_data import MOVIES, get_movie, get_all_movies
from movie_urls import get_streaming_url
import bcrypt

app = FastAPI(title="MAFork Recommender API")

# Allow local dev (adjust origins for production)
origins = [
    "http://localhost:5173",  # Vite default port
    "http://localhost:3000",  # CRA default port if used
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Load artifacts at startup ---
MOVIES_PATH = os.getenv("MOVIES_PATH", "data/movies.csv")
MF_PATH = os.getenv("MF_PATH", "saved_models/mf_model.pkl")

movies = load_movies(MOVIES_PATH) if os.path.exists(MOVIES_PATH) else pd.DataFrame()
mf = None
if os.path.exists(MF_PATH):
    with open(MF_PATH, "rb") as f:
        mf = pickle.load(f)
init_db()

# --- Auth models ---
class LoginRequest(BaseModel):
    account: Optional[str] = None  # username or email
    password: str

class LoginResponse(BaseModel):
    token: str
    user_id: int

class SignupRequest(BaseModel):
    account: str
    email: str
    password: str
    name: Optional[str] = None

class SignupResponse(BaseModel):
    token: str
    user_id: int

# --- Survey models ---
class SurveySchemaResponse(BaseModel):
    genres: List[str]
    years: List[int]

class SurveySubmitRequest(BaseModel):
    user_id: int
    genres: List[str] = []
    min_year: Optional[int] = None
    max_year: Optional[int] = None


class Profile(BaseModel):
    user_id: int
    name: Optional[str] = None
    avatar_data_url: Optional[str] = None  # base64 data URL for preview only (dev)
    account: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None  # write-only
    genres: List[str] = []
    favorites: List[str] = []
    watchlist: List[int] = []  # movie IDs


@app.get("/")
def root():
    return {"message": "Recommender API is running"}

@app.post("/auth/signup", response_model=SignupResponse)
def signup(body: SignupRequest):
    # enforce uniqueness
    if load_profile_by_account(body.account):
        return JSONResponse(status_code=409, content={"error": "Username taken"})
    if load_profile_by_email(body.email):
        return JSONResponse(status_code=409, content={"error": "Email in use"})
    uid = next_user_id()
    pwd_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    row = db_upsert_profile({
        "user_id": uid,
        "name": body.name,
        "account": body.account,
        "email": body.email,
        "password_hash": pwd_hash,
        "genres": [],
        "favorites": []
    })
    return SignupResponse(token="dev-token", user_id=row.user_id)

@app.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest):
    # Accept username or email + password
    row = load_profile_by_account(body.account or "") or load_profile_by_email(body.account or "")
    if row is None or not row.password_hash:
        return JSONResponse(status_code=401, content={"error": "Invalid credentials"})
    try:
        ok = bcrypt.checkpw((body.password or "").encode(), (row.password_hash or "").encode())
    except Exception:
        ok = False
    if not ok:
        return JSONResponse(status_code=401, content={"error": "Invalid credentials"})
    return LoginResponse(token="dev-token", user_id=row.user_id)


@app.get("/survey/schema", response_model=SurveySchemaResponse)
def survey_schema():
    # Use movies_data.py instead of movies.csv
    genre_set = set()
    years = set()
    
    for movie in MOVIES:
        # Collect genres
        if movie.get("genres"):
            for genre in movie["genres"]:
                if genre and genre.strip():
                    genre_set.add(genre.strip())
        # Collect years
        if movie.get("year"):
            years.add(int(movie["year"]))
    
    return SurveySchemaResponse(genres=sorted(genre_set), years=sorted(years))


@app.post("/survey/submit")
def survey_submit(body: SurveySubmitRequest):
    return {"status": "ok"}


@app.get("/profile/{user_id}", response_model=Profile)
def get_profile(user_id: int):
    row = db_load_profile(user_id)
    if row is None:
        prof = {"user_id": user_id, "name": None, "avatar_data_url": None, "genres": [], "favorites": []}
        return Profile(**prof)
    return Profile(**row.to_profile_dict())


@app.post("/profile/{user_id}", response_model=Profile)
def save_profile(user_id: int, body: Profile):
    payload = body.model_dump()
    password_hash = None
    if payload.get("password"):
        try:
            password_hash = bcrypt.hashpw(payload["password"].encode(), bcrypt.gensalt()).decode()
        except Exception:
            password_hash = None
    to_store = {
        "user_id": payload.get("user_id") or user_id,
        "name": payload.get("name"),
        "avatar_data_url": payload.get("avatar_data_url"),
        "account": payload.get("account"),
        "email": payload.get("email"),
        "password_hash": password_hash,
        "genres": payload.get("genres") or [],
        "favorites": payload.get("favorites") or [],
        "watchlist": payload.get("watchlist") or [],
    }
    row = db_upsert_profile(to_store)
    return Profile(**row.to_profile_dict())


@app.get("/image/{movie_id}")
def image(movie_id: int, type: str = "poster"):
    movie = get_movie(movie_id)
    if movie and movie.get("poster_path"):
        # Use TMDB CDN for real movie posters
        base_url = "https://image.tmdb.org/t/p"
        if type == "hero":
            # Use backdrop/original for hero images
            url = f"{base_url}/w1280{movie['poster_path']}"
        else:
            # Use w500 for poster images
            url = f"{base_url}/w500{movie['poster_path']}"
        return RedirectResponse(url)
    # Fallback to placeholder
    if movie:
        seed = movie["title"].replace(" ", "").lower()
        if type == "hero":
            url = f"https://picsum.photos/seed/{seed}/1200/600"
        else:
            url = f"https://picsum.photos/seed/{seed}/400/600"
    else:
        movie_id = max(1, min(500, movie_id))
        if type == "hero":
            url = f"https://picsum.photos/seed/movie{movie_id}/1200/600"
        else:
            url = f"https://picsum.photos/seed/movie{movie_id}/400/600"
    return RedirectResponse(url)

@app.get("/movie/{movie_id}")
def movie_detail(movie_id: int):
    movie = get_movie(movie_id)
    if not movie:
        return JSONResponse(status_code=404, content={"error": "Movie not found"})
    # Add streaming URLs to sources
    result = movie.copy()
    if movie.get("sources"):
        result["source_urls"] = {}
        for source in movie["sources"]:
            result["source_urls"][source] = get_streaming_url(source, movie["title"], movie.get("year"))
    return result

@app.get("/recommend/{user_id}")
def recommend(user_id: int, n: int = 5, genres: Optional[str] = None, min_year: Optional[int] = None, max_year: Optional[int] = None):
    if mf is None:
        return JSONResponse(status_code=503, content={"error": "Model not loaded"})

    # Use movies_data.py for filtering instead of movies.csv
    allowed_movie_ids = None
    
    # Get genres from profile if not provided
    use_genres = genres
    if not use_genres:
        row = db_load_profile(user_id)
        if row is not None:
            prof = row.to_profile_dict()
            if prof.get("genres"):
                use_genres = ",".join(prof["genres"])  # comma-separated
    
    # Get user's watchlist to exclude from recommendations
    user_watchlist = set()
    row = db_load_profile(user_id)
    if row is not None:
        prof = row.to_profile_dict()
        user_watchlist = set(prof.get("watchlist", []))
    
    # Filter movies from movies_data.py
    filtered_movies = MOVIES
    if use_genres:
        wanted_genres = set([g.strip() for g in use_genres.split(',') if g.strip()])
        filtered_movies = [
            m for m in filtered_movies
            if m.get("genres") and wanted_genres & set(m["genres"])
        ]
    
    if min_year is not None or max_year is not None:
        filtered_movies = [
            m for m in filtered_movies
            if (min_year is None or (m.get("year") and m["year"] >= min_year)) and
               (max_year is None or (m.get("year") and m["year"] <= max_year))
        ]
    
    # Exclude movies already in watchlist
    filtered_movies = [
        m for m in filtered_movies
        if m.get("movie_id") not in user_watchlist
    ]
    
    # Map to model indices if movies.csv is available
    allowed_indices = None
    if movies is not None and not movies.empty and "movieId" in movies.columns:
        # Get movie IDs from filtered movies
        allowed_movie_ids = set(m["movie_id"] for m in filtered_movies)
        # Map to indices in the model (assuming movieId in movies.csv corresponds to movie_id in movies_data.py)
        allowed_indices = set(
            movies[movies["movieId"].isin(allowed_movie_ids)]["movieId"].astype(int).tolist()
        )

    preds = []
    for i in range(mf.n_items):
        if allowed_indices is not None and i not in allowed_indices:
            continue
        preds.append((i, mf.predict(user_id, i)))

    top_n = sorted(preds, key=lambda x: x[1], reverse=True)[:n]

    recs = []
    # Use filtered movies from movies_data.py
    available_movie_ids = [m["movie_id"] for m in filtered_movies]
    
    for idx, (i, score) in enumerate(top_n):
        # Map model index to real movie ID from filtered set
        real_movie_id = available_movie_ids[idx % len(available_movie_ids)] if available_movie_ids else None
        movie = get_movie(real_movie_id) if real_movie_id else None
        if movie:
            recs.append({
                "movie_id": movie["movie_id"],
                "title": movie["title"],
                "genres": "|".join(movie["genres"]),
                "predicted_rating": float(score),
                "year": movie.get("year"),
                "rating": movie.get("rating"),
                "trailer_youtube_id": movie.get("trailer_youtube_id")
            })
        else:
            # Fallback
            recs.append({
                "movie_id": int(i),
                "title": f"Movie {i}",
                "genres": "",
                "predicted_rating": float(score)
            })

    return {"user_id": user_id, "recommendations": recs}

@app.get("/watchlist/{user_id}")
def get_watchlist(user_id: int):
    """Get user's watchlist"""
    row = db_load_profile(user_id)
    if row is None:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    prof = row.to_profile_dict()
    watchlist_movie_ids = prof.get("watchlist", [])
    watchlist_movies = []
    for movie_id in watchlist_movie_ids:
        movie = get_movie(movie_id)
        if movie:
            watchlist_movies.append({
                "movie_id": movie["movie_id"],
                "title": movie["title"],
                "year": movie.get("year"),
                "rating": movie.get("rating"),
                "genres": movie.get("genres", []),
                "poster_path": movie.get("poster_path"),
                "trailer_youtube_id": movie.get("trailer_youtube_id")
            })
    return {"watchlist": watchlist_movies}

@app.post("/watchlist/{user_id}/add/{movie_id}")
def add_to_watchlist(user_id: int, movie_id: int):
    """Add a movie to user's watchlist"""
    row = db_load_profile(user_id)
    if row is None:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    
    # Verify movie exists
    movie = get_movie(movie_id)
    if not movie:
        return JSONResponse(status_code=404, content={"error": "Movie not found"})
    
    prof = row.to_profile_dict()
    watchlist = prof.get("watchlist", [])
    
    if movie_id not in watchlist:
        watchlist.append(movie_id)
        to_store = {
            "user_id": user_id,
            "name": prof.get("name"),
            "avatar_data_url": prof.get("avatar_data_url"),
            "account": prof.get("account"),
            "email": prof.get("email"),
            "genres": prof.get("genres", []),
            "favorites": prof.get("favorites", []),
            "watchlist": watchlist,
        }
        db_upsert_profile(to_store)
    
    return {"message": "Added to watchlist", "watchlist": watchlist}

@app.post("/watchlist/{user_id}/remove/{movie_id}")
def remove_from_watchlist(user_id: int, movie_id: int):
    """Remove a movie from user's watchlist"""
    row = db_load_profile(user_id)
    if row is None:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    
    prof = row.to_profile_dict()
    watchlist = prof.get("watchlist", [])
    
    if movie_id in watchlist:
        watchlist = [m for m in watchlist if m != movie_id]
        to_store = {
            "user_id": user_id,
            "name": prof.get("name"),
            "avatar_data_url": prof.get("avatar_data_url"),
            "account": prof.get("account"),
            "email": prof.get("email"),
            "genres": prof.get("genres", []),
            "favorites": prof.get("favorites", []),
            "watchlist": watchlist,
        }
        db_upsert_profile(to_store)
    
    return {"message": "Removed from watchlist", "watchlist": watchlist}

@app.get("/watchlist/{user_id}/check/{movie_id}")
def check_watchlist(user_id: int, movie_id: int):
    """Check if a movie is in user's watchlist"""
    row = db_load_profile(user_id)
    if row is None:
        return {"in_watchlist": False}
    prof = row.to_profile_dict()
    watchlist = prof.get("watchlist", [])
    return {"in_watchlist": movie_id in watchlist}
