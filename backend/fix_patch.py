with open("models/matrix_factorization.py") as f:
    code = f.read()

code = code.replace("row.user", 'row[\"user\"]')
code = code.replace("row.item", 'row[\"item\"]')
code = code.replace("row.rating", 'row[\"rating\"]')

with open("models/matrix_factorization.py", "w") as f:
    f.write(code)

print("✅ matrix_factorization.py patched successfully!")
