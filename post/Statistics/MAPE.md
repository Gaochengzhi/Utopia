# How do you compare the error between two trajectories? A ChatGPT's answer

after caliberating

The MAPE value between the two datasets is: 6.60%
The SMAPE value between the two datasets is: 3.24%



## Ask:

```txt
I want to calibrate my model parameters. Now I have the simulation data "sumo.csv" and real world data "01_tracks.csv" they all have header "frame, id, x "  which represents the trajectory of different vehicles with their ids over frame (Note that the names and number of ids in the two files are different). How do I calculate the similarity between the trajectories? My advisor suggested calculating MAPE value, or you could do it the other way and just give the code. NOTICE: only compute the first 1000 frame of each table
```

## Answer

To calculate the similarity between the trajectories in "sumo.csv" and "01_tracks.csv", you can use Mean Absolute Percentage Error (MAPE) as suggested by your advisor. Here's a step-by-step process with Python code using the Pandas library:

1. Import the necessary libraries:

   ```python 
   import pandas as pd
   import numpy as np
   ```

   

2. Read the CSV files and filter the data to the first 1000 frames:

```python
sumo_df = pd.read_csv("sumo.csv")
real_df = pd.read_csv("01_tracks.csv")

sumo_df = sumo_df[sumo_df['frame'] < 1000]
real_df = real_df[real_df['frame'] < 1000]
```

3. Normalize the IDs in both datasets by subtracting the minimum ID value:

   ```python
   sumo_df['id'] = sumo_df['id'] - sumo_df['id'].min()
   real_df['id'] = real_df['id'] - real_df['id'].min()
   ```

4. Calculate the MAPE value:

```python
def mape(real_df, sumo_df):
    merged_df = real_df.merge(sumo_df, on=['frame', 'id'], suffixes=('_real', '_sumo'))
    if merged_df.empty:
        raise ValueError("No matching ids found in both datasets.")

    absolute_errors = np.abs(merged_df['x_real'] - merged_df['x_sumo'])
    percentage_errors = absolute_errors / np.abs(merged_df['x_real'])
    mape_value = np.mean(percentage_errors) * 100
    return mape_value

mape_value = mape(real_df, sumo_df)
```

## But

```txt
the id is in different naming system in two table
```

## Answer

If the IDs in the two tables are in different naming systems and you cannot directly match them, you can calculate the similarity between the trajectories by finding the closest matching pairs of IDs. You can do this by calculating the Euclidean distance between the coordinates of the same frame in both datasets.

Here's a step-by-step process with Python code using the Pandas library:

```python
def euclidean_distance(point1, point2):
    return np.sqrt(np.sum((point1 - point2) ** 2))
# Calculate the MAPE value by finding the closest matching pairs of IDs:
def mape(real_df, sumo_df):
    total_percentage_errors = []
    for frame in real_df['frame'].unique():
        real_frame_data = real_df[real_df['frame'] == frame]
        sumo_frame_data = sumo_df[sumo_df['frame'] == frame]

        for _, real_row in real_frame_data.iterrows():
            real_point = np.array([real_row['x']])
            min_distance = float('inf')
            min_sumo_point = None

            for _, sumo_row in sumo_frame_data.iterrows():
                sumo_point = np.array([sumo_row['x']])
                distance = euclidean_distance(real_point, sumo_point)

                if distance < min_distance:
                    min_distance = distance
                    min_sumo_point = sumo_point

            percentage_error = np.abs(real_point - min_sumo_point) / np.abs(real_point)
            total_percentage_errors.append(percentage_error)

    mape_value = np.mean(total_percentage_errors) * 100
    return mape_value

mape_value = mape(real_df, sumo_df)

```

