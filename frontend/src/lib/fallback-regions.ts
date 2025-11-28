// Полный список регионов России для fallback (как в Яндекс.Метрике)
export const fallbackRegions = [
  // Вся Россия
  { regionId: 225, regionName: 'Россия', parentId: undefined },
  
  // Федеральные округа и макрорегионы
  { regionId: 3, regionName: 'Центр', parentId: 225 },
  { regionId: 17, regionName: 'Северо-Запад', parentId: 225 },
  { regionId: 26, regionName: 'Юг', parentId: 225 },
  { regionId: 40, regionName: 'Поволжье', parentId: 225 },
  { regionId: 52, regionName: 'Урал', parentId: 225 },
  { regionId: 59, regionName: 'Сибирь', parentId: 225 },
  { regionId: 73, regionName: 'Дальний Восток', parentId: 225 },
  
  // Москва и область
  { regionId: 213, regionName: 'Москва', parentId: 3 },
  { regionId: 1, regionName: 'Московская область', parentId: 3 },
  { regionId: 216, regionName: 'Москва и область', parentId: 3 },
  { regionId: 98594, regionName: 'Зеленоград', parentId: 213 },
  { regionId: 98599, regionName: 'Троицк', parentId: 213 },
  { regionId: 98596, regionName: 'Новомосковский АО', parentId: 213 },
  { regionId: 98590, regionName: 'Внуково', parentId: 213 },
  { regionId: 98591, regionName: 'Бутово', parentId: 213 },
  { regionId: 98598, regionName: 'Солнцево', parentId: 213 },
  
  // Санкт-Петербург
  { regionId: 2, regionName: 'Санкт-Петербург', parentId: 17 },
  { regionId: 10174, regionName: 'Ленинградская область', parentId: 17 },
  { regionId: 10177, regionName: 'Санкт-Петербург и Ленинградская область', parentId: 17 },
  
  // Центральный федеральный округ
  { regionId: 10716, regionName: 'Белгородская область', parentId: 3 },
  { regionId: 10743, regionName: 'Брянская область', parentId: 3 },
  { regionId: 10744, regionName: 'Владимирская область', parentId: 3 },
  { regionId: 10745, regionName: 'Воронежская область', parentId: 3 },
  { regionId: 10747, regionName: 'Ивановская область', parentId: 3 },
  { regionId: 10748, regionName: 'Калужская область', parentId: 3 },
  { regionId: 10750, regionName: 'Костромская область', parentId: 3 },
  { regionId: 10751, regionName: 'Курская область', parentId: 3 },
  { regionId: 10752, regionName: 'Липецкая область', parentId: 3 },
  { regionId: 10753, regionName: 'Орловская область', parentId: 3 },
  { regionId: 10754, regionName: 'Рязанская область', parentId: 3 },
  { regionId: 10755, regionName: 'Смоленская область', parentId: 3 },
  { regionId: 10756, regionName: 'Тамбовская область', parentId: 3 },
  { regionId: 10757, regionName: 'Тверская область', parentId: 3 },
  { regionId: 10758, regionName: 'Тульская область', parentId: 3 },
  { regionId: 10759, regionName: 'Ярославская область', parentId: 3 },
  
  // Города Тульской области
  { regionId: 20728, regionName: 'Тула', parentId: 10758 },
  { regionId: 98604, regionName: 'Новомосковск (Тульская обл.)', parentId: 10758 },
  
  // Северо-Западный федеральный округ
  { regionId: 10897, regionName: 'Архангельская область', parentId: 17 },
  { regionId: 20729, regionName: 'Вологодская область', parentId: 17 },
  { regionId: 21624, regionName: 'Калининградская область', parentId: 17 },
  { regionId: 23, regionName: 'Мурманская область', parentId: 17 },
  { regionId: 24, regionName: 'Республика Карелия', parentId: 17 },
  { regionId: 25, regionName: 'Псковская область', parentId: 17 },
  { regionId: 27, regionName: 'Новгородская область', parentId: 17 },
  { regionId: 28, regionName: 'Ненецкий АО', parentId: 17 },
  { regionId: 29, regionName: 'Республика Коми', parentId: 17 },
  
  // Южный федеральный округ
  { regionId: 38, regionName: 'Волгоградская область', parentId: 26 },
  { regionId: 39, regionName: 'Краснодарский край', parentId: 26 },
  { regionId: 10995, regionName: 'Астраханская область', parentId: 26 },
  { regionId: 75, regionName: 'Ростовская область', parentId: 26 },
  { regionId: 959, regionName: 'Севастополь', parentId: 26 },
  { regionId: 958, regionName: 'Республика Крым', parentId: 26 },
  
  // Северо-Кавказский федеральный округ
  { regionId: 10832, regionName: 'Республика Дагестан', parentId: 26 },
  { regionId: 30, regionName: 'Республика Ингушетия', parentId: 26 },
  { regionId: 31, regionName: 'Кабардино-Балкарская Республика', parentId: 26 },
  { regionId: 32, regionName: 'Республика Северная Осетия', parentId: 26 },
  { regionId: 33, regionName: 'Чеченская Республика', parentId: 26 },
  { regionId: 34, regionName: 'Ставропольский край', parentId: 26 },
  { regionId: 10823, regionName: 'Карачаево-Черкесская Республика', parentId: 26 },
  
  // Приволжский федеральный округ
  { regionId: 11119, regionName: 'Нижегородская область', parentId: 40 },
  { regionId: 43, regionName: 'Республика Татарстан', parentId: 40 },
  { regionId: 51, regionName: 'Самарская область', parentId: 40 },
  { regionId: 194, regionName: 'Саратовская область', parentId: 40 },
  { regionId: 172, regionName: 'Республика Башкортостан', parentId: 40 },
  { regionId: 50, regionName: 'Пермский край', parentId: 40 },
  { regionId: 11162, regionName: 'Удмуртская Республика', parentId: 40 },
  { regionId: 45, regionName: 'Чувашская Республика', parentId: 40 },
  { regionId: 46, regionName: 'Кировская область', parentId: 40 },
  { regionId: 11077, regionName: 'Республика Марий Эл', parentId: 40 },
  { regionId: 10861, regionName: 'Республика Мордовия', parentId: 40 },
  { regionId: 11508, regionName: 'Оренбургская область', parentId: 40 },
  { regionId: 10862, regionName: 'Пензенская область', parentId: 40 },
  { regionId: 11131, regionName: 'Ульяновская область', parentId: 40 },
  
  // Уральский федеральный округ
  { regionId: 54, regionName: 'Свердловская область', parentId: 52 },
  { regionId: 56, regionName: 'Челябинская область', parentId: 52 },
  { regionId: 55, regionName: 'Тюменская область', parentId: 52 },
  { regionId: 53, regionName: 'Курганская область', parentId: 52 },
  { regionId: 982, regionName: 'Ханты-Мансийский АО', parentId: 52 },
  { regionId: 1092, regionName: 'Ямало-Ненецкий АО', parentId: 52 },
  
  // Сибирский федеральный округ
  { regionId: 65, regionName: 'Новосибирская область', parentId: 59 },
  { regionId: 62, regionName: 'Красноярский край', parentId: 59 },
  { regionId: 64, regionName: 'Алтайский край', parentId: 59 },
  { regionId: 66, regionName: 'Омская область', parentId: 59 },
  { regionId: 70, regionName: 'Томская область', parentId: 59 },
  { regionId: 71, regionName: 'Кемеровская область', parentId: 59 },
  { regionId: 63, regionName: 'Иркутская область', parentId: 59 },
  { regionId: 11173, regionName: 'Республика Бурятия', parentId: 59 },
  { regionId: 68, regionName: 'Забайкальский край', parentId: 59 },
  { regionId: 11175, regionName: 'Республика Хакасия', parentId: 59 },
  { regionId: 11137, regionName: 'Республика Тыва', parentId: 59 },
  { regionId: 11139, regionName: 'Республика Алтай', parentId: 59 },
  
  // Дальневосточный федеральный округ
  { regionId: 76, regionName: 'Хабаровский край', parentId: 73 },
  { regionId: 75, regionName: 'Приморский край', parentId: 73 },
  { regionId: 77, regionName: 'Амурская область', parentId: 73 },
  { regionId: 78, regionName: 'Сахалинская область', parentId: 73 },
  { regionId: 80, regionName: 'Еврейская АО', parentId: 73 },
  { regionId: 81, regionName: 'Камчатский край', parentId: 73 },
  { regionId: 82, regionName: 'Магаданская область', parentId: 73 },
  { regionId: 1104, regionName: 'Чукотский АО', parentId: 73 },
  { regionId: 1103, regionName: 'Республика Саха (Якутия)', parentId: 73 }
]
