#!/usr/bin/env node

// Простой скрипт для тестирования API Yandex.Wordstat
// Использование: node test-wordstat-api.js

const https = require('https');

// Проверяем переменные окружения
require('dotenv').config({ path: '.env.local' });

const token = process.env.YANDEX_WORDSTAT_OAUTH_TOKEN || 
              process.env.YANDEX_OAUTH_TOKEN || 
              process.env.YANDEX_WORDSTAT_TOKEN ||
              process.env.YANDEX_TOKEN;

if (!token) {
  console.error('❌ OAuth токен не найден!');
  console.log('Проверьте переменные окружения:');
  console.log('- YANDEX_WORDSTAT_OAUTH_TOKEN');
  console.log('- YANDEX_OAUTH_TOKEN');
  console.log('- YANDEX_WORDSTAT_TOKEN');
  console.log('- YANDEX_TOKEN');
  process.exit(1);
}

console.log('🔑 Токен найден (длина:', token.length, 'символов)');

// Тестовый запрос к API
const testApiRequest = () => {
  const data = JSON.stringify([{
    method: 'GetWordstatReportList',
    token: token,
    param: {}
  }]);

  const options = {
    hostname: 'api.direct.yandex.com',
    port: 443,
    path: '/json/v5/reports',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Accept-Language': 'ru'
    }
  };

  console.log('📡 Отправляем тестовый запрос...');

  const req = https.request(options, (res) => {
    console.log('📊 Статус ответа:', res.statusCode);
    console.log('📋 Заголовки:', res.headers);

    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      try {
        const jsonResponse = JSON.parse(responseData);
        console.log('✅ Ответ получен:', JSON.stringify(jsonResponse, null, 2));
        
        if (res.statusCode === 200) {
          console.log('🎉 API работает корректно!');
        } else {
          console.log('⚠️ API вернул ошибку');
        }
      } catch (err) {
        console.log('📄 Сырой ответ:', responseData);
        console.error('❌ Ошибка парсинга JSON:', err.message);
      }
    });
  });

  req.on('error', (err) => {
    console.error('❌ Ошибка сетевого запроса:', err.message);
  });

  req.write(data);
  req.end();
};

testApiRequest();