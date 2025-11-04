import torch
import torch.nn as nn
from sklearn.metrics import mean_squared_error
import numpy as np

class NeuralRecommender(nn.Module):
    def __init__(self, n_users, n_items, n_factors=32, hidden_dims=[128,64]):
        super().__init__()
        self.user_embed = nn.Embedding(n_users, n_factors)
        self.item_embed = nn.Embedding(n_items, n_factors)
        layers = []
        input_dim = n_factors*2
        for h in hidden_dims:
            layers.append(nn.Linear(input_dim, h))
            layers.append(nn.ReLU())
            input_dim = h
        layers.append(nn.Linear(input_dim, 1))
        self.net = nn.Sequential(*layers)

    def forward(self, users, items):
        u = self.user_embed(users)
        i = self.item_embed(items)
        x = torch.cat([u, i], dim=1)
        return self.net(x).squeeze(1)

def train_model(model, train_df, test_df=None, epochs=5, batch_size=1024, lr=1e-3, device='cpu'):
    model.to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    criterion = nn.MSELoss()
    users = torch.LongTensor(train_df.user.values)
    items = torch.LongTensor(train_df.item.values)
    ratings = torch.FloatTensor(train_df.rating.values)
    dataset = torch.utils.data.TensorDataset(users, items, ratings)
    loader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
    for epoch in range(1, epochs+1):
        model.train()
        total_loss = 0.0
        for bu, bi, br in loader:
            bu = bu.to(device); bi = bi.to(device); br = br.to(device)
            optimizer.zero_grad()
            outputs = model(bu, bi)
            loss = criterion(outputs, br)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * bu.size(0)
        avg_loss = total_loss / len(train_df)
        if test_df is not None and len(test_df)>0:
            model.eval()
            with torch.no_grad():
                tu = torch.LongTensor(test_df.user.values).to(device)
                ti = torch.LongTensor(test_df.item.values).to(device)
                preds = model(tu, ti).cpu().numpy()
                mse = mean_squared_error(test_df.rating.values, preds)
                rmse = float(mse) ** 0.5
                print(f"[DL] Epoch {epoch}/{epochs} - TrainLoss: {avg_loss:.4f} - TestRMSE: {rmse:.4f}")
        else:
            print(f"[DL] Epoch {epoch}/{epochs} - TrainLoss: {avg_loss:.4f}")
    return model
