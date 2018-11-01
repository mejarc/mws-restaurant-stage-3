/**
 * Common database helper functions.
 */
class DBHelper {
  /*
   * Constants
   */
  static get REST_DB() {
    return 'RestaurantDB';
  }
  static get REST_STORE() {
    return 'RestaurantStore';
  }
  static get DATABASE_URL() {
    const port = 1337; // Stage 3 server port
    return `http://localhost:${port}/restaurants`;
  }
  static get REVIEW_URL() {
    const port = 1337;
    return `http://localhost:${port}/reviews`;
  }
  static get DATABASE_VERSION() {
    return 3;
  }
  static get REVIEW_STORE() {
    return 'ReviewStore';
  }
  static fetchError(err, asset) {
    console.error(`ERROR (${err}) when attempting to fetch ${asset}`);
  }
  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {
    // Try to fetch from server first.
    // If the data are there, add to the database. 
    // If the server fails, use the stored data 
    fetch(DBHelper.DATABASE_URL, {
        method: 'GET'
      }).then(response => response.json())
      .then(data => {
        // take fresh network data and store in local DB
        DBHelper.createDb(data);
        callback(null, data);
      }).catch(() => {
        let idb = indexedDB.open(DBHelper.REST_DB, DBHelper.DATABASE_VERSION);
        idb.onsuccess = e => {
          let db = e.target.result;
          let tx = db.transaction(DBHelper.REST_STORE);
          let store = tx.objectStore(DBHelper.REST_STORE);
          let request = store.getAll();
          request.onsuccess = () => {
            callback(null, request.result);
          }
        }
      });
  }
  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch restaurants first. Note that
    // api endpoint is different. Success will
    // result in storing reviews.
    return fetch(`${DBHelper.REVIEW_URL}/?restaurant_id=${id}`)
      .then(response => {
        if (!response.ok) {
          return Promise.reject(`Reviews for ${id} could not be fetched from network.`);
        }
        return response.json();
      }).then(fetchedReviews => {
        DBHelper.putReviews(fetchedReviews);
        return fetchedReviews;
      }).catch(fetchError => {
        // use DB if fetching fails
        console.log(`Fetching reviews failed, so let's try idb`);
        return DBHelper.getReviewsForRestaurant(id);
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants;
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurants/${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    let img = restaurant.photograph || restaurant.id;
    return (`/img/${img}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP
    });
    return marker;
  }

  /**
   * Create local database, save restaurant
   * data as store.
   */
  static createDb(restaurants) {
    let idb = indexedDB.open(DBHelper.REST_DB, DBHelper.DATABASE_VERSION);

    idb.onerror = error => {
      console.error(`ERROR (${error}) when trying to create database.`);
    };

    idb.onupgradeneeded = evt => {
      let db = evt.target.result;
      let store = db.createObjectStore(DBHelper.REST_STORE, {
        keyPath: 'id'
      });
      store.createIndex('byId', 'id');
      store.transaction.oncomplete = () => {
        let restStore = db.transaction([DBHelper.REST_STORE], 'readwrite').objectStore(DBHelper.REST_STORE);
        // take data and place into store
        for (let i = 0; i < restaurants.length; i++) {
          restStore.put(restaurants[i]);
        }
      };
    };
  }
  /**
   * Save new restaurant review(s) to the database
   */
  static putReviews(reviews) {
    // if there is only one review, still treat 
    // it as an array
    // TODO: why not use typeof?
    if (!reviews.push) reviews = [reviews];
    let idb = indexedDB.open(DBHelper.REST_DB, DBHelper.DATABASE_VERSION);
    idb.onerror = error => {
      console.error(`ERROR ${error} when trying to open review store.`);
    };
    idb.onupgradeneeded = evt => {
      let db = evt.target.result;
      let store = db.createObjectStore(DBHelper.REVIEW_STORE, {
        keyPath: 'id'
      });
      store.createIndex('restaurant_id', 'id');
      store.transaction.oncomplete = () => {
        let reviewStore = db.transaction([DBHelper.REVIEW_STORE], 'readwrite').objectStore(DBHelper.REVIEW_STORE);
        // take review data and place into store
        for (let i = 0; i < reviews.length; i++) {
          reviewStore.put(reviews[i]);
        }
      };
    };
  }
  /**
   * Fetch reviews from network or DB
   */
  static fetchReviews(id, callback) {
    // try to get reviews online first.
    // stow them in the database once received.
    // if offline, use stored data
    fetch(DBHelper.DATABASE_URL, {
        method: 'GET'
      }).then(response => response.json())
      .then(data => {
        DBHelper.putReviews(data);
        callback(null, data);
      }).catch(() => {
        // obtaining data from review store in DB
        let idb = indexedDB.open(DBHelper.REST_DB, DBHelper.DATABASE_VERSION);
        idb.onsuccess = evt => {
          let db = evt.target.result;
          let tx = db.transaction(DBHelper.REVIEW_STORE);
          let store = tx.objectStore(DBHelper.REVIEW_STORE);
          let request = store.getAll(Number(id));
          request.onsuccess = () => {
            callback(null, request.result);
          }
        }
      });

  }
  /**
   * get reviews for specified restaurant
   */
  static getReviewsForRestaurant(id) {
      DBHelper.fetchReviews((error, id) => {
          if (error) {
            callback(error, null);
          } else {
            callback(null, id);
          }
        };
      }
