import piexif

path = 'Nizhniy Novgorod_Photo Nizhniy 800_003.jpg'
exif = piexif.load(path)

print('=== 0th IFD ===')
for k, v in sorted(exif.get('0th', {}).items()):
    name = piexif.TAGS['0th'].get(k, {}).get('name', str(k))
    if isinstance(v, tuple):
        val = bytes(v).decode('utf-16-le', errors='ignore').replace(chr(0),'')[:80]
    elif isinstance(v, bytes):
        val = v.decode('utf-8', errors='ignore')[:80]
    else:
        val = str(v)[:80]
    print(f'{name}: {val}')

print()
print('=== Exif IFD ===')
for k, v in sorted(exif.get('Exif', {}).items()):
    name = piexif.TAGS['Exif'].get(k, {}).get('name', str(k))
    if isinstance(v, bytes):
        val = v.decode('utf-8', errors='ignore')[:60]
    else:
        val = str(v)[:60]
    print(f'{name}: {val}')

print()
print('=== GPS IFD ===')
for k, v in sorted(exif.get('GPS', {}).items()):
    name = piexif.TAGS['GPS'].get(k, {}).get('name', str(k))
    print(f'{name}: {v}')
