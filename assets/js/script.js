'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance; //in km
    this.duration = duration; //in min
  }
  _setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }
  calcPace() {
    //min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevGain) {
    super(coords, distance, duration);
    this.elevGain = elevGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;
  constructor() {
    //Get user's position
    this._getPosition();
    //Get data from local storage
    this._getLocalStorage();
    //when submitting the form - creates and places a marker
    form.addEventListener('submit', this._newWorkout.bind(this));

    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position!');
        }
      );
    }
  }

  _loadMap(position) {
    //Taking coordinates for the current location.
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    const coords = [latitude, longitude];
    // console.log(position);
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    //Creating a map with leaflet library - rendering a map on current location
    //const map -> a leaflet object
    //1).L goes for  the entering the namespace in the API, it has some methods.
    //2). The string in the "L.map("map") - in this case "map" should be the id of an element in our html - in our case, the last div
    //3).In the setView function - first argument is an array of coordinates [latitude, longitude], the one argument in the marker method is the same array as well.
    //4). The second argument in setView - a number, which shows the zoom level - колкото е по-малко числото, толкова по-отдалечена карта.

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    //on() method - it is not JS, it is a method, which could be bound to a leaflet object; it is an eventlistener
    this.#map.on('click', this._showForm.bind(this));
    this.#workouts.forEach(el => this._renderWorkoutMarker(el));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    //showing the form when the user click on the map
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _hideForm() {
    inputDistance.value =
      inputDuration.value =
      inputElevation.value =
      inputCadence.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    e.preventDefault();
    const validatingInputs = (...inputs) =>
      inputs.every(el => Number.isFinite(el));
    const validatePositiveInputs = (...inputs) => inputs.every(el => el > 0);

    //Get data from the form
    const type = inputType.value;
    const distance = Number(inputDistance.value);
    const duration = Number(inputDuration.value);
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;
    //If activity is running - creates running object
    if (type === 'running') {
      const cadence = Number(inputCadence.value);
      //Check if data is valid
      if (
        !validatingInputs(distance, duration, cadence) ||
        !validatePositiveInputs(distance, duration, cadence)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //If activity is cycling - creates cycling object
    if (type === 'cycling') {
      const elevation = Number(inputElevation.value);
      //Check if data is valid
      if (
        !validatingInputs(distance, duration, elevation) ||
        !validatePositiveInputs(distance, duration)
      ) {
        return alert('Inputs have to be positive numbers!');
      }
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }
    //Add new object to workout array
    this.#workouts.push(workout);

    //Render workout on the map
    this._renderWorkoutMarker(workout);
    //Render workout on the list
    this._renderWorkout(workout);
    //Hide form
    //clear  input fields
    this._hideForm();
    //Set local storage to all workouts
    this._setLocalStorage();
  }
  //L.marker - it creates a marker on the map, the first argument is an array with latitude, longitude; the second argument is not mandatory - an object of options
  //addTo - add the marker to the map; the map is an argument
  //bindPopup - creates a popup and binds it o the marker
  //popup() - two optional arguments, the first is options object, the second is layer source -> the autoclose option to false - the popup will never disappear, closeOnClick: false -> when the user click, the older popup will not be closed
  _renderWorkoutMarker(workout) {
    L.marker(workout.coords, { opacity: 0.9 })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id=${workout.id}>
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>
    `;
    if (workout.type === 'running') {
      html += ` 
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.cadence}</span>
      <span class="workout__unit">spm</span>
    </div>
  </li>
    `;
    }
    if (workout.type === 'cycling') {
      html += ` 
    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed.toFixed(1)}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevGain}</span>
      <span class="workout__unit">m</span>
    </div>
  </li>
    `;
    }
    form.insertAdjacentHTML('afterend', html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) {
      return;
    }
    const workout = this.#workouts.find(el => el.id === workoutEl.dataset.id);

    //Moving the marker on the correct position of the map
    //setView() method - the first argument - the coordinates, the second argument - the zoom level, the third argument - options object.
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    //setItem() method - first argument to be the name, the second - the value to be stored, associated with the first argument -> key:value store
    //JSON.stringify() -> to convert any object in JS to a string -> the argument is the object to be converted
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    if (!data) {
      return;
    }
    this.#workouts = data;
    this.#workouts.forEach(el => {
      this._renderWorkout(el);
    });
  }
  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();
