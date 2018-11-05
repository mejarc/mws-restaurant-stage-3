import { DBHelper } from './dbhelper.js';

const DATABASE_URL() {
  const port = 1337; // Stage 3 server port
  return `http://localhost:${port}/restaurants`;
};

function handleClick() {
  // TODO: figure out where dataset.id comes from
  const restaurantId = this.dataset.id;
  const fav = this.getAttribute('aria-pressed') == 'true';
  const url = `${DATABASE_URL}/${restaurantId}/?is_favorite=${!fav}`;
  // TODO: background sync will be here somewhere
  // meanwhile, fetch data on click--note `PUT` method
  return fetch(url, { method: 'PUT' })
  .then(response => {
    if (!response.ok) return Promise.reject('Could NOT connect to faves URL');
    return response.json();
  })
  .then(updatedRestaurant => {
    // updated the restaurant's record in indexedDB
    DBHelper.putRestaurants(updatedRestaurant, true);
    // toggle button to whatever its opposite will be
    this.setAttribute('aria-pressed', !fav);
  });
}
export default function favoriteButton(restaurant) {
  // create the button, with the restaurant's id and name.
  // icon will be a white star.
  // TODO: turn icon to black star (&#x2605;) on press.
  const button = document.createElement('button');
  button.innerHTML = '&#x2606;';
  button.dataset.id = restaurant.id;
  button.className = 'fav';
  button.setAttribute('aria-label', `Mark ${restaurant.name} as one of your favorites.`);
  button.setAttribute('aria-pressed', restaurant.is_favorite);
  // onclick will send the data
  button.onclick = handleClick;
  return button;
}