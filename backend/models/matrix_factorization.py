import numpy as np
from sklearn.metrics import mean_squared_error

class MatrixFactorization:
    def __init__(self, n_users, n_items, n_factors=20, lr=0.01, reg=0.0, epochs=10, verbose=True):
        self.n_users = n_users
        self.n_items = n_items
        self.n_factors = n_factors
        self.lr = lr
        self.reg = reg
        self.epochs = epochs
        self.verbose = verbose
        self.U = np.random.normal(scale=0.1, size=(n_users, n_factors))
        self.V = np.random.normal(scale=0.1, size=(n_items, n_factors))

    def train(self, train_df, test_df=None):
        for epoch in range(1, self.epochs + 1):
            # SGD over training examples
            for _, row in train_df.iterrows():
                u = int(row["user"])
                i = int(row["item"])
                r = float(row["rating"])
                pred = np.dot(self.U[u], self.V[i])
                err = r - pred
                # gradients with optional L2 regularization
                self.U[u] += self.lr * (err * self.V[i] - self.reg * self.U[u])
                self.V[i] += self.lr * (err * self.U[u] - self.reg * self.V[i])
            if test_df is not None and len(test_df) > 0:
                preds = [np.dot(self.U[int(r["user"])], self.V[int(r["item"])]) for _, r in test_df.iterrows()]
                mse = mean_squared_error(test_df["rating"], preds)
                rmse = float(mse) ** 0.5
                if self.verbose:
                    print(f"[MF] Epoch {epoch}/{self.epochs} - RMSE: {rmse:.4f}")
        return self

    def predict(self, user_idx, item_idx):
        return float(np.dot(self.U[user_idx], self.V[item_idx]))
