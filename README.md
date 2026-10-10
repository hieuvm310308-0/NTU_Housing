# 🏠 NTU Undergraduate Housing Finder & Comparer

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen?style=for-the-badge&logo=github)](https://hieuvm310308-0.github.io/NTU_Housing/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

An interactive, modern web application designed to help Nanyang Technological University (NTU) students explore, search, filter, and compare room rates, amenities, bathroom configurations, and locations across all **23 Halls of Residence**.

---

## ✨ Features

- 🔍 **Real-Time Search & Multi-Filter**: Filter halls instantly by Room Type (Single / Double), Aircon availability, Bathroom type (En-suite / Common), Gender allocation, or custom search query.
- ⚖️ **Side-by-Side Hall Comparison**: Select 2–3 halls and use Comparison Table or Compare Specs to compare monthly rents for matching room configurations, bathroom setup, and key amenities. Unlisted configurations show “Not offered”; unpublished prices show “Rate unavailable”.
- 🌓 **Dark / Light Theme Toggle**: Seamless glassmorphism UI styled with modern fonts, HSL color tokens, and smooth micro-animations.
- 📱 **Fully Responsive**: Optimized for desktop, tablet, and mobile viewing.
- 📊 **Automated Data Pipeline**: Includes a Python web scraper (`scraper.py`) that collects housing details, fees, and configurations from official NTU housing portals into structured JSON (`halls.json`).

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Custom Glassmorphism Design System)
- **Icons & Fonts**: [Lucide Icons](https://lucide.dev/), [Outfit](https://fonts.google.com/specimen/Outfit), [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)
- **Data Scraper**: Python (`requests`, `beautifulsoup4`)
- **Hosting**: GitHub Pages

---

## 🚀 Live Demo

Access the live application hosted on GitHub Pages:
👉 **[https://hieuvm310308-0.github.io/NTU_Housing/](https://hieuvm310308-0.github.io/NTU_Housing/)**

---

## 💻 Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hieuvm310308-0/NTU_Housing.git
   cd NTU_Housing
   ```

2. **Run locally**:
   Since the app uses standard static web technologies, you can open `index.html` directly in your browser or run a simple local web server:

   *Using Python:*
   ```bash
   python -m http.server 8000
   ```
   Then visit `http://localhost:8000` in your web browser.

   *Using VS Code:*
   Open with the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension.

---

## 🐍 Data Scraper (Optional)

To refresh or update hall information directly from NTU housing pages:

1. Install requirements:
   ```bash
   pip install requests beautifulsoup4
   ```
2. Execute the scraper script:
   ```bash
   python scraper.py
   ```
   This will update `halls.json` with the latest hall details and rates.

---

## Local Customization

Customized by **Vu Minh Hieu**, including comparison navigation and room-price improvements. The housing assistant is named **Lyon**.

Based on [KNN-07/NTU_Housing](https://github.com/KNN-07/NTU_Housing).

To publish on GitHub Pages, choose **Settings → Pages → Deploy from a branch**, select **main** and **/(root)**, then save.

Run the comparison checks with `node --test tests/comparison.test.cjs`.

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
