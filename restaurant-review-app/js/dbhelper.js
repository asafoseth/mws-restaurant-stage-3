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
    }

      static dbPromise() {
      return idb.open("db", 2, upgradeDb => {
        switch (upgradeDb.oldVersion) {
          case 0:
            upgradeDb.createObjectStore("restaurants", {
            keypath: "id"
          });
          case 1:
            const reviewStore = upgradeDb.createObjectStore('reviews', {
              keypath: 'id'
            });
          reviewStore.createIndex("res_info", "res_id");
        }
        });
      }

    //using fetch api to fetch data from server
    static fetchRestaurantsfromServer() {
      return fetch('http://localhost:1337/restaurants')
      .then(function(response) {
        return response.json()
        }).then(restaurants =>{
              DBHelper.storeRestaurantsInDB(restaurants);
              return restaurants;
          })
    }

    //Save fetched restaurant data and store in idb
    static storeRestaurantsInDB(restaurants_data){
      return DBHelper.dbPromise().then(db => {
        if(!db) return;
        const tx = db.transaction("restaurants", "readwrite");
        const store = tx.objectStore("restaurants");
        restaurants_data.forEach(restaurant => {
          store.put(restaurant, restaurant.id);
        });
        return tx.complete;
      });
    }

    // Fetch restaurants stored from idb
    static fetchStoredRestaurants(){
      return DBHelper.dbPromise().then(db => {
        if(!db){
          return;
        }
        let store = db
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

//Update Favorite Status
static updateFavoriteStatus(restaurantId, isFavorite) {
  console.log('Changing Restaurant status to: ', isFavorite);

  fetch(`http://localhost:1337/restaurants/${restaurantId}/?is_favorite=${isFavorite}`, {
    method: 'PUT'
  })
  .then(() => {
    console.log('Status chanaged');
    this.dbPromise()
      .then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const restaurantStore = tx.objectStore('restaurants');
        restaurantStore.get(restaurantId)
          .then(restaurant => {
            restaurant.is_favorite = isFavorite;
            restaurantStore.put(restaurant);
          });
      })
  })
}

//Fetch Reviews
static fetchReviewsByResId(id) {
  return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
    .then(response => response.json())
    .then(reviews => {
      this.dbPromise()
        .then(db => {
          if (!db) return;

          let tx = db.transaction('reviews', 'readwrite');
          const store = tx.objectStore('reviews');
          if (Array.isArray(reviews)) {
            reviews.forEach(function(review) {
              store.put(review);
            });
          } else {
            store.put(reviews);
          }
        });
      console.log('Reviews: ', reviews);
      return Promise.resolve(reviews);
    })
    .catch(error => {
      return DBHelper.getStoredObjectById('reviews', 'restaurant', id)
        .then((storedReviews) => {
          console.log('Getting offline version');
          return Promise.resolve(storedReviews);
        })
    });
}

//Fetch stored reviews from idb
static getStoredObjectById(table, idx, id) {
  return this.dbPromise()
    .then(function(db) {
      if (!db) return;

      const store = db.transaction(table).objectStore(table);
      const indexId = store.index(idx);
      return indexId.getAll(id);
    });
}

static addReview(review) {
  let offline_obj = {
    name: 'addReview',
    data: review,
    object_type: 'review'
  };

  //check if online
 if (!navigator.onLine  && (offline_obj.name === 'addReview')) {
  DBHelper.sendDataWhenOnline(offline_obj);
  return;
}
let reviewSend = {
  "name": review.name,
  "rating": parseInt(review.rating),
  "comments": review.comments,
  "restaurant_id": parseInt(review.restaurant_id) 
 };
 console.log('Sending review: ', reviewSend);
 var fetch_options = {
   method: 'POST',
   body: JSON.stringify(reviewSend),
   headers: new Headers({
     'Content-Type': 'application/json'
   })
 };
 fetch(`http://localhost:1337/reviews`, fetch_options).then((response) => {
   const contentType = response.headers.get('content-type');
   if (contentType && contentType.indexOf('application/json') !== -1) {
     return response.json();
   } else {return 'API call successfull'}})
   .then((data) => {console.log(`Fetch successful`)})
   .catch(error => console.log('error', error));
  }
}//end class
