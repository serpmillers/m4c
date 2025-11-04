# ma fork/backend/server.py  (modified)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional
import pickle
import os
import pandas as pd
from utils.preprocess import load_movies

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


# --- Auth models (simple/dummy) ---
class LoginRequest(BaseModel):
    user_id: int
    password: Optional[str] = None

class LoginResponse(BaseModel):
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


@app.get("/")
def root():
    return {"message": "Recommender API is running"}

@app.post("/auth/login", response_model=LoginResponse)
def login(body: LoginRequest):
    # Dummy auth: accept any user_id and return a static token
    return LoginResponse(token="dev-token", user_id=body.user_id)


@app.get("/survey/schema", response_model=SurveySchemaResponse)
def survey_schema():
    if movies is None or movies.empty:
        return SurveySchemaResponse(genres=[], years=[])
    # genres column is pipe-delimited like "Action|Comedy"
    genre_set = set()
    if "genres" in movies.columns:
        for g in movies["genres"].dropna().astype(str):
            for part in g.split("|"):
                if part and part != "(no genres listed)":
                    genre_set.add(part)
    # try to parse year from title like "Movie (1995)"
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
    # In a real app we'd persist preferences; here we just acknowledge
    return {"status": "ok"}


@app.get("/recommend/{user_id}")
def recommend(user_id: int, n: int = 5, genres: Optional[str] = None, min_year: Optional[int] = None, max_year: Optional[int] = None):
    if mf is None:
        return JSONResponse(status_code=503, content={"error": "Model not loaded"})

    # Optional filtering: build allowed item indices based on movies
    allowed_indices = None
    if movies is not None and not movies.empty:
        df = movies
        if genres:
            wanted = set([g.strip() for g in genres.split(',') if g.strip()])
            if "genres" in df.columns:
                df = df[df["genres"].fillna("").apply(lambda s: bool(wanted & set(s.split('|'))))]
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
        # Here we assume movieId aligns with item index as in training
        allowed_indices = set(df["movieId"].astype(int).tolist()) if "movieId" in df.columns else None

    preds = []
    for i in range(mf.n_items):
        if allowed_indices is not None and i not in allowed_indices:
            continue
        preds.append((i, mf.predict(user_id, i)))

    top_n = sorted(preds, key=lambda x: x[1], reverse=True)[:n]

    recs = []
    for i, score in top_n:
        title_row = movies.loc[movies["movieId"] == i, "title"].values if movies is not None and not movies.empty else []
        title = title_row[0] if len(title_row) > 0 else f"Movie {i}"
        recs.append({"movie_id": int(i), "title": title, "predicted_rating": float(score)})

    return {"user_id": user_id, "recommendations": recs}
