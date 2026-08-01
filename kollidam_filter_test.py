import json

with open('E:/river network.geojson', encoding='utf-8') as f:
    data = json.load(f)

features = data['features']

# Show all unique river names to understand what is in the dataset
river_names = {}
for feat in features:
    if feat.get('properties', {}).get('waterway') == 'river':
        name = feat.get('properties', {}).get('name', 'unnamed')
        river_names[name] = river_names.get(name, 0) + 1

print('Unique river names and segment counts:')
for name, count in sorted(river_names.items(), key=lambda x: -x[1]):
    print(f'  {name}: {count} segments')

# Kollidam specific: named Kollidam + connected unnamed segments along main channel
# Main Kollidam channel runs lat 10.82-11.45, lng 78.55-79.90
# Use name-based filter first
KOLLIDAM_NAMES = {'Kollidam', 'Coleroon', 'Koleroon'}
kollidam_explicit = [f for f in features if f.get('properties', {}).get('name', '') in KOLLIDAM_NAMES]
print('\nExplicit Kollidam named segments:', len(kollidam_explicit))
for feat in kollidam_explicit:
    coords = feat['geometry']['coordinates']
    props = feat['properties']
    print(f"  name={props.get('name')} id={props.get('@id')} coords={len(coords)} start=[{coords[0][1]:.4f},{coords[0][0]:.4f}] end=[{coords[-1][1]:.4f},{coords[-1][0]:.4f}]")
