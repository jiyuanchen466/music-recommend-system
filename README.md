# 🎵 Music Recommend System

An intelligent music recommendation system that leverages **CNN image recognition** and **semantic mapping** to recommend music based on visual input (e.g., scene images, emotion images, or album artwork).

---

## 📖 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Music Recommend System is an AI-powered application that bridges the gap between visual content and music. By analyzing images through a Convolutional Neural Network (CNN), the system extracts semantic features and maps them to music genres, moods, and tracks — delivering a personalised music recommendation experience.

---

## Features

- 🖼️ **Image-based music recommendation** – Upload an image and receive music recommendations that match its mood or scene.
- 🧠 **CNN image recognition** – Deep learning model classifies images into semantic categories (e.g., happy, sad, energetic, calm).
- 🔗 **Semantic mapping** – Maps visual features to music attributes such as genre, tempo, and mood.
- 🎧 **Personalised playlists** – Generates curated playlists based on the recognised scene or emotion.
- 📊 **Similarity scoring** – Ranks recommendations by relevance score.

---

## System Architecture

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Image Input   │──────▶│  CNN Classifier  │──────▶│ Semantic Mapper │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                              │
                                                              ▼
                                                   ┌─────────────────────┐
                                                   │  Music Recommender  │
                                                   │  (Track / Playlist) │
                                                   └─────────────────────┘
```

1. **Image Input** – User uploads an image (JPEG/PNG).
2. **CNN Classifier** – Pre-trained CNN model extracts high-level visual features and predicts a semantic label.
3. **Semantic Mapper** – Maps the predicted label to a set of music mood/genre attributes.
4. **Music Recommender** – Queries the music database and returns ranked recommendations.

---

## Prerequisites

- Python 3.8+
- pip / conda
- (Optional) CUDA-enabled GPU for faster inference

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/jiyuanchen466/music-recommend-system.git
cd music-recommend-system

# 2. Create and activate a virtual environment (recommended)
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Usage

### Command-line

```bash
python recommend.py --image path/to/your/image.jpg
```

### Web Interface

```bash
python app.py
# Open http://localhost:5000 in your browser
```

### Example

```python
from recommender import MusicRecommender

rec = MusicRecommender()
results = rec.recommend(image_path="sunset.jpg", top_k=5)
for track in results:
    print(track)
```

---

## Project Structure

```
music-recommend-system/
├── models/               # Trained CNN model weights
├── data/                 # Music dataset and image samples
├── src/
│   ├── cnn/              # CNN model definition and training scripts
│   ├── mapping/          # Semantic mapping logic
│   └── recommender/      # Recommendation engine
├── app.py                # Web application entry point
├── recommend.py          # CLI entry point
├── requirements.txt      # Python dependencies
└── README.md             # Project documentation
```

---

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`.
3. Commit your changes: `git commit -m "feat: add your feature"`.
4. Push to the branch: `git push origin feature/your-feature-name`.
5. Open a Pull Request.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

> Made with ❤️ by [jiyuanchen466](https://github.com/jiyuanchen466)
