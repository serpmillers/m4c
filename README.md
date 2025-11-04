# Complete Recommender Project (Clean .py files)

This project is a clean, executable recommender system demo with expanded synthetic MovieLens-style data.
Everything is organized into .py modules — no notebooks included.

## Structure
- data/             : contains movies.csv and ratings.csv (expanded synthetic dataset)
- models/           : matrix_factorization.py, deep_learning_model.py
- utils/            : preprocess.py
- main.py           : entry point that trains MF and DL models
- requirements.txt  : Python package requirements

## Quick start
1. Create virtualenv and activate it:
   python -m venv venv
   source venv/bin/activate   # or venv\Scripts\activate on Windows
2. Install requirements:
   pip install -r requirements.txt
3. Run demo:
   python main.py

The script will print progress for Matrix Factorization training (SGD) and for the PyTorch neural recommender.
