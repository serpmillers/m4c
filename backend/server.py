# ma fork/backend/server.py  (modified)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pickle
import os
import pandas as pd

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

# existing code...
@app.get("/")
def root():
    return {"message": "Recommender API is running"}

# your recommend endpoint likely exists already; keep it as-is
# e.g.
@app.get("/recommend/{user_id}")
def recommend(user_id: int, n: int = 5):
    # existing logic that produces recs list
    preds = [mf.predict(user_id, i) for i in range(mf.n_items)]
    top_n = sorted(enumerate(preds), key=lambda x: x[1], reverse=True)[:n]

    recs = []
    for i, score in top_n:
        title_row = movies.loc[movies["movieId"] == i, "title"].values
        title = title_row[0] if len(title_row) > 0 else f"Movie {i}"
        recs.append({"movie_id": int(i), "title": title, "predicted_rating": float(score)})

    return {"user_id": user_id, "recommendations": recs}
