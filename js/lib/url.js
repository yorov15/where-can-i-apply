// Ссылки в карточках приходят из data/, то есть из файлов, которые
// пополняет сборщик. Пропускаем только абсолютные http(s): любая другая
// схема (javascript:, data:) в href стала бы кодом на странице.
//
// Разбор через URL, а не проверка префикса строки: браузер срезает
// пробелы и переводы строк в начале и внутри схемы, и «java\nscript:»
// префиксом не поймать. Возвращается нормализованная строка, а не
// исходная, чтобы в href попало ровно то, что проверили.
export function safeHttpUrl(value) {
  if (typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
}
