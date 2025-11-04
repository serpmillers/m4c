import os
import argparse
import pickle
import pandas as pd
import torch
from sklearn.model_selection import train_test_split
from utils.preprocess import load_ratings, load_movies, map_ids
from models.matrix_factorization import MatrixFactorization
from models.deep_learning_model import NeuralRecommender, train_model


def recommend_top_n(model, user_id, movies, num_items, n=5):
    predictions = [model.predict(user_id, i) for i in range(num_items)]
    top_n = sorted(enumerate(predictions), key=lambda x: x[1], reverse=True)[:n]

    print(f"\nTop {n} recommended movies for user {user_id}:")
    for i, score in top_n:
        movie_title = movies.loc[movies["movieId"] == i, "title"].values
        title = movie_title[0] if len(movie_title) > 0 else f"Movie {i}"
        print(f"{title} — Predicted Rating: {score:.2f}")


def main(data_path="data/ratings.csv", movies_path="data/movies.csv", test_size=0.2, seed=42):
    print("Loading data...")
    ratings = load_ratings(data_path)
    movies = load_movies(movies_path)
    ratings, user2idx, item2idx = map_ids(ratings)
    n_users = len(user2idx)
    n_items = len(item2idx)
    print(f"Users: {n_users}, Items: {n_items}, Ratings: {len(ratings)}")

    train, test = train_test_split(ratings, test_size=test_size, random_state=seed)

    os.makedirs("saved_models", exist_ok=True)
    mf_path = "saved_models/mf_model.pkl"
    dl_path = "saved_models/dl_model.pth"

    # --- Matrix Factorization ---
    if os.path.exists(mf_path):
        print("\nLoading saved Matrix Factorization model...")
        with open(mf_path, "rb") as f:
            mf = pickle.load(f)
    else:
        print("\nTraining Matrix Factorization (SGD)...")
        mf = MatrixFactorization(n_users, n_items, n_factors=32, lr=0.01, reg=1e-5, epochs=10, verbose=True)
        mf.train(train, test)
        with open(mf_path, "wb") as f:
            pickle.dump(mf, f)
        print("Saved Matrix Factorization model to", mf_path)

    # Example prediction
    sample = test.sample(1).iloc[0]
    user_id = int(sample["user"])
    item_id = int(sample["item"])
    true_rating = float(sample["rating"])
    print(f"MF sample pred (user {user_id} item {item_id}):", mf.predict(user_id, item_id), "true:", true_rating)

    # --- Deep Learning Recommender ---
    if os.path.exists(dl_path):
        print("\nLoading saved Neural Recommender model...")
        dl = NeuralRecommender(n_users, n_items, n_factors=64, hidden_dims=[128, 64])
        dl.load_state_dict(torch.load(dl_path))
    else:
        print("\nTraining Neural Recommender (PyTorch)...")
        dl = NeuralRecommender(n_users, n_items, n_factors=64, hidden_dims=[128, 64])
        train_model(dl, train, test, epochs=10, batch_size=1024, lr=1e-3, device='cpu')
        torch.save(dl.state_dict(), dl_path)
        print("Saved Neural Recommender model to", dl_path)

    print('\nDone.')
    return mf, dl, movies, n_items


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Run recommender system demo')
    parser.add_argument('--data', type=str, default='data/ratings.csv', help='path to ratings.csv')
    parser.add_argument('--movies', type=str, default='data/movies.csv', help='path to movies.csv')
    args = parser.parse_args()

    mf, dl, movies, num_items = main(data_path=args.data, movies_path=args.movies)

    # Example recommendation
    recommend_top_n(mf, user_id=10, movies=movies, num_items=num_items, n=5)
