"""
Image Tag Editor API
Бэкенд для редактирования метаданных изображений
"""

import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
import uvicorn

# Для работы с метаданными изображений
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import piexif
import piexif.helper

app = FastAPI(title="Image Tag Editor API", version="1.0.0")

# CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Папка с изображениями
IMAGES_DIR = Path(__file__).parent
SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.tiff', '.webp'}


class ImageMetadata(BaseModel):
    filename: str
    path: str
    size: tuple
    format: str
    mode: str
    file_size: int
    modified: str
    exif: Dict[str, Any] = {}
    iptc: Dict[str, Any] = {}


class TagUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[List[str]] = None
    author: Optional[str] = None
    copyright: Optional[str] = None
    date: Optional[str] = None
    source: Optional[str] = None


class BulkTagUpdate(BaseModel):
    filenames: List[str]
    tags: TagUpdate


def get_exif_data(image_path: str) -> Dict[str, Any]:
    """Извлекает EXIF данные из изображения"""
    exif_data = {}
    try:
        img = Image.open(image_path)
        exif = img._getexif()
        if exif:
            for tag_id, value in exif.items():
                tag = TAGS.get(tag_id, tag_id)
                # Преобразуем bytes в string для JSON
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='ignore')
                    except:
                        value = str(value)
                exif_data[tag] = value
    except Exception as e:
        pass
    return exif_data


def decode_xp_field(value) -> str:
    """Декодирует XP* поля из EXIF (UTF-16-LE)"""
    if value is None:
        return ''
    
    # Если это tuple байтов (как возвращает piexif)
    if isinstance(value, tuple):
        try:
            byte_data = bytes(value)
            text = byte_data.decode('utf-16-le', errors='ignore')
            text = text.replace('\x00', '').strip()
            return text
        except:
            return ''
    
    # Если это bytes
    if isinstance(value, bytes):
        try:
            text = value.decode('utf-16-le', errors='ignore')
            text = text.replace('\x00', '').strip()
            return text
        except:
            return ''
    
    if isinstance(value, str):
        return value.strip()
    
    return str(value) if value else ''


def decode_ascii_field(value) -> str:
    """Декодирует ASCII/UTF-8 поля"""
    if value is None:
        return ''
    if isinstance(value, bytes):
        return value.decode('utf-8', errors='ignore').strip()
    if isinstance(value, str):
        return value.strip()
    return str(value) if value else ''


