/**
 * Конвертер формул поисковых моделей в построчные запросы
 * 
 * Формат формулы:
 * - Обычный текст: добавляется как есть
 * - (вариант1 | вариант2 | вариант3): генерирует отдельные запросы для каждого варианта
 * - Можно комбинировать несколько групп вариантов
 * 
 * Примеры:
 * "автобусные (туры | экскурсии)" -> ["автобусные туры", "автобусные экскурсии"]
 * "(экскурсия | тур) по (Москве | Питеру)" -> ["экскурсия по Москве", "экскурсия по Питеру", "тур по Москве", "тур по Питеру"]
 */

export interface ConversionResult {
  queries: string[];
  formula: string;
  variantGroups: number;
  totalCombinations: number;
}

/**
 * Парсит группу вариантов из строки вида "(вариант1 | вариант2 | вариант3)"
 */
function parseVariantGroup(group: string): string[] {
  // Убираем скобки и разбиваем по |
  const content = group.slice(1, -1); // Убираем ( и )
  return content
    .split('|')
    .map(v => v.trim())
    .filter(v => v.length > 0);
}

/**
 * Находит все группы вариантов в формуле
 */
function findVariantGroups(formula: string): { match: string; variants: string[]; start: number; end: number }[] {
  const groups: { match: string; variants: string[]; start: number; end: number }[] = [];
  const regex = /\([^()]+\)/g;
  
  let match;
  while ((match = regex.exec(formula)) !== null) {
    // Проверяем, что внутри есть | (это группа вариантов, а не просто скобки)
    if (match[0].includes('|')) {
      groups.push({
        match: match[0],
        variants: parseVariantGroup(match[0]),
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  
  return groups;
}

/**
 * Генерирует все комбинации из массивов вариантов
 */
function generateCombinations(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  if (arrays.length === 1) return arrays[0].map(v => [v]);
  
  const result: string[][] = [];
  const [first, ...rest] = arrays;
  const restCombinations = generateCombinations(rest);
  
  for (const variant of first) {
    for (const restComb of restCombinations) {
      result.push([variant, ...restComb]);
    }
  }
  
  return result;
}

/**
 * Конвертирует формулу поисковой модели в массив запросов
 */
export function convertFormulaToQueries(formula: string): ConversionResult {
  const trimmedFormula = formula.trim();
  
  if (!trimmedFormula) {
    return {
      queries: [],
      formula: '',
      variantGroups: 0,
      totalCombinations: 0
    };
  }
  
  const groups = findVariantGroups(trimmedFormula);
  
  // Если нет групп вариантов, возвращаем формулу как есть
  if (groups.length === 0) {
    return {
      queries: [trimmedFormula],
      formula: trimmedFormula,
      variantGroups: 0,
      totalCombinations: 1
    };
  }
  
  // Генерируем все комбинации
  const variantArrays = groups.map(g => g.variants);
  const combinations = generateCombinations(variantArrays);
  
  // Заменяем группы в формуле на варианты для каждой комбинации
  const queries: string[] = combinations.map(combination => {
    let result = trimmedFormula;
    
    // Заменяем группы в обратном порядке (чтобы не сбить индексы)
    for (let i = groups.length - 1; i >= 0; i--) {
      const group = groups[i];
      result = result.slice(0, group.start) + combination[i] + result.slice(group.end);
    }
    
    // Нормализуем пробелы
    return result.replace(/\s+/g, ' ').trim();
  });
  
  return {
    queries,
    formula: trimmedFormula,
    variantGroups: groups.length,
    totalCombinations: combinations.length
  };
}

/**
 * Конвертирует несколько строк формул (каждая строка - отдельная формула)
 */
export function convertMultilineFormulas(text: string): ConversionResult {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  const allQueries: string[] = [];
  let totalGroups = 0;
  let totalCombinations = 0;
  
  for (const line of lines) {
    const result = convertFormulaToQueries(line);
    allQueries.push(...result.queries);
    totalGroups += result.variantGroups;
    totalCombinations += result.totalCombinations;
  }
  
  // Убираем дубликаты
  const uniqueQueries = Array.from(new Set(allQueries));
  
  return {
    queries: uniqueQueries,
    formula: text,
    variantGroups: totalGroups,
    totalCombinations: uniqueQueries.length
  };
}

/**
 * Конвертирует формулы кластера для отправки в Topvisor
 */
export function convertClusterFormulasToKeywords(clusterName: string, formulas: string[]): string[] {
  const allQueries: string[] = [];
  
  for (const formula of formulas) {
    const result = convertFormulaToQueries(formula);
    allQueries.push(...result.queries);
  }
  
  // Убираем дубликаты и пустые строки
  return Array.from(new Set(allQueries)).filter(q => q.length > 0);
}

/**
 * Валидация формулы
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  const trimmed = formula.trim();
  
  if (!trimmed) {
    return { valid: true }; // Пустая строка валидна (просто игнорируется)
  }
  
  // Проверяем сбалансированность скобок
  let depth = 0;
  for (const char of trimmed) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (depth < 0) {
      return { valid: false, error: 'Несбалансированные скобки: лишняя закрывающая скобка' };
    }
  }
  
  if (depth !== 0) {
    return { valid: false, error: 'Несбалансированные скобки: не хватает закрывающих скобок' };
  }
  
  // Проверяем наличие пустых групп вариантов
  if (/\(\s*\)/.test(trimmed)) {
    return { valid: false, error: 'Пустая группа вариантов ()' };
  }
  
  // Проверяем наличие пустых вариантов в группе
  if (/\(\s*\||\|\s*\||\|\s*\)/.test(trimmed)) {
    return { valid: false, error: 'Пустой вариант в группе' };
  }
  
  return { valid: true };
}

/**
 * Примеры использования:
 * 
 * const result = convertFormulaToQueries("автобусные (туры | экскурсии | путешествия)");
 * // result.queries = ["автобусные туры", "автобусные экскурсии", "автобусные путешествия"]
 * 
 * const result2 = convertFormulaToQueries("(экскурсия | тур) по (Москве | Санкт-Петербургу)");
 * // result2.queries = ["экскурсия по Москве", "экскурсия по Санкт-Петербургу", "тур по Москве", "тур по Санкт-Петербургу"]
 */
