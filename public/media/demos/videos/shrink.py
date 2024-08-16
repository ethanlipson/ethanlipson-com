import os

videos = [
    "boids",
    "fluid",
    "metaballs-3d",
    "jets",
    "cloth",
    "julia-sets",
    "gravity",
    "non-euclidean",
]

for video in videos:
    # os.system(f'ffmpeg -i {video}.mp4 -vf "fps=24,scale=240x240" {video}-small.mp4')
    # os.system(f"trash {video}.mp4")
    os.system(f"mv {video}-small.mp4 {video}.mp4")
