"""Read the public MazeMap search service used by maps.ntu.edu.sg."""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / '.tools'))
import requests
from concurrent.futures import ThreadPoolExecutor

QUERIES = ['Hall', '30 Nanyang Link', 'North Spine', 'South Spine', 'Food Court',
           'Bus Stop', 'School', 'College', 'National Institute', 'Canteen', 'Sports']
QUERIES += [f'Hall {n}' for n in range(1, 17)]
QUERIES += ['Binjai Hall', 'Tanjong Hall', 'Banyan Hall', 'Saraca Hall',
            'Tamarind Hall', 'Crescent Hall', 'Pioneer Hall']
def search(query):
    response = requests.get('https://search.mazemap.com/search/equery/', params={
        'q': query, 'campuscollectiontag': 'ntu-sg', 'rows': 1000,
        'withpois': 'true', 'withbuilding': 'true', 'withcampus': 'true', 'withtype': 'true'
    }, timeout=45)
    response.raise_for_status()
    data = response.json()
    Path('sources/map-' + query.lower().replace(' ', '-') + '.json').write_text(json.dumps(data), encoding='utf-8')
    print(query, len(data.get('result', [])), flush=True)
    return data.get('result', [])
if __name__ == '__main__':
    with ThreadPoolExecutor(max_workers=3) as pool:
        groups = list(pool.map(search, QUERIES))
    points = {item['solrId']: item for group in groups for item in group if item.get('point')}
    Path('sources/map-points.json').write_text(json.dumps(list(points.values()), indent=2), encoding='utf-8')
    print(f'{len(points)} unique points cached')
