// Адрес прокси с ИИ-объяснением (api/explain.js, развёрнутый на Vercel).
//
// Функция развёрнута на Vercel, сайт стоит на GitHub Pages: адрес полный,
// а в самой функции по умолчанию разрешены адреса Pages, nerio-app.vercel.app и прежний kuda-podat.vercel.app. Если
// поставить null, кнопки «Объяснить» на сайте не будет вовсе, и он
// вернётся к работе без единого запроса наружу.
export const EXPLAIN_URL = 'https://nerio-app.vercel.app/api/explain';

// Наставник на «Сегодня» (режим mentor-week той же функции). Включать только
// после экзамена tools/mentor-exam.mjs на живой функции: 0 выдумок, не меньше 9 из 10.
export const MENTOR_ON = true;
// Наставник у шага маршрута в «Моём пути» (режим mentor-step). Включать только
// после экзамена tools/mentor-step-exam.mjs на живой функции: 0 выдумок, не меньше 9 из 10.
export const MENTOR_STEP_ON = true;
