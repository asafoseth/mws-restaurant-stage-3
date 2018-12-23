/**
 * Common database helper functions.
 * Fetch all restaurant data needed by app asyncrounously from external server.
 */  
  class DBHelper {
    //INDEX DB
    //checking for browser compatibility to idb abd servise workers
    /*
    static openDatabase(){
      if(!window.navigator.serviceWorker){
        console.error(
          "Your browser version does not support service workers or idb, kinldy update to the latest version of browser."
        );
        return Promise.resolve();
      }
    }
    */
      static dbPromise() {
      return idb.open("restaurantDb", 2, upgradeDb => {
        switch (upgradeDb.oldVersion) {
          case 0:
            upgradeDb.createObjectStore("restaurants", {
            keypath: "id"
          });
          case 1:
            const reviewStore = upgradeDb.createObjectStore('reviews', {
              keypath: 'id'
            });
            //index review database
            reviewStore.createIndex('restaurant', 'restaurant_id');
        }
        });
      }
/*
    //using fetch api to fetch data from server
    static fetchRestaurantsfromServer() {
      return fetch('http://localhost:1337/restaurants')
      .then(function(response) {
        return response.json()})
        .then(restaurants =>{
              DBHelper.storeRestaurantsInDB(restaurants);
              return restaurants;
          })
    }

    //Save fetched restaurant data and store in idb
    static storeRestaurantsInDB(restaurants_data){
      return DBHelper.dbPromise()
      .then(restaurantDb => {
        if(!restaurantDb) return;
        const tx = restaurantDb.transaction("restaurants", "readwrite");
        const restaurantStore = tx.objectStore("restaurants");
        restaurants_data.forEach(restaurant => {
          restaurantStore.put(restaurant, restaurant.id);
        });
      });
    }

    // Fetch restaurants stored from idb
    static fetchStoredRestaurants(){
      return DBHelper.dbPromise().then(restaurantDb => {
        if(!restaurantDb){
          return;
        }
        let store = restaurantDb
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
*/
  static fetchRestaurants(){
    return this.dbPromise()
    .then(restaurantDb => {
      const tx = restaurantDb.transaction('restaurants');
      const restaurantStore = tx.objectStore('restaurants');
      return restaurantStore.getAll();
    })
    .then(restaurants => {
      if (restaurants.length !==0) {
        return Promise.resolve(restaurants);
      }
      return this.fetchAndStoreRestaurants();
    })
  }

  static fetchAndStoreRestaurants() {
    return fetch('http://localhost:1337/restaurants')
    .then(response => response.json())
    .then(restaurants => {
      return this.dbPromise()
      .then(restaurantDb => {
        const tx = restaurantDb.transaction('restaurants', 'readwrite');
        const restaurantStore = tx.objectStore('restaurants');
        restaurants.forEach(restaurant => restaurantStore.put(restaurant, restaurant.id));

        return tx.complete.then(() => Promise.resolve(restaurants));
      });
    });
  }

   /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    // fetch all restaurants with proper error handling.
    return DBHelper.fetchRestaurants()
    .then(restaurants => restaurants.find(r => r.id === id)
      );
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return DBHelper.fetchRestaurants()
    .then(restaurants => restaurants.filter(r => r.cuisine_type === cuisine)
      );
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(restaurants => restaurants.filter(r => r.neighborhood === neighborhood)
      );
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
    .then(restaurants => {
      let res = restaurants;
      //condition to filter by cuisine
      if (cuisine !== 'all') {
        res = res.filter(r => r.cuisine_type == cuisine);
      }
      //condition to filter by neighbourhood
      if (neighborhood !== 'all') {
        res = res.filter(r => r.neighborhood == neighborhood);
      }
      return res;
    });
  }


  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
     .then(restaurants => {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        return uniqueNeighborhoods;
      }
    );
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants()
     .then(restaurants => {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        return uniqueCuisines;  
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

  static addReview(review) {
    let offline_obj = {
      name: 'addReview',
      data: review,
      object_type: 'review'
    };
  
    //check if online
   if (!navigator.onLine && (offline_obj.name === 'addReview')) {
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
     .then((data) => {console.log(`Info: Successfully Fetch data`)})
     .catch(error => console.log('error', error));
    }

    static sendDataWhenOnline(offline_obj) {
      console.log('Offline Object', offline_obj);
      localStorage.setItem('data', JSON.stringify(offline_obj.data));
      console.log(`Local Store: ${offline_obj.object_type} stored`);
      window.addEventListener('online', (event) => {
        console.log('Network Status: Online');
        let data = JSON.parse(localStorage.getItem('data'));
        console.log('Updating UI');
        [...document.querySelectorAll(".reviews_offline")]
        .forEach(el => {
          el.classList.remove("reviews_offline")
          el.querySelector(".offline_label").remove()
        });
        if (data !== null) {
          console.log(data);
          if (offline_obj.name === 'addReview') {
            DBHelper.addReview(offline_obj.data);
          }
  
          console.log('Local Storage: data submitted');
  
          localStorage.removeItem('data');
          console.log(`Local Storage: ${offline_obj.object_type} removed`)
        }
      });
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
      .then(restaurantDb => {
        const tx = restaurantDb.transaction('restaurants', 'readwrite');
        const restaurantStore = tx.objectStore('restaurants');
        restaurantStore.get(restaurantId)
          .then(restaurant => {
            restaurant.is_favorite = isFavorite;
            restaurantStore.put(restaurant, restaurant.id);
          });
      })
  })
}



//Fetch Reviews
static storeIDB(table, objects) {
  this.dbPromise()
  .then(restaurantDb => {
    if (!restaurantDb) return;
    let tx = restaurantDb.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    if (Array.isArray(objects)) {
      objects.forEach(function(object){
        store.put(object);
      });
    }
    else {
      store.put(objects);
    }
  });
}

//Fetch stored reviews from idb
static getStoredObjectById(table, idx, id) {
  return this.dbPromise()
    .then(function(restaurantDb) {
      if (!restaurantDb) return;

      const store = restaurantDb.transaction(table).objectStore(table);
      const indexId = store.index(idx);
      return indexId.getAll(id);
    });
}


static fetchReviewsByResId(id) {
  return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
    .then(response => response.json())
    .then(reviews => {
      console.log('fetching reviews by restaurant id');
      this.dbPromise()
        .then(restaurantDb => {
          if (!restaurantDb) return;
          let tx = restaurantDb.transaction('reviews', 'readwrite');
          const store = tx.objectStore('reviews');
          if (Array.isArray(reviews)) {
            reviews.forEach(function(review) {
              store.put(review, review.restaurant_id);
            });
          } else {
            
            store.put(reviews, review.restaurant_id);
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

static fetchReviews(id) {
  return this.dbPromise()
  .then(restaurantDb => {
    const tx = restaurantDb.transaction('reviews');
    const reviewStore = tx.objectStore('reviews');
    return reviewStore.getAll();
  })
  .then(reviews => {
    if (reviews.length !==0) {
      return Promise.resolve(reviews);
    }
    return this.fetchAndStoreReviews(id);
  })
}

static fetchAndStoreReviews(id) {
  return fetch(`http://localhost:1337/reviews/?restaurant_id=${id}`)
  .then(response => response.json())
  .then(reviews => {
    return this.dbPromise()
    .then(restaurantDb => {
      const tx = restaurantDb.transaction('reviews', 'readwrite');
      const restaurantStore = tx.objectStore('reviews');
      reviews.forEach(review => restaurantStore.put(review, review.restaurant_id));

      return tx.complete.then(() => Promise.resolve(reviews));
    });
  });
}

static fetchReviewsByRestaurantId(id) {
  return this.fetchReviews(id).then(reviews => {
    return this.dbPromise().then(restaurantDb => {
      const tx = restaurantDb.transaction('reviews');
      const reviewsStore = tx.objectStore('reviews');
      const restaurantIndex = reviewsStore.index('restaurant');
      return restaurantIndex.getAll(id);
    }).then(restaurantReviews => {
      const filtered = reviews.filter(review => review.restaurant_id === id);
      return filtered;
    })
  })
}

}//end class