def get_iptc_from_exif(image_path: str) -> Dict[str, Any]:
    """Извлекает ВСЕ метаданные из EXIF"""
    data = {
        # Редактируемые поля
        'title': '',
        'description': '',
        'keywords': [],
        'author': '',
        'copyright': '',
        'source': '',
        # Информация о камере
        'make': '',
        'model': '',
        'software': '',
        # Даты
        'datetime': '',
        'datetime_original': '',
        'datetime_digitized': '',
        # Параметры съёмки
        'exposure_time': '',
        'f_number': '',
        'iso': '',
        'focal_length': '',
        'focal_length_35mm': '',
        'exposure_program': '',
        'exposure_mode': '',
        'metering_mode': '',
        'white_balance': '',
        'flash': '',
        # GPS
        'gps_latitude': '',
        'gps_longitude': '',
        'gps_altitude': '',
    }
    
    try:
        exif_dict = piexif.load(image_path)
        zeroth = exif_dict.get("0th", {})
        exif_ifd = exif_dict.get("Exif", {})
        gps_ifd = exif_dict.get("GPS", {})
        
        # === Редактируемые поля ===
        if piexif.ImageIFD.XPTitle in zeroth:
            data['title'] = decode_xp_field(zeroth[piexif.ImageIFD.XPTitle])
        if not data['title'] and piexif.ImageIFD.ImageDescription in zeroth:
            data['title'] = decode_ascii_field(zeroth[piexif.ImageIFD.ImageDescription])
        
        if piexif.ImageIFD.XPComment in zeroth:
            data['description'] = decode_xp_field(zeroth[piexif.ImageIFD.XPComment])
        
        if piexif.ImageIFD.XPSubject in zeroth:
            data['source'] = decode_xp_field(zeroth[piexif.ImageIFD.XPSubject])
        
        if piexif.ImageIFD.XPKeywords in zeroth:
            keywords_str = decode_xp_field(zeroth[piexif.ImageIFD.XPKeywords])
            if keywords_str:
                data['keywords'] = [k.strip() for k in keywords_str.split(';') if k.strip()]
        
        if piexif.ImageIFD.XPAuthor in zeroth:
            data['author'] = decode_xp_field(zeroth[piexif.ImageIFD.XPAuthor])
        if not data['author'] and piexif.ImageIFD.Artist in zeroth:
            data['author'] = decode_ascii_field(zeroth[piexif.ImageIFD.Artist])
        
        if piexif.ImageIFD.Copyright in zeroth:
            data['copyright'] = decode_ascii_field(zeroth[piexif.ImageIFD.Copyright])
        
        # === Камера ===
        if piexif.ImageIFD.Make in zeroth:
            data['make'] = decode_ascii_field(zeroth[piexif.ImageIFD.Make])
        if piexif.ImageIFD.Model in zeroth:
            data['model'] = decode_ascii_field(zeroth[piexif.ImageIFD.Model])
        if piexif.ImageIFD.Software in zeroth:
            data['software'] = decode_ascii_field(zeroth[piexif.ImageIFD.Software])
        
        # === Даты ===
        if piexif.ImageIFD.DateTime in zeroth:
            data['datetime'] = decode_ascii_field(zeroth[piexif.ImageIFD.DateTime])
        if piexif.ExifIFD.DateTimeOriginal in exif_ifd:
            data['datetime_original'] = decode_ascii_field(exif_ifd[piexif.ExifIFD.DateTimeOriginal])
        if piexif.ExifIFD.DateTimeDigitized in exif_ifd:
            data['datetime_digitized'] = decode_ascii_field(exif_ifd[piexif.ExifIFD.DateTimeDigitized])
        
        # === Параметры съёмки ===
        if piexif.ExifIFD.ExposureTime in exif_ifd:
            et = exif_ifd[piexif.ExifIFD.ExposureTime]
            if isinstance(et, tuple) and len(et) == 2:
                data['exposure_time'] = f"{et[0]}/{et[1]}s"
        
        if piexif.ExifIFD.FNumber in exif_ifd:
            fn = exif_ifd[piexif.ExifIFD.FNumber]
            if isinstance(fn, tuple) and len(fn) == 2:
                data['f_number'] = f"f/{fn[0]/fn[1]:.1f}"
        
        if piexif.ExifIFD.ISOSpeedRatings in exif_ifd:
            data['iso'] = str(exif_ifd[piexif.ExifIFD.ISOSpeedRatings])
        
        if piexif.ExifIFD.FocalLength in exif_ifd:
            fl = exif_ifd[piexif.ExifIFD.FocalLength]
            if isinstance(fl, tuple) and len(fl) == 2:
                data['focal_length'] = f"{fl[0]/fl[1]:.1f}mm"
        
        if piexif.ExifIFD.FocalLengthIn35mmFilm in exif_ifd:
            data['focal_length_35mm'] = f"{exif_ifd[piexif.ExifIFD.FocalLengthIn35mmFilm]}mm"
        
        # Программы экспозиции
        exp_programs = {0: 'Не определено', 1: 'Ручной', 2: 'Авто', 3: 'Приор. диафрагмы', 
                       4: 'Приор. выдержки', 5: 'Творческий', 6: 'Действие', 7: 'Портрет', 8: 'Пейзаж'}
        if piexif.ExifIFD.ExposureProgram in exif_ifd:
            data['exposure_program'] = exp_programs.get(exif_ifd[piexif.ExifIFD.ExposureProgram], '')
        
        exp_modes = {0: 'Авто', 1: 'Ручной', 2: 'Брекетинг'}
        if piexif.ExifIFD.ExposureMode in exif_ifd:
            data['exposure_mode'] = exp_modes.get(exif_ifd[piexif.ExifIFD.ExposureMode], '')
        
        metering_modes = {0: 'Неизвестно', 1: 'Средний', 2: 'Центр-взвешен.', 3: 'Точечный', 
                         4: 'Мультизонный', 5: 'Матричный', 6: 'Частичный'}
        if piexif.ExifIFD.MeteringMode in exif_ifd:
            data['metering_mode'] = metering_modes.get(exif_ifd[piexif.ExifIFD.MeteringMode], '')
        
        wb_modes = {0: 'Авто', 1: 'Ручной'}
        if piexif.ExifIFD.WhiteBalance in exif_ifd:
            data['white_balance'] = wb_modes.get(exif_ifd[piexif.ExifIFD.WhiteBalance], '')
        
        if piexif.ExifIFD.Flash in exif_ifd:
            flash_val = exif_ifd[piexif.ExifIFD.Flash]
            data['flash'] = 'Да' if flash_val & 1 else 'Нет'
        
        # === GPS ===
        def convert_gps(gps_data, ref):
            if not gps_data or not isinstance(gps_data, tuple):
                return ''
            try:
                d = gps_data[0][0] / gps_data[0][1] if isinstance(gps_data[0], tuple) else gps_data[0]
                m = gps_data[1][0] / gps_data[1][1] if isinstance(gps_data[1], tuple) else gps_data[1]
                s = gps_data[2][0] / gps_data[2][1] if isinstance(gps_data[2], tuple) else gps_data[2]
                decimal = d + m/60 + s/3600
                if ref in [b'S', b'W', 'S', 'W']:
                    decimal = -decimal
                return f"{decimal:.6f}"
            except:
                return ''
        
        if piexif.GPSIFD.GPSLatitude in gps_ifd:
            ref = gps_ifd.get(piexif.GPSIFD.GPSLatitudeRef, b'N')
            data['gps_latitude'] = convert_gps(gps_ifd[piexif.GPSIFD.GPSLatitude], ref)
        
        if piexif.GPSIFD.GPSLongitude in gps_ifd:
            ref = gps_ifd.get(piexif.GPSIFD.GPSLongitudeRef, b'E')
            data['gps_longitude'] = convert_gps(gps_ifd[piexif.GPSIFD.GPSLongitude], ref)
        
        if piexif.GPSIFD.GPSAltitude in gps_ifd:
            alt = gps_ifd[piexif.GPSIFD.GPSAltitude]
            if isinstance(alt, tuple) and len(alt) == 2:
                data['gps_altitude'] = f"{alt[0]/alt[1]:.0f}m"
            
    except Exception as e:
        print(f"Error reading EXIF from {image_path}: {e}")
    
    return data


