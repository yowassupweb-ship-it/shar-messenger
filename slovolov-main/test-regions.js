// Тестовый скрипт для получения регионов
const testRegionsAPI = async () => {
  try {
    console.log('Тестируем загрузку регионов...')
    
    const response = await fetch('http://localhost:3001/api/yandex-wordstat/regions-tree', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    })
    
    console.log('Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('Регионы загружены:', data.regions?.length || 0)
      console.log('Первые 5 регионов:', data.regions?.slice(0, 5))
    } else {
      const error = await response.json()
      console.log('Ошибка:', error)
    }
  } catch (error) {
    console.error('Ошибка запроса:', error)
  }
}

// Вызвать функцию при загрузке страницы
if (typeof window !== 'undefined') {
  testRegionsAPI()
}