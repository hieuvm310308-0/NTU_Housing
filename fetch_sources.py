"""Cache official public pages for the housing data refresh."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / '.tools'))
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from concurrent.futures import ThreadPoolExecutor

ROOT = 'https://www.ntu.edu.sg/life-at-ntu/accommodation/undergraduate-housing'
CACHE = Path('sources')
CACHE.mkdir(exist_ok=True)

def fetch(url, filename):
    response = requests.get(url, timeout=45)
    response.raise_for_status()
    (CACHE / filename).write_text(response.text, encoding='utf-8')
    return response.text

if __name__ == '__main__':
    index = fetch(ROOT, 'housing.html')
    soup = BeautifulSoup(index, 'html.parser')
    urls = sorted({urljoin(ROOT, link['href']) for link in soup.select('a[href]')
                   if '/undergraduate-housing/detail/' in link['href']})
    def hall(url):
        slug = url.rstrip('/').split('/')[-1]
        fetch(url, slug + '.html')
        print('Fetched ' + slug, flush=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(hall, urls))
    print(f'Fetched {len(urls)} official hall pages')
