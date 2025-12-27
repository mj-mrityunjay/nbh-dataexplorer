import os
import pandas as pd

# Path to data folder
data_dir = 'nbh-data'

# Function to load all CSVs from subfolders
def load_data():
    data = {}
    for root, dirs, files in os.walk(data_dir):
        for file in files:
            if file.endswith('.csv'):
                filepath = os.path.join(root, file)
                try:
                    df = pd.read_csv(filepath)
                    if not df.empty:
                        data[file] = df
                        print(f"Loaded CSV: {file} with {len(df)} rows")
                except Exception as e:
                    print(f"Error loading {file}: {e}")
            elif file.endswith('.xlsx'):
                filepath = os.path.join(root, file)
                try:
                    df = pd.read_excel(filepath)
                    if not df.empty:
                        data[file] = df
                        print(f"Loaded XLSX: {file} with {len(df)} rows")
                except Exception as e:
                    print(f"Error loading {file}: {e}")
    return data

# Load data
print("Loading data...")
data = load_data()
print(f"Total data sources: {len(data)}")

# Show what we loaded
for filename, df in data.items():
    print(f"\n{filename}:")
    print(f"  Shape: {df.shape}")
    print(f"  Columns: {list(df.columns)}")
