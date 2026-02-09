#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = r'D:\Desktop\shar-messenger\frontend\src\components\CalendarBoard.tsx'

# Читаем файл
with open(file_path, 'rb') as f:
    content_bytes = f.read()

# Ищем строку 595 (594-й индекс в массиве строк, начиная с 0)
lines_bytes = content_bytes.split(b'\n')
line_595 = lines_bytes[594] if len(lines_bytes) > 594 else b''
line_596 = lines_bytes[595] if len(lines_bytes) > 595 else b''
line_603 = lines_bytes[602] if len(lines_bytes) > 602 else b''
line_608 = lines_bytes[607] if len(lines_bytes) > 607 else b''

print("Line 595 (bytes):")
print(line_595)
print("\nLine 595 (last 50 chars):")
print(line_595[-50:])
print("\nLine 595 (last 20 bytes as hex):")
print(line_595[-20:].hex(' '))

print("\n\nLine 596 (bytes):")
print(line_596)
print("Line 596 (last 50 chars):")
print(line_596[-50:])
print("Line 596 (last 20 bytes as hex):")
print(line_596[-20:].hex(' '))

print("\n\nLine 603 (last 50):")
print(line_603[-50:])

print("\n\nLine 608 (last 50):")
print(line_608[-50:])

# Проверяем наличие обратного слеша перед кавычкой