def save_tags_to_image(image_path: str, tags: TagUpdate) -> bool:
    """Сохраняет теги в метаданные изображения - напрямую без парсинга"""
    try:
        # Загружаем существующие EXIF или создаем новые
        try:
            exif_dict = piexif.load(image_path)
        except:
            exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
        
        # XPTitle + ImageDescription
        if tags.title is not None:
            exif_dict["0th"][piexif.ImageIFD.XPTitle] = tags.title.encode('utf-16-le')
            exif_dict["0th"][piexif.ImageIFD.ImageDescription] = tags.title.encode('utf-8')
        
        # XPComment -> description (записываем как есть)
        if tags.description is not None:
            exif_dict["0th"][piexif.ImageIFD.XPComment] = tags.description.encode('utf-16-le')
        
        # XPSubject -> source
        if tags.source is not None:
            exif_dict["0th"][piexif.ImageIFD.XPSubject] = tags.source.encode('utf-16-le')
        
        # XPKeywords
        if tags.keywords is not None:
            keywords_str = ';'.join(tags.keywords)
            exif_dict["0th"][piexif.ImageIFD.XPKeywords] = keywords_str.encode('utf-16-le')
        
        # XPAuthor + Artist
        if tags.author is not None:
            exif_dict["0th"][piexif.ImageIFD.XPAuthor] = tags.author.encode('utf-16-le')
            exif_dict["0th"][piexif.ImageIFD.Artist] = tags.author.encode('utf-8')
        
        # Copyright
        if tags.copyright is not None:
            exif_dict["0th"][piexif.ImageIFD.Copyright] = tags.copyright.encode('utf-8')
        
        # Сохраняем
        exif_bytes = piexif.dump(exif_dict)
        piexif.insert(exif_bytes, image_path)
        
        return True
    except Exception as e:
        print(f"Error saving tags to {image_path}: {e}")
        return False


@app.get("/")
async def root():
    return {"status": "ok", "service": "Image Tag Editor API"}


