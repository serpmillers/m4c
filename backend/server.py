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
    if movies is None or movies.empty:
        return SurveySchemaResponse(genres=[], years=[])
    def normalize_genres(s: str) -> List[str]:
        parts = []
        for token in str(s).split('|'):
            t = token.strip().strip('()').strip()
            if t and t.lower() != 'no genres listed':
                parts.append(t)
        return parts
    genre_set = set()
    if "genres" in movies.columns:
        for g in movies["genres"].dropna().astype(str):
            for part in normalize_genres(g):
                genre_set.add(part)
    years = set()
    if "title" in movies.columns:
        for t in movies["title"].dropna().astype(str):
            if t.endswith(")") and "(" in t:
                y = t.rsplit("(", 1)[-1].rstrip(")")
                if y.isdigit():
                    years.add(int(y))
    years_list = sorted(years)
    return SurveySchemaResponse(genres=sorted(genre_set), years=years_list)


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
    }
    row = db_upsert_profile(to_store)
    return Profile(**row.to_profile_dict())


@app.get("/image/{movie_id}")
def image(movie_id: int, type: str = "poster"):
    movie_id = max(1, min(500, movie_id))
    if type == "hero":
        url = f"https://picsum.photos/seed/movie{movie_id}/1200/600"
    else:
        url = f"https://picsum.photos/seed/movie{movie_id}/400/600"
    return RedirectResponse(url)

@app.get("/recommend/{user_id}")
def recommend(user_id: int, n: int = 5, genres: Optional[str] = None, min_year: Optional[int] = None, max_year: Optional[int] = None):
    if mf is None:
        return JSONResponse(status_code=503, content={"error": "Model not loaded"})

    allowed_indices = None
    if movies is not None and not movies.empty:
        df = movies
        use_genres = genres
        if not use_genres:
            row = db_load_profile(user_id)
            if row is not None:
                prof = row.to_profile_dict()
                if prof.get("genres"):
                    use_genres = ",".join(prof["genres"])  # comma-separated
        if use_genres:
            wanted = set([g.strip().strip('()').strip() for g in use_genres.split(',') if g.strip()])
            if "genres" in df.columns:
                def row_matches(s: str) -> bool:
                    tokens = [t.strip().strip('()').strip() for t in str(s).split('|') if t.strip()]
                    return bool(wanted & set(tokens))
                df = df[df["genres"].fillna("").apply(row_matches)]
        if min_year is not None or max_year is not None:
            def parse_year(t):
                if isinstance(t, str) and t.endswith(")") and "(" in t:
                    y = t.rsplit("(", 1)[-1].rstrip(")")
                    return int(y) if y.isdigit() else None
                return None
            years = df["title"].apply(parse_year) if "title" in df.columns else None
            if years is not None:
                df = df.copy()
                df["year"] = years
                if min_year is not None:
                    df = df[df["year"].fillna(0) >= int(min_year)]
                if max_year is not None:
                    df = df[df["year"].fillna(9999) <= int(max_year)]
        allowed_indices = set(df["movieId"].astype(int).tolist()) if "movieId" in df.columns else None

    preds = []
    for i in range(mf.n_items):
        if allowed_indices is not None and i not in allowed_indices:
            continue
        preds.append((i, mf.predict(user_id, i)))

    top_n = sorted(preds, key=lambda x: x[1], reverse=True)[:n]

    recs = []
    for i, score in top_n:
        if movies is not None and not movies.empty:
            row = movies.loc[movies["movieId"] == i]
            title = row["title"].values[0] if len(row) > 0 and "title" in row else f"Movie {i}"
            genres = row["genres"].values[0] if len(row) > 0 and "genres" in row else ""
        else:
            title = f"Movie {i}"
            genres = ""
        recs.append({
            "movie_id": int(i),
            "title": title,
            "genres": genres,
            "predicted_rating": float(score)
        })

    return {"user_id": user_id, "recommendations": recs}
