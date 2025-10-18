// src/data/cards.js
import CARDS from './generated/cards.json';
export { CARDS };
export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));
export default CARDS;
