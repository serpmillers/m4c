import pandas as pd

def load_ratings(path="data/ratings.csv"):
    df = pd.read_csv(path)
    # ensure columns exist
    expected = {"userId","movieId","rating"}
    if not expected.issubset(set(df.columns)):
        raise ValueError(f"ratings.csv must contain columns: {expected}")
    return df

def load_movies(path="data/movies.csv"):
    df = pd.read_csv(path)
    return df

def map_ids(df):
    users = df['userId'].unique().tolist()
    items = df['movieId'].unique().tolist()
    user2idx = {u:i for i,u in enumerate(users)}
    item2idx = {m:i for i,m in enumerate(items)}
    df['user'] = df['userId'].map(user2idx)
    df['item'] = df['movieId'].map(item2idx)
    return df, user2idx, item2idx
