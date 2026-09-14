import { useState, useEffect, useCallback } from 'react';
import { playCorrectSound, playWrongSound, playCoinSound, playClickSound, playShowSound, resumeAudio } from './sounds';
import { PapaCabinet } from './admin/PapaCabinet';
import { useGameStore } from './data/GameStore';
import { EXTRA_WORDS } from './data/vocabExtra';

const a = '\u0301'; // combining acute accent

// Тип ошибки: 'letter' - неправильная буква, 'stress' - неверное ударение, 'both' - обе
type ErrorType = 'letter' | 'stress' | 'both' | 'none';

interface WordData {
  correct: string;        // слово с ударением
  correctPlain: string;   // слово без ударения
  emoji: string;
  // Варианты ошибок: каждый вариант содержит тип ошибки и неправильное слово
  errors: { wrong: string; errorType: ErrorType; letterHint?: string; stressHint?: string }[];
}

const WORDS: WordData[] = [
  { correct: `м${a}ма`, correctPlain: 'мама', emoji: '👩', errors: [
    { wrong: `м${a}мо`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `мама`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `м${a}ма`, errorType: 'none' },
  ]},
  { correct: `п${a}па`, correctPlain: 'папа', emoji: '👨', errors: [
    { wrong: `п${a}по`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `папа`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `п${a}па`, errorType: 'none' },
  ]},
  { correct: `до${a}м`, correctPlain: 'дом', emoji: '🏠', errors: [
    { wrong: `да${a}м`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `дом`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `до${a}м`, errorType: 'none' },
  ]},
  { correct: `ко${a}т`, correctPlain: 'кот', emoji: '🐱', errors: [
    { wrong: `ка${a}т`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `кот`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ко${a}т`, errorType: 'none' },
  ]},
  { correct: `ле${a}с`, correctPlain: 'лес', emoji: '🌲', errors: [
    { wrong: `ли${a}с`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `лес`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ле${a}с`, errorType: 'none' },
  ]},
  { correct: `река${a}`, correctPlain: 'река', emoji: '🏞️', errors: [
    { wrong: `ри${a}ка`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `река`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `река${a}`, errorType: 'none' },
  ]},
  { correct: `гора${a}`, correctPlain: 'гора', emoji: '⛰️', errors: [
    { wrong: `га${a}ра`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `гора`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `гора${a}`, errorType: 'none' },
  ]},
  { correct: `сне${a}г`, correctPlain: 'снег', emoji: '❄️', errors: [
    { wrong: `сни${a}г`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `снег`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `сне${a}г`, errorType: 'none' },
  ]},
  { correct: `шко${a}ла`, correctPlain: 'школа', emoji: '🏫', errors: [
    { wrong: `шка${a}ла`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `школа`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `шко${a}ла`, errorType: 'none' },
  ]},
  { correct: `кни${a}га`, correctPlain: 'книга', emoji: '📖', errors: [
    { wrong: `кне${a}га`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `книга`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `кни${a}га`, errorType: 'none' },
  ]},
  { correct: `ру${a}чка`, correctPlain: 'ручка', emoji: '✏️', errors: [
    { wrong: `ру${a}чька`, errorType: 'letter', letterHint: 'Четвёртая буква' },
    { wrong: `ручка`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ру${a}чка`, errorType: 'none' },
  ]},
  { correct: `со${a}лнце`, correctPlain: 'солнце', emoji: '☀️', errors: [
    { wrong: `со${a}нце`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `солнце`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `со${a}лнце`, errorType: 'none' },
  ]},
  { correct: `за${a}яц`, correctPlain: 'заяц', emoji: '🐰', errors: [
    { wrong: `за${a}ец`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `заяц`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `за${a}яц`, errorType: 'none' },
  ]},
  { correct: `лиса${a}`, correctPlain: 'лиса', emoji: '🦊', errors: [
    { wrong: `лисо${a}`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `лиса`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `лиса${a}`, errorType: 'none' },
  ]},
  { correct: `во${a}лк`, correctPlain: 'волк', emoji: '🐺', errors: [
    { wrong: `ва${a}лк`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `волк`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `во${a}лк`, errorType: 'none' },
  ]},
  { correct: `молоко${a}`, correctPlain: 'молоко', emoji: '🥛', errors: [
    { wrong: `молако${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `молоко`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `молоко${a}`, errorType: 'none' },
  ]},
  { correct: `хле${a}б`, correctPlain: 'хлеб', emoji: '🍞', errors: [
    { wrong: `хле${a}п`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `хлеб`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `хле${a}б`, errorType: 'none' },
  ]},
  { correct: `вода${a}`, correctPlain: 'вода', emoji: '💧', errors: [
    { wrong: `вада${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `вода`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `вода${a}`, errorType: 'none' },
  ]},
  { correct: `земля${a}`, correctPlain: 'земля', emoji: '🌍', errors: [
    { wrong: `зимля${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `земля`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `земля${a}`, errorType: 'none' },
  ]},
  { correct: `не${a}бо`, correctPlain: 'небо', emoji: '🌤️', errors: [
    { wrong: `ни${a}бо`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `небо`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `не${a}бо`, errorType: 'none' },
  ]},
  { correct: `зве${a}зда`, correctPlain: 'звезда', emoji: '⭐', errors: [
    { wrong: `зве${a}здо`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `звезда`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `зве${a}зда`, errorType: 'none' },
  ]},
  { correct: `трава${a}`, correctPlain: 'трава', emoji: '🌿', errors: [
    { wrong: `трова${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `трава`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `трава${a}`, errorType: 'none' },
  ]},
  { correct: `де${a}рево`, correctPlain: 'дерево', emoji: '🌳', errors: [
    { wrong: `де${a}рефо`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `дерево`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `де${a}рево`, errorType: 'none' },
  ]},
  { correct: `цве${a}ток`, correctPlain: 'цветок', emoji: '🌸', errors: [
    { wrong: `цви${a}ток`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `цветок`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `цве${a}ток`, errorType: 'none' },
  ]},
  { correct: `пти${a}ца`, correctPlain: 'птица', emoji: '🐦', errors: [
    { wrong: `пте${a}ца`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `птица`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `пти${a}ца`, errorType: 'none' },
  ]},
  { correct: `ры${a}ба`, correctPlain: 'рыба', emoji: '🐟', errors: [
    { wrong: `ре${a}ба`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `рыба`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ры${a}ба`, errorType: 'none' },
  ]},
  { correct: `ка${a}ша`, correctPlain: 'каша', emoji: '🥣', errors: [
    { wrong: `ко${a}ша`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `каша`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ка${a}ша`, errorType: 'none' },
  ]},
  { correct: `су${a}п`, correctPlain: 'суп', emoji: '🍲', errors: [
    { wrong: `са${a}п`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `суп`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `су${a}п`, errorType: 'none' },
  ]},
  { correct: `сто${a}л`, correctPlain: 'стол', emoji: '🪑', errors: [
    { wrong: `ста${a}л`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `стол`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `сто${a}л`, errorType: 'none' },
  ]},
  { correct: `окно${a}`, correctPlain: 'окно', emoji: '🪟', errors: [
    { wrong: `акно${a}`, errorType: 'letter', letterHint: 'Первая буква' },
    { wrong: `окно`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `окно${a}`, errorType: 'none' },
  ]},
  { correct: `две${a}рь`, correctPlain: 'дверь', emoji: '🚪', errors: [
    { wrong: `две${a}р`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `дверь`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `две${a}рь`, errorType: 'none' },
  ]},
  { correct: `го${a}род`, correctPlain: 'город', emoji: '🏙️', errors: [
    { wrong: `га${a}род`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `город`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `го${a}род`, errorType: 'none' },
  ]},
  { correct: `ули${a}ца`, correctPlain: 'улица', emoji: '🛣️', errors: [
    { wrong: `уле${a}ца`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `улица`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ули${a}ца`, errorType: 'none' },
  ]},
  { correct: `доро${a}га`, correctPlain: 'дорога', emoji: '🛤️', errors: [
    { wrong: `даро${a}га`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `дорога`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `доро${a}га`, errorType: 'none' },
  ]},
  { correct: `зи${a}ма`, correctPlain: 'зима', emoji: '⛄', errors: [
    { wrong: `зе${a}ма`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `зима`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `зи${a}ма`, errorType: 'none' },
  ]},
  { correct: `весна${a}`, correctPlain: 'весна', emoji: '🌷', errors: [
    { wrong: `висна${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `весна`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `весна${a}`, errorType: 'none' },
  ]},
  { correct: `ле${a}то`, correctPlain: 'лето', emoji: '🌞', errors: [
    { wrong: `ли${a}то`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `лето`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ле${a}то`, errorType: 'none' },
  ]},
  { correct: `о${a}сень`, correctPlain: 'осень', emoji: '🍂', errors: [
    { wrong: `оси${a}нь`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `осень`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `о${a}сень`, errorType: 'none' },
  ]},
  { correct: `до${a}ждь`, correctPlain: 'дождь', emoji: '🌧️', errors: [
    { wrong: `до${a}шт`, errorType: 'letter', letterHint: 'Последние буквы' },
    { wrong: `дождь`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `до${a}ждь`, errorType: 'none' },
  ]},
  { correct: `ве${a}тер`, correctPlain: 'ветер', emoji: '💨', errors: [
    { wrong: `ви${a}тер`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `ветер`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ве${a}тер`, errorType: 'none' },
  ]},
  // С заглавной буквы
  { correct: `Москва${a}`, correctPlain: 'Москва', emoji: '🏛️', errors: [
    { wrong: `Масква${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `москва${a}`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Москва`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Москва${a}`, errorType: 'none' },
  ]},
  { correct: `Росси${a}я`, correctPlain: 'Россия', emoji: '🇷🇺', errors: [
    { wrong: `Раси${a}я`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `россия`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Россия`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Росси${a}я`, errorType: 'none' },
  ]},
  { correct: `Влади${a}мир`, correctPlain: 'Владимир', emoji: '👑', errors: [
    { wrong: `Вала${a}димир`, errorType: 'letter', letterHint: 'Четвёртая буква' },
    { wrong: `владимир`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Владимир`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Влади${a}мир`, errorType: 'none' },
  ]},
  { correct: `А${a}нна`, correctPlain: 'Анна', emoji: '👸', errors: [
    { wrong: `О${a}нна`, errorType: 'letter', letterHint: 'Первая буква' },
    { wrong: `анна`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Анна`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `А${a}нна`, errorType: 'none' },
  ]},
  { correct: `Ива${a}н`, correctPlain: 'Иван', emoji: '🤴', errors: [
    { wrong: `Ивон${a}`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `иван`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Иван`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Ива${a}н`, errorType: 'none' },
  ]},
  { correct: `Ма${a}ри${a}я`, correctPlain: 'Мария', emoji: '👧', errors: [
    { wrong: `Маря${a}`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `мария`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Мария`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Ма${a}ри${a}я`, errorType: 'none' },
  ]},
  { correct: `Пётр`, correctPlain: 'Пётр', emoji: '👦', errors: [
    { wrong: `Петр`, errorType: 'letter', letterHint: 'Вторая буква (ё!)' },
    { wrong: `пётр`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Пётр`, errorType: 'none' },
  ]},
  { correct: `Суббо${a}та`, correctPlain: 'Суббота', emoji: '📅', errors: [
    { wrong: `Субота${a}`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `суббота`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Суббота`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Суббо${a}та`, errorType: 'none' },
  ]},
  { correct: `Янва${a}рь`, correctPlain: 'Январь', emoji: '🎄', errors: [
    { wrong: `Инва${a}рь`, errorType: 'letter', letterHint: 'Первая буква' },
    { wrong: `январь`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Январь`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Янва${a}рь`, errorType: 'none' },
  ]},
  { correct: `Коро${a}ва`, correctPlain: 'Корова', emoji: '🐄', errors: [
    { wrong: `Карова${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `корова`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Корова`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Коро${a}ва`, errorType: 'none' },
  ]},
  { correct: `Соба${a}ка`, correctPlain: 'Собака', emoji: '🐕', errors: [
    { wrong: `Сабака${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `собака`, errorType: 'letter', letterHint: 'Первая буква (заглавная!)' },
    { wrong: `Собака`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `Соба${a}ка`, errorType: 'none' },
  ]},
  { correct: `арбу${a}з`, correctPlain: 'арбуз', emoji: '🍉', errors: [
    { wrong: `арбу${a}с`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `арбуз`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `арбу${a}з`, errorType: 'none' },
  ]},
  { correct: `ве${a}село`, correctPlain: 'весело', emoji: '😄', errors: [
    { wrong: `ви${a}село`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `весело`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ве${a}село`, errorType: 'none' },
  ]},
  { correct: `воробе${a}й`, correctPlain: 'воробей', emoji: '🐦', errors: [
    { wrong: `ворабе${a}й`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `воробей`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `воробе${a}й`, errorType: 'none' },
  ]},
  { correct: `воро${a}на`, correctPlain: 'ворона', emoji: '🐦‍⬛', errors: [
    { wrong: `варо${a}на`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `ворона`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `воро${a}на`, errorType: 'none' },
  ]},
  { correct: `де${a}вочка`, correctPlain: 'девочка', emoji: '👧', errors: [
    { wrong: `ди${a}вочка`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `девочка`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `де${a}вочка`, errorType: 'none' },
  ]},
  { correct: `дежу${a}рный`, correctPlain: 'дежурный', emoji: '🪪', errors: [
    { wrong: `дижу${a}рный`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `дежурный`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `дежу${a}рный`, errorType: 'none' },
  ]},
  { correct: `дере${a}вня`, correctPlain: 'деревня', emoji: '🏡', errors: [
    { wrong: `дири${a}вня`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `деревня`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `дере${a}вня`, errorType: 'none' },
  ]},
  { correct: `каранда${a}ш`, correctPlain: 'карандаш', emoji: '✏️', errors: [
    { wrong: `каранда${a}ж`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `карандаш`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `каранда${a}ш`, errorType: 'none' },
  ]},
  { correct: `кла${a}сс`, correctPlain: 'класс', emoji: '🧑‍🏫', errors: [
    { wrong: `кла${a}с`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `класс`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `кла${a}сс`, errorType: 'none' },
  ]},
  { correct: `ладо${a}нь`, correctPlain: 'ладонь', emoji: '🖐️', errors: [
    { wrong: `лодо${a}нь`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `ладонь`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ладо${a}нь`, errorType: 'none' },
  ]},
  { correct: `лиси${a}ца`, correctPlain: 'лисица', emoji: '🦊', errors: [
    { wrong: `леси${a}ца`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `лисица`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `лиси${a}ца`, errorType: 'none' },
  ]},
  { correct: `ма${a}льчик`, correctPlain: 'мальчик', emoji: '👦', errors: [
    { wrong: `мо${a}льчик`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `мальчик`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ма${a}льчик`, errorType: 'none' },
  ]},
  { correct: `маши${a}на`, correctPlain: 'машина', emoji: '🚗', errors: [
    { wrong: `моши${a}на`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `машина`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `маши${a}на`, errorType: 'none' },
  ]},
  { correct: `медве${a}дь`, correctPlain: 'медведь', emoji: '🐻', errors: [
    { wrong: `мидве${a}дь`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `медведь`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `медве${a}дь`, errorType: 'none' },
  ]},
  { correct: `пальто${a}`, correctPlain: 'пальто', emoji: '🧥', errors: [
    { wrong: `полто${a}`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `пальто`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `пальто${a}`, errorType: 'none' },
  ]},
  { correct: `пена${a}л`, correctPlain: 'пенал', emoji: '🖊️', errors: [
    { wrong: `пина${a}л`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `пенал`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `пена${a}л`, errorType: 'none' },
  ]},
  { correct: `пету${a}х`, correctPlain: 'петух', emoji: '🐓', errors: [
    { wrong: `питу${a}х`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `петух`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `пету${a}х`, errorType: 'none' },
  ]},
  { correct: `рабо${a}та`, correctPlain: 'работа', emoji: '💼', errors: [
    { wrong: `роба${a}та`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `работа`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `рабо${a}та`, errorType: 'none' },
  ]},
  { correct: `рабо${a}тать`, correctPlain: 'работать', emoji: '🛠️', errors: [
    { wrong: `роба${a}тать`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `работать`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `рабо${a}тать`, errorType: 'none' },
  ]},
  { correct: `ребя${a}та`, correctPlain: 'ребята', emoji: '🧒', errors: [
    { wrong: `рибя${a}та`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `ребята`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ребя${a}та`, errorType: 'none' },
  ]},
  { correct: `ру${a}сский`, correctPlain: 'русский', emoji: '📘', errors: [
    { wrong: `ру${a}ский`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `русский`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `ру${a}сский`, errorType: 'none' },
  ]},
  { correct: `солове${a}й`, correctPlain: 'соловей', emoji: '🎶', errors: [
    { wrong: `салаве${a}й`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `соловей`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `солове${a}й`, errorType: 'none' },
  ]},
  { correct: `соро${a}ка`, correctPlain: 'сорока', emoji: '🐦', errors: [
    { wrong: `сара${a}ка`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `сорока`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `соро${a}ка`, errorType: 'none' },
  ]},
  { correct: `тетра${a}дь`, correctPlain: 'тетрадь', emoji: '📓', errors: [
    { wrong: `титра${a}дь`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `тетрадь`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `тетра${a}дь`, errorType: 'none' },
  ]},
  { correct: `учени${a}к`, correctPlain: 'ученик', emoji: '🎒', errors: [
    { wrong: `учини${a}к`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `ученик`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `учени${a}к`, errorType: 'none' },
  ]},
  { correct: `учени${a}ца`, correctPlain: 'ученица', emoji: '🎒', errors: [
    { wrong: `учини${a}ца`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `ученица`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `учени${a}ца`, errorType: 'none' },
  ]},
  { correct: `учи${a}тель`, correctPlain: 'учитель', emoji: '👨‍🏫', errors: [
    { wrong: `уче${a}тель`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `учитель`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `учи${a}тель`, errorType: 'none' },
  ]},
  { correct: `хорошо${a}`, correctPlain: 'хорошо', emoji: '👍', errors: [
    { wrong: `харашо${a}`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `хорошо`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `хорошо${a}`, errorType: 'none' },
  ]},
  { correct: `язы${a}к`, correctPlain: 'язык', emoji: '👅', errors: [
    { wrong: `изы${a}к`, errorType: 'letter', letterHint: 'Первая буква' },
    { wrong: `язык`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `язы${a}к`, errorType: 'none' },
  ]},
  { correct: `а${a}дрес`, correctPlain: 'адрес', emoji: '📫', errors: [
    { wrong: `о${a}дрес`, errorType: 'letter', letterHint: 'Первая буква' },
    { wrong: `адрес`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `а${a}дрес`, errorType: 'none' },
  ]},
  { correct: `рису${a}нок`, correctPlain: 'рисунок', emoji: '🎨', errors: [
    { wrong: `рису${a}нак`, errorType: 'letter', letterHint: 'Последняя буква' },
    { wrong: `рисунок`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `рису${a}нок`, errorType: 'none' },
  ]},
  { correct: `спаси${a}бо`, correctPlain: 'спасибо', emoji: '🙏', errors: [
    { wrong: `споси${a}бо`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `спасибо`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `спаси${a}бо`, errorType: 'none' },
  ]},
  { correct: `до свида${a}ния`, correctPlain: 'до свидания', emoji: '👋', errors: [
    { wrong: `да свида${a}ния`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `до свидания`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `до свида${a}ния`, errorType: 'none' },
  ]},
  { correct: `карти${a}на`, correctPlain: 'картина', emoji: '🖼️', errors: [
    { wrong: `корти${a}на`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `картина`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `карти${a}на`, errorType: 'none' },
  ]},
  { correct: `пожа${a}луйста`, correctPlain: 'пожалуйста', emoji: '🤲', errors: [
    { wrong: `пожа${a}луста`, errorType: 'letter', letterHint: 'Пропущена буква' },
    { wrong: `пожалуйста`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `пожа${a}луйста`, errorType: 'none' },
  ]},
  { correct: `фами${a}лия`, correctPlain: 'фамилия', emoji: '🪪', errors: [
    { wrong: `фоми${a}лия`, errorType: 'letter', letterHint: 'Вторая буква' },
    { wrong: `фамилия`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `фами${a}лия`, errorType: 'none' },
  ]},
  { correct: `учи${a}тельница`, correctPlain: 'учительница', emoji: '👩‍🏫', errors: [
    { wrong: `уче${a}тельница`, errorType: 'letter', letterHint: 'Третья буква' },
    { wrong: `учительница`, errorType: 'stress', stressHint: 'Ударение не там' },
    { wrong: `учи${a}тельница`, errorType: 'none' },
  ]},
  ...EXTRA_WORDS,
];

type GameState = 'splash' | 'menu' | 'shop' | 'showing' | 'guessing' | 'fixing' | 'result' | 'final';

interface FixState {
  selectedLetterIndex: number | null;
  options: string[];
  correctLetter: string;
}

function App() {
  const store = useGameStore();
  const { money, hints, settings, ready, syncing } = store;
  const [cabinetOpen, setCabinetOpen] = useState(() => window.location.hash === '#papa');
  const [gameState, setGameState] = useState<GameState>('splash');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [currentErrorVariant, setCurrentErrorVariant] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [wordsOrder, setWordsOrder] = useState<number[]>([]);
  const [showHint, setShowHint] = useState(false);
  const [showMoneyAnim, setShowMoneyAnim] = useState<{ amount: number; key: number } | null>(null);
  const [mistakeWords, setMistakeWords] = useState<number[]>([]);
  const [fixState, setFixState] = useState<FixState | null>(null);
  const [userFixedWord, setUserFixedWord] = useState<string>('');

  useEffect(() => {
    const onHash = () => setCabinetOpen(window.location.hash === '#papa');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const openCabinet = () => {
    window.location.hash = 'papa';
    setCabinetOpen(true);
  };

  useEffect(() => {
    if (gameState !== 'splash' || !ready) return;
    const timer = setTimeout(() => setGameState('menu'), 700);
    return () => clearTimeout(timer);
  }, [gameState, ready]);

  const generateWordsOrder = useCallback(() => {
    const baseOrder = [...Array(WORDS.length).keys()];
    for (let i = baseOrder.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [baseOrder[i], baseOrder[j]] = [baseOrder[j], baseOrder[i]];
    }
    return baseOrder.slice(0, Math.min(50, baseOrder.length));
  }, []);

  const startGame = () => {
    resumeAudio();
    const order = generateWordsOrder();
    setWordsOrder(order);
    setCurrentWordIndex(0);
    setScore(0);
    setMistakes(0);
    setStreak(0);
    setBestStreak(0);
    setTotalEarned(0);
    setMistakeWords([]);
    // Выбираем случайный вариант ошибки (но не 'none' в 70% случаев)
    const wordIdx = order[0];
    const word = WORDS[wordIdx];
    const errorVariants = word.errors.filter(e => e.errorType !== 'none');
    const noErrorVariant = word.errors.find(e => e.errorType === 'none');
    
    let variant: number;
    if (Math.random() < 0.7 && errorVariants.length > 0) {
      const errVar = errorVariants[Math.floor(Math.random() * errorVariants.length)];
      variant = word.errors.indexOf(errVar);
    } else if (noErrorVariant) {
      variant = word.errors.indexOf(noErrorVariant);
    } else {
      variant = 0;
    }
    
    setCurrentErrorVariant(variant);
    setShowHint(false);
    setFeedback(null);
    setFixState(null);
    setUserFixedWord('');
    setGameState('showing');
    playShowSound();
  };

  const goToGuessing = () => {
    playClickSound();
    setGameState('guessing');
  };

  // Когда игрок говорит что есть ошибка - переходим к исправлению
  const handleHasError = () => {
    playClickSound();
    const wordIndex = wordsOrder[currentWordIndex];
    const word = WORDS[wordIndex];
    const errorData = word.errors[currentErrorVariant];
    
    if (errorData.errorType === 'none') {
      // Ошибки нет, а он сказал что есть
      setFeedback('wrong');
      void store.applyAnswer({
        ok: false,
        word: word.correctPlain,
        shown: errorData.wrong,
        expected: word.correct,
        choice: 'Сказал, что есть ошибка',
        errorType: 'none',
        detail: 'Ошибки не было',
        streakAfter: 0,
      });
      setMistakes(prev => prev + 1);
      setStreak(0);
      playWrongSound();
      setGameState('result');
    } else {
      // Переходим к исправлению
      setGameState('fixing');
    }
  };

  // Когда игрок говорит что всё верно
  const handleAllCorrect = () => {
    playClickSound();
    const wordIndex = wordsOrder[currentWordIndex];
    const word = WORDS[wordIndex];
    const errorData = word.errors[currentErrorVariant];
    
    if (errorData.errorType === 'none') {
      // Верно!
      setFeedback('correct');
      const newStreak = streak + 1;
      const reward = newStreak >= 2 ? settings.rewardStreak : settings.rewardCorrect;
      void store.applyAnswer({
        ok: true,
        word: word.correctPlain,
        shown: errorData.wrong,
        expected: word.correct,
        choice: 'Сказал, что всё верно',
        errorType: 'none',
        detail: 'Ошибки не было — правильно',
        streakAfter: newStreak,
      });
      setTotalEarned(prev => prev + reward);
      setScore(prev => prev + 1);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setShowConfetti(true);
      setShowMoneyAnim({ amount: reward, key: Date.now() });
      playCorrectSound();
      setTimeout(() => { setShowConfetti(false); playCoinSound(); }, 1200);
      setTimeout(() => setShowMoneyAnim(null), 2000);
      setGameState('result');
    } else {
      // Ошибка была, а он сказал что всё верно
      setFeedback('wrong');
      void store.applyAnswer({
        ok: false,
        word: word.correctPlain,
        shown: errorData.wrong,
        expected: word.correct,
        choice: 'Сказал, что всё верно',
        errorType: errorData.errorType,
        detail: 'Ошибка была, пропустил',
        streakAfter: 0,
      });
      setMistakes(prev => prev + 1);
      setStreak(0);
      setMistakeWords(prev => {
        const newMistakes = [...prev];
        if (!newMistakes.includes(wordIndex)) newMistakes.push(wordIndex);
        return newMistakes;
      });
      playWrongSound();
      setGameState('result');
    }
  };

  // Нажатие на букву в слове при исправлении
  const handleLetterClick = (letterIndex: number) => {
    playClickSound();
    const wordIndex = wordsOrder[currentWordIndex];
    const word = WORDS[wordIndex];
    const errorData = word.errors[currentErrorVariant];
    const wrongWord = errorData.wrong;
    
    // Определяем буквы без ударений для выбора
    const letters = getLettersArray(wrongWord);
    const correctLetters = getLettersArray(word.correct);
    
    // Предлагаем варианты замены
    const currentLetter = letters[letterIndex];
    const correctLetter = correctLetters[letterIndex];
    
    // Генерируем варианты (правильная + 2 неправильных)
    const alphabet = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
    const options = new Set<string>();
    options.add(correctLetter);
    
    // Добавляем случайные буквы
    while (options.size < 3) {
      const randomLetter = alphabet[Math.floor(Math.random() * alphabet.length)];
      if (randomLetter !== currentLetter) {
        options.add(randomLetter);
      }
    }
    
    // Перемешиваем
    const optionsArray = Array.from(options).sort(() => Math.random() - 0.5);
    
    setFixState({
      selectedLetterIndex: letterIndex,
      options: optionsArray,
      correctLetter: correctLetter,
    });
  };

  // Выбор буквы для замены
  const handleOptionSelect = (option: string) => {
    playClickSound();
    if (!fixState) return;
    
    const wordIndex = wordsOrder[currentWordIndex];
    const word = WORDS[wordIndex];
    const errorData = word.errors[currentErrorVariant];
    const wrongWord = errorData.wrong;
    const letters = getLettersArray(wrongWord);
    
    // Заменяем букву
    letters[fixState.selectedLetterIndex!] = option;
    const fixedWord = letters.join('');
    setUserFixedWord(fixedWord);
    
    // Проверяем правильность
    if (option === fixState.correctLetter) {
      // Правильно!
      setFeedback('correct');
      const newStreak = streak + 1;
      const reward = newStreak >= 2 ? settings.rewardStreak : settings.rewardCorrect;
      void store.applyAnswer({
        ok: true,
        word: word.correctPlain,
        shown: wrongWord,
        expected: word.correct,
        choice: `Исправил на «${option}»`,
        errorType: errorData.errorType,
        detail: 'Нашёл ошибку и поправил',
        streakAfter: newStreak,
      });
      setTotalEarned(prev => prev + reward);
      setScore(prev => prev + 1);
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      setShowConfetti(true);
      setShowMoneyAnim({ amount: reward, key: Date.now() });
      playCorrectSound();
      setTimeout(() => { setShowConfetti(false); playCoinSound(); }, 1200);
      setTimeout(() => setShowMoneyAnim(null), 2000);
    } else {
      // Неправильно
      setFeedback('wrong');
      void store.applyAnswer({
        ok: false,
        word: word.correctPlain,
        shown: wrongWord,
        expected: word.correct,
        choice: `Выбрал «${option}»`,
        errorType: errorData.errorType,
        detail: 'Не ту букву поставил',
        streakAfter: 0,
      });
      setMistakes(prev => prev + 1);
      setStreak(0);
      setMistakeWords(prev => {
        const newMistakes = [...prev];
        if (!newMistakes.includes(wordIndex)) newMistakes.push(wordIndex);
        return newMistakes;
      });
      playWrongSound();
    }
    
    setFixState(null);
    setGameState('result');
  };

  const useHint = () => {
    if (hints > 0) {
      playClickSound();
      void store.applyHint();
      setShowHint(true);
    }
  };

  const nextWord = () => {
    playClickSound();
    if (currentWordIndex + 1 >= wordsOrder.length) {
      setGameState('final');
    } else {
      const nextIndex = currentWordIndex + 1;
      
      // Вставляем слова с ошибками для повторения
      let updatedOrder = [...wordsOrder];
      if (mistakeWords.length > 0 && nextIndex % 7 === 0 && nextIndex < updatedOrder.length) {
        const mistakeWord = mistakeWords[Math.floor(Math.random() * mistakeWords.length)];
        updatedOrder.splice(nextIndex, 0, mistakeWord);
        setWordsOrder(updatedOrder);
      }
      
      setCurrentWordIndex(nextIndex);
      
      // Выбираем вариант ошибки
      const wordIdx = updatedOrder[nextIndex];
      const word = WORDS[wordIdx];
      const errorVariants = word.errors.filter(e => e.errorType !== 'none');
      const noErrorVariant = word.errors.find(e => e.errorType === 'none');
      
      let variant: number;
      if (Math.random() < 0.7 && errorVariants.length > 0) {
        const errVar = errorVariants[Math.floor(Math.random() * errorVariants.length)];
        variant = word.errors.indexOf(errVar);
      } else if (noErrorVariant) {
        variant = word.errors.indexOf(noErrorVariant);
      } else {
        variant = 0;
      }
      
      setCurrentErrorVariant(variant);
      setShowHint(false);
      setFeedback(null);
      setFixState(null);
      setUserFixedWord('');
      setGameState('showing');
      playShowSound();
    }
  };

  const goBack = () => {
    playClickSound();
    setGameState('menu');
  };

  const buyHint = () => {
    if (money >= settings.hintPrice) {
      playCoinSound();
      void store.applyShop(false);
    }
  };

  const buyHintPack = () => {
    if (money >= settings.hintPackPrice) {
      playCoinSound();
      void store.applyShop(true);
    }
  };

  const currentWord = wordsOrder.length > 0 && wordsOrder[currentWordIndex] !== undefined ? WORDS[wordsOrder[currentWordIndex]] : null;
  const displayedWord = currentWord ? (gameState === 'showing' ? currentWord.correct : currentWord.errors[currentErrorVariant].wrong) : '';
  const currentError = currentWord ? currentWord.errors[currentErrorVariant] : null;
  const progress = wordsOrder.length > 0 ? ((currentWordIndex) / wordsOrder.length) * 100 : 0;

  // Получаем подсказку
  const getHintText = () => {
    if (!currentError || !currentWord) return '';
    if (currentError.errorType === 'none') return 'Слово написано правильно!';
    if (currentError.errorType === 'letter') return `🔤 Найди ошибку в букве: ${currentError.letterHint || ''}`;
    if (currentError.errorType === 'stress') return `🎵 Найди неверное ударение`;
    return '';
  };

  if (cabinetOpen) {
    return (
      <div className="app-shell bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
        <PapaCabinet
          onClose={() => {
            if (window.location.hash === '#papa') {
              history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
            }
            setCabinetOpen(false);
          }}
        />
      </div>
    );
  }

  // Splash Screen
  if (gameState === 'splash') {
    return (
      <div className="splash-screen">
        <div className="splash-logo text-7xl md:text-9xl mb-4">📝</div>
        <div className="splash-title">
          <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent text-center px-4">
            Диктант Квест
          </h1>
          <p className="text-sm md:text-base text-white/60 text-center mt-3 px-4">Подготовка к диктанту • 1 класс</p>
        </div>
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] text-white">
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/60 animate-twinkle"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              animationDelay: Math.random() * 5 + 's',
              animationDuration: Math.random() * 3 + 2 + 's',
            }}
          />
        ))}
      </div>

      {showConfetti && <Confetti />}

      {showMoneyAnim && (
        <div key={showMoneyAnim.key} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
          <div className="text-4xl md:text-5xl font-black text-yellow-300 animate-money-pop drop-shadow-[0_0_20px_rgba(255,215,0,0.8)]">
            +{showMoneyAnim.amount} ₽ 💰
          </div>
        </div>
      )}

      {/* Top HUD */}
      {gameState !== 'menu' && gameState !== 'shop' && gameState !== 'final' && (
        <div className="app-hud">
          <div className="h-1 bg-white/10">
            <div className="h-full bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 transition-all duration-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]" style={{ width: `${progress}%` }} />
          </div>
          <div className="app-hud-bar bg-black/50 backdrop-blur-xl border-b border-white/10 px-2 py-2 flex justify-between items-center gap-2">
            <button type="button" onClick={goBack} className="btn-back hud-back shrink-0" aria-label="Назад">
              ←
            </button>
            <div className="flex items-center gap-1.5 overflow-hidden">
              <div className="bg-yellow-500/20 border border-yellow-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                <span className="text-xs">💰</span>
                <span className="font-black text-yellow-300 text-xs tabular-nums">{money}</span>
              </div>
              <div className="bg-blue-500/20 border border-blue-400/40 rounded-full px-2 py-1 flex items-center gap-1">
                <span className="text-xs">💡</span>
                <span className="font-black text-blue-300 text-xs">{hints}</span>
              </div>
              {streak >= 2 && (
                <div className="bg-orange-500/20 border border-orange-400/40 rounded-full px-2 py-1 animate-pulse">
                  <span className="text-xs font-black text-orange-300">🔥{streak}</span>
                </div>
              )}
            </div>
            <div className="bg-white/10 border border-white/20 rounded-full px-2 py-1 shrink-0">
              <span className="font-bold text-white/80 text-xs">{currentWordIndex + 1}/{wordsOrder.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* ============ MENU ============ */}
      {gameState === 'menu' && (
        <div className="app-screen relative">
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="relative inline-block mb-4">
              <div className="text-7xl md:text-8xl animate-float">📝</div>
              <div className="absolute -top-2 -right-4 text-2xl animate-spin-slow">✨</div>
            </div>
            <h1 className="text-4xl font-black mb-2">
              <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                Диктант Квест
              </span>
            </h1>
            <p className="text-base md:text-lg text-purple-200/80 font-medium">
              1 класс • {WORDS.length} слов
            </p>
          </div>

          <div className="glass-card max-w-sm w-full animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <div className="space-y-2 mb-4">
              <RuleRow emoji="✅" bg="from-green-500/20 to-emerald-500/20" border="border-green-400/30" text="Правильно" reward={`+${settings.rewardCorrect} ₽`} textColor="text-green-200" rewardColor="text-green-300" />
              <RuleRow emoji="🔥" bg="from-orange-500/20 to-red-500/20" border="border-orange-400/30" text="Серия 3+" reward={`+${settings.rewardStreak} ₽`} textColor="text-orange-200" rewardColor="text-orange-300" />
              <RuleRow emoji="❌" bg="from-red-500/20 to-pink-500/20" border="border-red-400/30" text="Ошибка" reward={`-${settings.penaltyWrong} ₽`} textColor="text-red-200" rewardColor="text-red-300" />
            </div>

            <div className="bg-white/5 rounded-2xl p-3 mb-4 border border-white/10">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-white/50">Баланс</p>
                  <p className="text-xl font-black text-yellow-300">{ready ? `${money} ₽` : "…"}</p>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-white/50">Подсказки</p>
                  <p className="text-xl font-black text-blue-300">{ready ? `${hints} 💡` : "…"}</p>
                </div>
              </div>
              <p className="text-[11px] text-white/40 mt-2 text-center">
                {syncing ? "Сохраняем в общую базу…" : "Один баланс на все телефоны и ярлыки"}
              </p>
            </div>

            <button onClick={startGame} disabled={!ready} className="w-full btn-primary text-base py-3.5 mb-2 disabled:opacity-50">
              🚀 Начать!
            </button>
            <button onClick={() => { resumeAudio(); playClickSound(); setGameState('shop'); }} className="w-full btn-secondary text-sm py-2.5 mb-2">
              🛒 Магазин
            </button>
            <button onClick={() => { playClickSound(); openCabinet(); }} className="w-full btn-secondary text-sm py-2.5">
              🔐 Кабинет папы
            </button>
          </div>
        </div>
      )}

      {/* ============ SHOP ============ */}
      {gameState === 'shop' && (
        <div className="app-screen">
          <div className="text-center mb-6 animate-fade-in-up">
            <div className="text-6xl mb-3">🛒</div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-200 to-cyan-200 bg-clip-text text-transparent">Магазин</h1>
            <p className="text-sm text-white/60 mt-1">💰 <span className="text-yellow-300 font-bold">{money} ₽</span></p>
          </div>

          <div className="glass-card max-w-sm w-full space-y-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <ShopItem emoji="💡" title="Подсказка" desc="Покажет что искать" price={settings.hintPrice} owned={hints} canBuy={money >= settings.hintPrice} gradient="from-blue-500/20 to-cyan-500/20" border="border-blue-400/30" onBuy={buyHint} />
            <ShopItem emoji="🎁" title="Набор +3" desc="Три подсказки сразу" price={settings.hintPackPrice} owned={hints} canBuy={money >= settings.hintPackPrice} gradient="from-purple-500/20 to-pink-500/20" border="border-purple-400/30" onBuy={buyHintPack} isPack />
          </div>

          <button onClick={() => { playClickSound(); setGameState('menu'); }} className="mt-5 btn-secondary px-8 py-3 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            ← Назад
          </button>
        </div>
      )}

      {/* ============ SHOWING ============ */}
      {gameState === 'showing' && currentWord && (
        <div className="app-screen app-screen-hud">
          <div className="play-stage">
            <div className="play-badge bg-yellow-500/15 border-yellow-400/30 text-yellow-100">
              <span>📖</span>
              <span>Запомни слово!</span>
            </div>
            <div className="play-hero">
              <div className="play-emoji animate-float">{currentWord.emoji}</div>
              <div className="word-card-showing">
                <div className="play-word animate-word-appear">{displayedWord}</div>
              </div>
            </div>
            <button onClick={goToGuessing} className="play-cta btn-primary">
              Далее →
            </button>
          </div>
        </div>
      )}

      {/* ============ GUESSING ============ */}
      {gameState === 'guessing' && currentWord && (
        <div className="app-screen app-screen-hud">
          <div className="play-stage">
            <div>
              <div className="play-badge bg-purple-500/15 border-purple-400/30 text-purple-100">
                <span>🔍</span>
                <span>Что с этим словом?</span>
              </div>
              {showHint && (
                <div className="play-hint">{getHintText()}</div>
              )}
            </div>
            <div className="play-hero">
              <div className="play-emoji">{currentWord.emoji}</div>
              <div className="word-card-guessing">
                <div className="play-word">{displayedWord}</div>
              </div>
            </div>
            <div className="play-actions">
              <div className="play-choice-row">
                <button onClick={handleHasError} className="flex-1 btn-danger play-choice">
                  <span className="text-2xl block mb-1">✏️</span>
                  Есть ошибка!
                </button>
                <button onClick={handleAllCorrect} className="flex-1 btn-success play-choice">
                  <span className="text-2xl block mb-1">✅</span>
                  Всё верно!
                </button>
              </div>
              {hints > 0 && !showHint && (
                <button onClick={useHint} className="btn-hint play-hint-btn">
                  💡 Подсказка ({hints})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ FIXING ============ */}
      {gameState === 'fixing' && currentWord && !fixState && (
        <div className="app-screen app-screen-hud">
          <div className="play-stage">
            <div>
              <div className="play-badge bg-orange-500/15 border-orange-400/30 text-orange-100">
                <span>✏️</span>
                <span>Нажми на неправильную букву!</span>
              </div>
              {showHint && currentError && (
                <div className="play-hint">{getHintText()}</div>
              )}
            </div>
            <div className="play-hero">
              <div className="play-emoji">{currentWord.emoji}</div>
              <div className="word-card-fixing">
                <div className="play-letters">
                  {getLettersArray(displayedWord).map((letter, i) => (
                    <button
                      key={i}
                      onClick={() => handleLetterClick(i)}
                      className="letter-tile animate-letter-pop"
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="play-tip">👆 Нажми на букву, которую нужно исправить</p>
          </div>
        </div>
      )}

      {/* ============ FIXING - выбор буквы ============ */}
      {gameState === 'fixing' && currentWord && fixState && (
        <div className="app-screen app-screen-hud">
          <div className="play-stage">
            <div className="play-badge bg-cyan-500/15 border-cyan-400/30 text-cyan-100">
              <span>🔄</span>
              <span>Выбери правильную букву</span>
            </div>
            <div className="play-hero">
              <div className="word-card-fixing">
                <div className="play-letters">
                  {getLettersArray(displayedWord).map((letter, i) => (
                    <span
                      key={i}
                      className={`letter-tile-static ${i === fixState.selectedLetterIndex ? 'letter-tile-selected' : ''}`}
                    >
                      {i === fixState.selectedLetterIndex ? '?' : letter}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="play-options">
              {fixState.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionSelect(option)}
                  className="option-letter-btn"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============ RESULT ============ */}
      {gameState === 'result' && currentWord && (
        <div className="app-screen app-screen-hud">
          <div className="play-stage">
            {feedback === 'correct' ? (
              <div className="play-hero">
                <div className="play-emoji animate-bounce-big">🎉</div>
                <h2 className="play-title text-green-300">Молодец!</h2>
                <div className="glass-card-result border-green-400/30 bg-green-500/10 w-full">
                  <p className="text-sm text-green-200/70 mb-1 uppercase tracking-wider font-bold">Правильно</p>
                  <p className="play-word mb-2">{currentWord.correct}</p>
                  {currentError?.errorType !== 'none' && (
                    <div className="bg-red-500/10 rounded-xl p-3 border border-red-400/20">
                      <p className="text-base text-red-200/80">Было: <span className="text-red-300 line-through">{displayedWord}</span></p>
                    </div>
                  )}
                </div>
                <div className="play-money text-yellow-300">
                  +{streak >= 2 ? settings.rewardStreak : settings.rewardCorrect} ₽ 💰
                  {streak >= 2 && <span className="text-orange-400 ml-2">🔥</span>}
                </div>
              </div>
            ) : (
              <div className="play-hero">
                <div className="play-emoji">😔</div>
                <h2 className="play-title text-red-300">Неправильно</h2>
                <div className="glass-card-result border-red-400/30 bg-red-500/10 w-full">
                  <p className="text-sm text-red-200/70 mb-1 uppercase tracking-wider font-bold">Запомни</p>
                  <p className="play-word mb-2">{currentWord.correct}</p>
                  {currentError?.errorType !== 'none' && (
                    <div className="bg-red-500/10 rounded-xl p-3 border border-red-400/20">
                      <p className="text-base text-red-200/80">Было: <span className="text-red-300">{displayedWord}</span></p>
                    </div>
                  )}
                </div>
                <div className="play-money text-red-300">-{settings.penaltyWrong} ₽ 💸</div>
              </div>
            )}
            <button onClick={nextWord} className="play-cta btn-primary">
              {currentWordIndex + 1 >= wordsOrder.length ? '🏆 Итоги' : '➡️ Дальше'}
            </button>
          </div>
        </div>
      )}

      {/* ============ FINAL ============ */}
      {gameState === 'final' && (
        <div className="app-screen">
          <div className="text-center mb-4 animate-fade-in-up">
            <div className="text-7xl mb-3 animate-bounce-big">🏆</div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-200 to-orange-200 bg-clip-text text-transparent">
              Готово!
            </h1>
          </div>

          <div className="glass-card max-w-sm w-full animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <div className="space-y-2 mb-4">
              <StatRow label="Правильных" value={`${score}/${wordsOrder.length}`} color="green" />
              <StatRow label="Ошибок" value={`${mistakes}`} color="red" />
              <StatRow label="Лучшая серия" value={`🔥 x${bestStreak}`} color="orange" />
              <StatRow label="Заработано" value={`${totalEarned} ₽`} color="yellow" />
              <StatRow label="Баланс" value={`${money} ₽`} color="purple" />
            </div>

            <div className="text-center bg-white/5 rounded-2xl p-4 mb-4 border border-white/10">
              {score >= 35 ? (
                <><div className="text-4xl mb-1">🌟🌟🌟</div><p className="text-sm text-yellow-200 font-bold">Мастер!</p></>
              ) : score >= 25 ? (
                <><div className="text-4xl mb-1">🌟🌟</div><p className="text-sm text-yellow-200 font-bold">Отлично!</p></>
              ) : score >= 15 ? (
                <><div className="text-4xl mb-1">🌟</div><p className="text-sm text-yellow-200 font-bold">Хорошо!</p></>
              ) : (
                <><div className="text-4xl mb-1">💪</div><p className="text-sm text-yellow-200 font-bold">Ещё раз!</p></>
              )}
            </div>

            <div className="flex gap-2">
              <button onClick={startGame} className="flex-1 btn-primary py-2.5 text-sm">🔄 Ещё</button>
              <button onClick={() => { playClickSound(); setGameState('menu'); }} className="flex-1 btn-secondary py-2.5 text-sm">🏠 Меню</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Утилита: разбивает слово на массив букв (с учётом ударений)
function getLettersArray(word: string): string[] {
  const letters: string[] = [];
  for (let i = 0; i < word.length; i++) {
    const char = word[i];
    const nextChar = word[i + 1];
    // Если следующий символ - знак ударения, присоединяем его к текущей букве
    if (nextChar === '\u0301') {
      letters.push(char + nextChar);
      i++; // пропускаем знак ударения
    } else {
      letters.push(char);
    }
  }
  return letters;
}

// ============ SUB-COMPONENTS ============

function RuleRow({ emoji, bg, border, text, reward, textColor, rewardColor }: {
  emoji: string; bg: string; border: string; text: string; reward: string; textColor: string; rewardColor: string;
}) {
  return (
    <div className={`flex items-center gap-2 bg-gradient-to-r ${bg} border ${border} rounded-xl p-2.5`}>
      <span className="text-xl">{emoji}</span>
      <div className="flex-1 flex justify-between items-center">
        <span className={`font-bold text-sm ${textColor}`}>{text}</span>
        <span className={`font-black text-sm ${rewardColor}`}>{reward}</span>
      </div>
    </div>
  );
}

function ShopItem({ emoji, title, desc, price, owned, canBuy, gradient, border, onBuy, isPack }: {
  emoji: string; title: string; desc: string; price: number; owned: number; canBuy: boolean;
  gradient: string; border: string; onBuy: () => void; isPack?: boolean;
}) {
  return (
    <div className={`bg-gradient-to-r ${gradient} border ${border} rounded-2xl p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl">{emoji}</span>
        <div className="flex-1">
          <h3 className="font-bold text-sm">{title}</h3>
          <p className="text-xs text-white/50">{desc}</p>
        </div>
        <span className="text-yellow-300 font-black text-sm">{price} ₽</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs">У тебя: {owned}</span>
        <button
          onClick={onBuy}
          disabled={!canBuy}
          className={`px-4 py-1.5 rounded-xl font-bold text-sm transition-all ${
            canBuy
              ? 'bg-white/20 hover:bg-white/30 text-white transform hover:scale-105 active:scale-95'
              : 'bg-white/5 text-white/30 cursor-not-allowed'
          }`}
        >
          {isPack ? '+3 шт.' : 'Купить'}
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-500/15 border-green-400/30 text-green-300',
    red: 'bg-red-500/15 border-red-400/30 text-red-300',
    orange: 'bg-orange-500/15 border-orange-400/30 text-orange-300',
    yellow: 'bg-yellow-500/15 border-yellow-400/30 text-yellow-300',
    purple: 'bg-purple-500/15 border-purple-400/30 text-purple-300',
  };
  return (
    <div className={`flex justify-between items-center ${colors[color]} border rounded-xl p-2.5`}>
      <span className="font-medium text-sm">{label}</span>
      <span className="text-lg font-black">{value}</span>
    </div>
  );
}

function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: Math.random() * 100 + '%',
            top: '-20px',
            animationDelay: Math.random() * 0.8 + 's',
            animationDuration: Math.random() * 2 + 2 + 's',
          }}
        >
          <div
            style={{
              width: Math.random() * 8 + 6 + 'px',
              height: Math.random() * 8 + 6 + 'px',
              backgroundColor: ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff9f43'][Math.floor(Math.random() * 8)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default App;
