
/**
 * Common database helper functions.
 * Fetch all restaurant data needed by app asyncrounously from external server.
 */  
  class DBHelper {
    //INDEX DB
    //checking for browser compatibility to idb abd servise workers
    static openDatabase(){
      if(!window.navigator.serviceWorker){
        console.error(
          "Your browser version does not support service workers or idb, kinldy update to the latest version of browser."
        );
        return Promise.resolve();
      }

      let indexDB = idb.open("restaurantsDb", 1, upgradeDb => {
        const store = upgradeDb.createObjectStore("restaurants", {
          keypath: "id"
        });
        store.createIndex("res_data", "id");
      });
      return indexDB;
    }

    //using fetch api to fetch data from server
    static fetchRestaurantsfromServer() {
      return fetch('http://localhost:1337/restaurants').then(function(response) {
        return response.json()
        }).then(restaurants =>{
              DBHelper.storeRestaurantsInDB(restaurants);
              return restaurants;
          })
    }

    //Save fetched restaurant data and store in idb
    static storeRestaurantsInDB(restaurants_data){
      return DBHelper.openDatabase().then(database => {
        if(!database) return;
        const tx = database.transaction("restaurants", "readwrite");
        const store = tx.objectStore("restaurants");
        restaurants_data.forEach(restaurant => {
          store.put(restaurant, restaurant.id);
        });
        return tx.complete;
      });
    }

    // Fetch restaurants stored from idb
    static fetchStoredRestaurants(){
      return DBHelper.openDatabase().then(database => {
        if(!database){
          return;
        }
        let store = database
        .transaction("restaurants")
        .objectStore("restaurants");

        return store.getAll();
      });
    }

// Fetch all restaurants
static fetchRestaurants(callback) {
  return DBHelper.fetchStoredRestaurants()
  .then(restaurants =>{
    if(!restaurants.length){
      return DBHelper.fetchRestaurantsfromServer();
    }
    return Promise.resolve(restaurants);
  }).then(restaurants => {callback(null, restaurants);
  }).catch(error => {callback(error, null);
  });
}

   /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
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
        let results = restaurants
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
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
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
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
      if (typeof restaurant.photograph != 'undefined'){
        return (`/img/${restaurant.photograph}${'.jpg'}`)
      }
      else{
        return ('http://goo.gl/vyAs27');
      }
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
      alt: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant)
      })
      marker.addTo(newMap);
    return marker;
  } 

  }