@app.get("/api/tags/images")
async def list_images():
    """Список всех изображений в папке"""
    images = []
    
    for file in IMAGES_DIR.iterdir():
        if file.is_file() and file.suffix.lower() in SUPPORTED_EXTENSIONS:
            try:
                img = Image.open(file)
                stat = file.stat()
                
                iptc = get_iptc_from_exif(str(file))
                
                images.append({
                    'filename': file.name,
                    'path': str(file),
                    'size': img.size,
                    'format': img.format,
                    'mode': img.mode,
                    'file_size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'has_tags': bool(iptc.get('title') or iptc.get('keywords')),
                    'tags': iptc
                })
                img.close()
            except Exception as e:
                print(f"Error reading {file}: {e}")
    
    # Сортируем по дате изменения (новые первыми)
    images.sort(key=lambda x: x['modified'], reverse=True)
    
    return {"images": images, "total": len(images)}


@app.get("/api/tags/images/{filename}")
async def get_image_details(filename: str):
    """Детальная информация об изображении"""
    file_path = IMAGES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        img = Image.open(file_path)
        stat = file_path.stat()
        
        exif = get_exif_data(str(file_path))
        iptc = get_iptc_from_exif(str(file_path))
        
        return {
            'filename': filename,
            'path': str(file_path),
            'size': img.size,
            'format': img.format,
            'mode': img.mode,
            'file_size': stat.st_size,
            'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
            'exif': exif,
            'tags': iptc
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tags/images/{filename}/thumbnail")
async def get_thumbnail(filename: str):
    """Возвращает изображение для превью"""
    file_path = IMAGES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(file_path, media_type="image/jpeg")


@app.put("/api/tags/images/{filename}")
async def update_image_tags(filename: str, tags: TagUpdate):
    """Обновить теги изображения"""
    file_path = IMAGES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    success = save_tags_to_image(str(file_path), tags)
    
    if success:
        return {"status": "ok", "message": "Tags updated"}
    else:
        raise HTTPException(status_code=500, detail="Failed to save tags")


@app.post("/api/tags/images/bulk")
async def bulk_update_tags(update: BulkTagUpdate):
    """Массовое обновление тегов"""
    results = []
    
    for filename in update.filenames:
        file_path = IMAGES_DIR / filename
        if file_path.exists():
            success = save_tags_to_image(str(file_path), update.tags)
            results.append({
                'filename': filename,
                'success': success
            })
        else:
            results.append({
                'filename': filename,
                'success': False,
                'error': 'File not found'
            })
    
    successful = sum(1 for r in results if r['success'])
    
    return {
        "status": "ok",
        "total": len(update.filenames),
        "successful": successful,
        "failed": len(update.filenames) - successful,
        "results": results
    }


@app.post("/api/tags/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    """Загрузка новых изображений"""
    results = []
    
    for file in files:
        if not any(file.filename.lower().endswith(ext) for ext in SUPPORTED_EXTENSIONS):
            results.append({
                'filename': file.filename,
                'success': False,
                'error': 'Unsupported format'
            })
            continue
        
        try:
            file_path = IMAGES_DIR / file.filename
            
            # Если файл существует, добавляем timestamp
            if file_path.exists():
                name, ext = os.path.splitext(file.filename)
                timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
                file_path = IMAGES_DIR / f"{name}_{timestamp}{ext}"
            
            # Сохраняем файл
            content = await file.read()
            with open(file_path, 'wb') as f:
                f.write(content)
            
            results.append({
                'filename': file_path.name,
                'success': True
            })
        except Exception as e:
            results.append({
                'filename': file.filename,
                'success': False,
                'error': str(e)
            })
    
    return {
        "status": "ok",
        "uploaded": sum(1 for r in results if r['success']),
        "results": results
    }


@app.delete("/api/tags/images/{filename}")
async def delete_image(filename: str):
    """Удалить изображение"""
    file_path = IMAGES_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    try:
        file_path.unlink()
        return {"status": "ok", "message": "Image deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print(f"Image Tag Editor API")
    print(f"Images directory: {IMAGES_DIR}")
    print(f"Starting server on http://localhost:8001")
    uvicorn.run(app, host="0.0.0.0", port=8001)
