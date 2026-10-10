"""Rebuild from official source caches; fetch_sources.py and fetch_map.py refresh them."""
import sys,re,json,math
from pathlib import Path
from urllib.parse import quote,urljoin
from datetime import date
sys.path.insert(0,str(Path(__file__).parent/'.tools'))
from bs4 import BeautifulSoup
ROOT='https://www.ntu.edu.sg/life-at-ntu/accommodation/undergraduate-housing/detail/'
PINS=[1003243626,1003242794,1003243588,1003242795,1003242802,1003243210,1003243437,1003243567,1003243566,1003243565,1003243582,1003243609,1003243568,1003243583,1003243572,1003243559,1003243158,1003243153,1003243621,1003243617,1003243623,1003243631,1003243616]
NAMES=[f'Hall {i}' for i in range(1,17)]+['Crescent Hall','Pioneer Hall','Binjai Hall','Tanjong Hall','Banyan Hall','Saraca Hall','Tamarind Hall']
def clean(el): return re.sub(r'\s+',' ',el.get_text(' ',strip=True)).strip() if el else ''
def distance(a,b):
    lng1,lat1=map(math.radians,a);lng2,lat2=map(math.radians,b)
    h=math.sin((lat2-lat1)/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin((lng2-lng1)/2)**2
    return round(6371000*2*math.asin(math.sqrt(h)))
def link(pid): return 'https://maps.ntu.edu.sg/?mazemap_share_url='+quote(f'https://use.mazemap.com/?config=ntu-sg&sharepoi={pid}',safe='')
def main():
    points=json.loads(Path('sources/map-points.json').read_text())
    points=[p for p in points if p.get('poiId') and 103.66<p['point']['coordinates'][0]<103.70 and 1.33<p['point']['coordinates'][1]<1.37]
    byid={p['poiId']:p for p in points}
    def pname(p):return (p.get('poiNames') or [re.sub('<[^>]+>','',p.get('title',''))])[0].strip()
    def nearest(coord,pool):
        result=[];seen=set()
        for p in sorted(pool,key=lambda p:distance(coord,p['point']['coordinates'])):
            name=pname(p)
            if name in seen:continue
            seen.add(name);result.append(dict(name=name,distance_m=distance(coord,p['point']['coordinates']),map_url=link(p['poiId'])))
        return result
    foods=[p for p in points if 'Food Court' in pname(p) and 'Food and Beverages Outlet' in p.get('typeNames',[]) and 'IFC' not in pname(p)]
    buses=[p for p in points if 'Bus Stop' in p.get('typeNames',[])]
    schools=[byid[x] for x in [1003208437,1003169823,1003158218,1003168650,1003176112,1003172770,1003183531,1003183307,1003174522,1003208760,1003199373] if x in byid]
    schools += [p for p in points if p['solrId'].startswith('bld') and any(x in pname(p) for x in ['School of Art','School of Biological','School of Electrical','School of Physical','Wee Kim Wee','National Institute of Education'])]
    halls=[]
    for name,pid in zip(NAMES,PINS):
        slug=name.lower().replace(' ','-');s=BeautifulSoup(Path(f'sources/{slug}.html').read_text(encoding='utf-8'),'html.parser')
        summary=clean(s.select_one('.accommodation-detail__info')).replace('Room Amenities:','').strip()
        bath=[x for x,pattern in [('Common','Common'),('Attached','Attached'),('En-suite','Shared')] if pattern in summary]
        air='Air-con & Non air-con' if 'Non air-con' in summary and 'Air-con' in summary else ('Non air-con' if 'Non air-con' in summary else 'Air-con')
        table=s.select_one('.accommodation-detail__content table');years=re.findall(r'AY(\d{4})/(\d{2})',clean(table.find('tr')));rates=[]
        for row in table.select('tr')[1:]:
            cols=[clean(c) for c in row.find_all(['td','th'])]
            if len(cols)!=len(years)+1 or not re.search('Single|Double',cols[0]):continue
            r={'room_type':cols[0]}
            for (y,end),v in zip(years,cols[1:]):r[f'ay{y[2:]}_{end}_rate']=v.replace(',','')
            rates.append(r)
        if name != 'Hall 2' and any(re.search(r'en-suite|dedicated bathroom',r['room_type'],re.I) for r in rates) and 'Attached' not in bath: bath.append('Attached')
        assert rates and any('ay26_27_rate' in r for r in rates),slug
        amenities={}
        for row in s.select('#tab-1 table tr')[1:]:
            cells=[clean(c) for c in row.select('td')]
            if len(cells)==4:
                key=re.sub(r'\(\*?with Printing [Ff]acilities\)','',cells[0]).strip();amenities[key]=dict(zip(['location','opening_days','opening_hours'],cells[1:]))
        other=' '.join(clean(p) for p in s.select('#tab-1 p') if 'Other Amenities:' in clean(p)).replace('Other Amenities:','').strip()
        info=clean(s.select_one('#tab-4'));sizes={}
        for key,pattern in [('single',r'Single Room Size(?: Room Size)?'),('double',r'Double Room Size'),('single_ensuite',r'Single Room with Ensuite Toilet Size')]:
            m=re.search(pattern+r'\s*:\s*([\d.]+\s*sqm)',info,re.I);sizes[key]=m.group(1) if m else 'Not listed'
        cap=re.search(r'Capacity:\s*(\d+\s*beds)',info,re.I);mattress=re.search(r'Bed Mattress Size:\s*([\d.]+\s*cm\s*x\s*[\d.]+\s*cm\s*x\s*[\d.]+\s*cm)',info,re.I)
        images=[urljoin(ROOT,i.get('data-src') or i.get('src')) for i in s.select('.accommodation-detail__gallery img') if i.get('data-src') or i.get('src')]
        layouts=[dict(url=urljoin(ROOT,i['src']),label=i.get('alt','Room layout')) for i in s.select('#tab-3 img[src]')]
        pin=byid[pid];coord=pin['point']['coordinates'];food=nearest(coord,foods)[:3];bus=nearest(coord,buses)[:3];academic=nearest(coord,schools)
        description=f'{name} offers '+summary.lower().replace('|',',')+'.'
        if name in ['Binjai Hall','Tanjong Hall','Banyan Hall']:description+=' Part of North Hill, opened in 2016, with shared sky lounge, gym and design studios.'
        if name in ['Crescent Hall','Pioneer Hall']:description+=' Opened in 2014. The connected CresPion halls share an Innovation Garage for practical workshops.'
        if name in ['Hall 7','Saraca Hall','Tamarind Hall']:description+=' Part of Nanyang Crescent, opened in 2017 and designed around environmental sustainability.'
        if name in ['Hall 3','Hall 16']:description+=' Located near the National Institute of Education and North Spine.'
        if name in ['Hall 8','Hall 9']:description+=' Located in the residential area near the School of Art, Design and Media.'
        if name in ['Hall 12','Hall 13']:description+=' The neighbouring halls share an outdoor amphitheatre for student activities.'
        if name in ['Hall 14','Hall 15']:description+=' Located beside the campus running track and wooded areas.'
        if name=='Hall 4':description+=' Overlooks Yunnan Garden.'
        if name=='Hall 5':description+=' Features vertical green walls following its refurbishment.'
        if name=='Hall 10':description+=' Offers astrophotography among its residential education activities.'
        if name=='Hall 11':description+=' Features villa-style buildings and residential education activities.'
        if name=='Hall 2':description+=' Known for its two-storey architecture.'
        if name=='Hall 1':description+=' Temporarily at 30 Nanyang Link from 1 June 2026 during renovation. Return to the original hall is expected in mid-July 2027.'
        if name=='Hall 6':description+=' Reopened in July 2026 following refurbishment, close to the Sports and Recreation Centre.'
        halls.append(dict(name=name,slug=slug,official_title=clean(s.select_one('.accommodation-detail__title')),description=description,address=clean(s.select_one('a.location')),room_amenities_summary=summary,bathroom_types=bath,bathroom_type=' / '.join(bath),aircon=air,renting_rates=rates,rate_years=[f'ay{y[2:]}_{e}_rate' for y,e in years],amenities=amenities,other_amenities_text=other,room_sizes=sizes,capacity=cap.group(1) if cap else 'Not listed',mattress_size=mattress.group(1) if mattress else 'Not listed',has_lift='Yes' if re.search('lift|elevator',other,re.I) else 'Not listed',images=images,room_layouts=layouts,contact=clean(s.select_one('.contact-widget__body')),office_hours=clean(s.select_one('#operating-hours')),additional_info=clean(s.select_one('#additional-info')),source_url=ROOT+slug,checked_on=str(date.today()),map_url=link(pid),map_reference=pname(pin),coords=dict(lat=coord[1],lng=coord[0]),dist_to_ns=distance(coord,byid[1002358792]['point']['coordinates']),dist_to_ss=distance(coord,byid[1002358793]['point']['coordinates']),closest_school=academic[0]['name'],closest_school_dist=academic[0]['distance_m'],all_school_distances={p['name']:p['distance_m'] for p in academic},nearby_schools=academic[:3],nearby_food=food,nearby_bus_stops=bus,near_canteen=food[0]['name'] if food else 'Not listed',bus_stop=bus[0]['name'] if bus else 'Not listed'))
    Path('halls.json').write_text(json.dumps(halls,ensure_ascii=False,indent=2),encoding='utf-8');print(f'Built {len(halls)} halls')
if __name__=='__main__':main()
