let restaurants,
  neighborhoods,
  cuisines
var newMap
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
    .then(neighborhoods => {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    })
    .catch(error => console.error(error));
}

/**
 * Set neighborhoods HTML.
 */
fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
fetchCuisines = () => {
  DBHelper.fetchCuisines()
  .then(cuisines => {
    self.cuisines = cuisines;
    fillCuisinesHTML();
  })
  .catch(error => console.log(error));
}

/**
 * Set cuisines HTML.
 */
fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
initMap = () => {
  self.newMap = L.map('map', {
        center: [40.722216, -73.987501],
        zoom: 12,
        scrollWheelZoom: false
      });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiYXNhZm9zZXRoIiwiYSI6ImNqa3NjYmhjazAwNGczd254d2R2bjk2b3cifQ.KY2NrJB9uPQsWCDu8O58EQ',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}


/**
 * Update page and map for current restaurants.
 */
updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
  .then(restaurants => {
    resetRestaurants(restaurants);
    fillRestaurantsHTML();
  })
  .catch(error => console.error(error));
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  //Lazy load image to improve app performance
  const image = document.createElement('img');
  image.alt = restaurant.name+' image';
  const config = {
    threshold: 0.1
  };

  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(onchange, config);
    observer.observe(image);
  } 
  else {
    console.log('Info: intersection observer not supported');
    loadImage(image);
  }
  const loadImage = image => {
    image.className = 'restaurant-img';
    image.src = DBHelper.imageUrlForRestaurant(restaurant);
  }

  function onchange(changes, observer) {
    changes.forEach(change => {
      if (change.intersectionRatio > 0) {
        loadImage(change.target);
        observer.unobserve(change.target);
      }
      else {
        console.log('No observer...');
      }
    });
  }

  li.append(image);

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  li.append(name);

  //Create Favourite Restaurant
  const favorite = document.createElement('button');
  favorite.innerHTML = '❤';
  favorite.classList.add("fav_btn");
/*This method changes the favorite status when clicked*/
  favorite.onclick = function() {
    const isFavorite = !restaurant.is_favorite;
    DBHelper.updateFavoriteStatus(restaurant.id, isFavorite);
    restaurant.is_favorite = !restaurant.is_favorite
    changeFavElementClass(favorite, restaurant.is_favorite)
  };
  changeFavElementClass(favorite, restaurant.is_favorite)
  li.append(favorite);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement("a");
  more.setAttribute("role", "link");
  more.setAttribute("aria-label", `view details of ${restaurant.name}`);
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

//Toggle favorite
changeFavElementClass = (el, fav) => {
  if (!fav) {
    el.classList.remove('favorite_yes');
    el.classList.add('favorite_no');
    el.setAttribute('aria-label', 'mark as favorite');
  } else {
    el.classList.remove('favorite_no');
    el.classList.add('favorite_yes');
    el.setAttribute('aria-label', 'remove as favorite');
  }
}

/**
 * Add markers for current restaurants to the map.
 */
addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });
} 

//registering service worker

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js').then(function(registration) {
          // Registration was successful
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function(err) {
          // registration failed :(
          console.log('ServiceWorker registration failed: ', err);
        });
      });
    }
