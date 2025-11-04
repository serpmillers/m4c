from typing import Optional, List
from sqlmodel import SQLModel, Field, create_engine, Session, select
import json
import os

DB_PATH = os.getenv("DB_PATH", "profiles.db")
engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)

class ProfileRow(SQLModel, table=True):
    user_id: int = Field(primary_key=True)
    name: Optional[str] = None
    avatar_data_url: Optional[str] = None
    account: Optional[str] = Field(default=None, index=True)
    email: Optional[str] = Field(default=None, index=True)
    password_hash: Optional[str] = None
    genres_json: Optional[str] = None  # JSON-encoded list[str]
    favorites_json: Optional[str] = None  # JSON-encoded list[str]
    watchlist_json: Optional[str] = None  # JSON-encoded list[int] (movie IDs)

    @staticmethod
    def from_profile_dict(d: dict) -> "ProfileRow":
        return ProfileRow(
            user_id=int(d.get("user_id")),
            name=d.get("name"),
            avatar_data_url=d.get("avatar_data_url"),
            account=d.get("account"),
            email=d.get("email"),
            password_hash=d.get("password_hash"),
            genres_json=json.dumps(d.get("genres") or []),
            favorites_json=json.dumps(d.get("favorites") or []),
            watchlist_json=json.dumps(d.get("watchlist") or []),
        )

    def to_profile_dict(self) -> dict:
        try:
            genres = json.loads(self.genres_json) if self.genres_json else []
        except Exception:
            genres = []
        try:
            favorites = json.loads(self.favorites_json) if self.favorites_json else []
        except Exception:
            favorites = []
        try:
            watchlist = json.loads(self.watchlist_json) if self.watchlist_json else []
        except Exception:
            watchlist = []
        return {
            "user_id": self.user_id,
            "name": self.name,
            "avatar_data_url": self.avatar_data_url,
            "account": self.account,
            "email": self.email,
            # never expose password_hash in API responses
            "genres": genres,
            "favorites": favorites,
            "watchlist": watchlist,
        }

def _column_exists(cursor, table: str, column: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    return column in cols


def init_db() -> None:
    # Create tables if not exist
    SQLModel.metadata.create_all(engine)
    # Lightweight, best-effort migrations for SQLite
    with engine.connect() as conn:
        cursor = conn.connection.cursor()
        # Add columns if missing (older DBs)
        if not _column_exists(cursor, "profilerow", "account"):
            cursor.execute("ALTER TABLE profilerow ADD COLUMN account TEXT")
        if not _column_exists(cursor, "profilerow", "email"):
            cursor.execute("ALTER TABLE profilerow ADD COLUMN email TEXT")
        if not _column_exists(cursor, "profilerow", "password_hash"):
            cursor.execute("ALTER TABLE profilerow ADD COLUMN password_hash TEXT")
        if not _column_exists(cursor, "profilerow", "genres_json"):
            cursor.execute("ALTER TABLE profilerow ADD COLUMN genres_json TEXT")
        if not _column_exists(cursor, "profilerow", "favorites_json"):
            cursor.execute("ALTER TABLE profilerow ADD COLUMN favorites_json TEXT")
        if not _column_exists(cursor, "profilerow", "watchlist_json"):
            cursor.execute("ALTER TABLE profilerow ADD COLUMN watchlist_json TEXT")
        conn.connection.commit()


def get_session() -> Session:
    return Session(engine)


def load_profile(user_id: int) -> Optional[ProfileRow]:
    with get_session() as session:
        return session.exec(select(ProfileRow).where(ProfileRow.user_id == user_id)).first()


def load_profile_by_account(account: str) -> Optional[ProfileRow]:
    with get_session() as session:
        return session.exec(select(ProfileRow).where(ProfileRow.account == account)).first()


def load_profile_by_email(email: str) -> Optional[ProfileRow]:
    with get_session() as session:
        return session.exec(select(ProfileRow).where(ProfileRow.email == email)).first()


def next_user_id() -> int:
    with get_session() as session:
        row = session.exec(select(ProfileRow.user_id).order_by(ProfileRow.user_id.desc())).first()
        return int(row or 0) + 1


def upsert_profile(data: dict) -> ProfileRow:
    row = ProfileRow.from_profile_dict(data)
    with get_session() as session:
        existing = session.exec(select(ProfileRow).where(ProfileRow.user_id == row.user_id)).first()
        if existing is None:
            session.add(row)
        else:
            existing.name = row.name
            existing.avatar_data_url = row.avatar_data_url
            if row.account is not None:
                existing.account = row.account
            if row.email is not None:
                existing.email = row.email
            if row.password_hash is not None:
                existing.password_hash = row.password_hash
            existing.genres_json = row.genres_json
            existing.favorites_json = row.favorites_json
            if row.watchlist_json is not None:
                existing.watchlist_json = row.watchlist_json
            row = existing
        session.commit()
        session.refresh(row)
        return row
