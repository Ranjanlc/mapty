'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const btnSort = document.querySelector('.sort');
let userPosition;

class Workout {
  //Public field,they are not official part of js language
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    //we use it to tell prettier to ignore next line
    const months = ['January','February','March','April','May','June','July','August','September','October', 'November','December'];
    this.description = `${this.type[0].toUpperCase() + this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  } //We cant call this on workout object coz it doesnt have type variable in here

  click() {
    this.clicks++;
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
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling'; //will be same as declaring inside constructor
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    //km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed; //We dont need to return value at this point when putting it in constructor fn
  }
}

///////////////////////////
//Application Architecture
class App {
  #map;
  #mapEvent; //As we want all of our code of this program to be inside the class
  #workouts = [];
  #mapZoomLevel = 13;
  popup;

  constructor() {
    //GEt users position
    this._getPosition();
    //It is located in constructor because we want these Event Listener to be active since the beginnin
    this._renderGuideMessage;
    //Get data from local storage
    this._getLocalStorage();

    /////Rendering workout form
    //Event handlers

    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this)); // We do this so that our event listeners are initiated at the beginning
    btnSort.addEventListener('click', this._sort.bind(this));
  }
  _renderGuideMessage() {
    containerWorkouts.insertAdjacentHTML(
      'afterbegin',
      '<div class="guide--message">Tap on map to enter your workout</div>    '
    );
  }
  _sort(e) {
    document
      .querySelector('.workouts')
      .querySelectorAll('.workout')
      .forEach(list => list.remove());

    this.#workouts.sort((a, b) => {
      if (a.distance > b.distance) return 1;
      if (b.distance > a.distance) return -1;
    });
    console.log(this.#workouts);
    this.#workouts.forEach(obj => this._renderWorkout(obj));
    this._setLocalStorage();
  }
  _getPosition() {
    //current position is determined in this method and loadMap should be called with current position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this), // To prevent this keyword in loadMap becoming undefined,this keyword here represents the object thats calling whic we also want inside -loadMap
        //THis function runs because geolocation.getCurrentposition takes two fn,one executes in case of success ,other in error
        function () {
          containerWorkouts.style.opacity = 0;
          alert('Could not get your co ordinate');
        }
      );
    }
  }
  _loadMap(position) {
    // To set userposition for later uses for loading map after editing and deleting
    userPosition = position;
    const { latitude } = position.coords;
    const { longitude } = position.coords;

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on(
      'click',
      this._showForm.bind(this) //no binding coz it doesnt matter here
      //FOr forms:It is inside this event that we get acess to mapEvent,however we dont need it here
    );
    //It comes with a parameter called position parameter

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    // FOr guide message at start
    document.querySelector('.guide--message')?.remove();
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
    console.log('noe');
  }
  _hideForm() {
    inputDistance.value =
      inputCadence.value =
      inputDuration.value =
      inputElevation.value =
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
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);
    e.preventDefault();
    //Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout; //to make it available to outside

    //if  workout running,create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;

      //CHeck if data is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('inputs have to be positive numbers');
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    //if workout cycling,create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('inputs have to be positive numbers');
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    //Add new object to workout array
    this.#workouts.push(workout);
    // console.log(this.#workouts);
    //Render workout on map as marker
    this._renderWorkoutMarker(workout);
    //Render workout on list
    this._renderWorkout(workout);
    //Hide the form and clear input fields

    //Clear input fields
    this._hideForm();

    //Set local storage to all workouts
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    // console.log(workout);

    L.marker(workout.coords)
      .addTo(this.#map) //We dont need to bind coz we are calling the method from this keyword not as regular fn call and also not a callback fn
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
      .openPopup(); //L.marker creates
    // console.log(workout, this.popup);
  }
  _renderWorkout(workout) {
    let html = `
  <li class="workout workout--${workout.type}" data-id="${workout.id}">
    <h2  class="workout__title edited" >${workout.description}</h2>
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
    </div>`;
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
    <button class="edit running--outline">Edit</button>
     <button class="delete running--outline">Delete</button>
  </li>`;
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
      <span class="workout__value">${workout.elevationGain}</span>
      <span class="workout__unit">m</span>
    </div>
    <button class="edit cycling--outline">Edit</button>
    <button class="delete cycling--outline">Delete</button>
  </li>
    `;
    }
    form.insertAdjacentHTML('afterend', html);
    document
      .querySelector('.edit')
      .addEventListener('click', this._editDescritption.bind(this));
    document
      .querySelector('.delete')
      .addEventListener('click', this._deleteEl.bind(this));
  }
  //TO delete
  _deleteEl(e) {
    // console.log(this.#workouts);
    const list = e.target.closest('.workout');
    // console.log(e.target.closest('.workout').remove());
    const nice = this.#workouts.findIndex(cur => cur.id === list.dataset.id);

    this.#workouts.splice(nice, 1);
    // For transition
    list.classList.add('removed');
    list.addEventListener('transitionend', function () {
      console.log('ended');
      list.remove();
    });
    this._setLocalStorage();
    // console.log(...this.#workouts);

    if (this.#workouts.length === 0) {
      this.#map.remove();
      this._loadMap(userPosition);
      this._renderGuideMessage();
    }
    // To remove in each iteration and if there is only last obj,above code is executed coz it loads map with userPosition which we found at start.
    this.#workouts?.forEach(workout => {
      this.#map.remove();
      this._loadMap({
        coords: { latitude: workout.coords[0], longitude: workout.coords[1] },
      });
      this._renderWorkoutMarker(workout);
    });
  }

  //Edit forms' list
  _editDescritption(e) {
    const first = e.target.closest('.workout');
    const h1 = first.querySelector('.workout__title');
    console.log(first);
    if (first.classList.contains('workout--cycling')) {
      document.querySelector('.edit').style.border = 'solid orange';
    }
    if (h1.classList.contains('edited')) {
      h1.setAttribute('contenteditable', 'true');
      var setpos = document.createRange();
      // Creates object for selection
      var set = window.getSelection();

      // Set start position of range
      setpos.setStart(h1.childNodes[0], h1.textContent.length);

      // Collapse range within its boundary points
      // Returns boolean
      setpos.collapse(true);

      // Remove all ranges set
      set.removeAllRanges();

      // Add range with respect to range object.
      set.addRange(setpos);

      // Set cursor on focus
      h1.focus();
      h1.classList.remove('edited');
      h1.closest('.workout').querySelector('.edit').textContent = 'Save';
    } else {
      h1.blur();
      h1.closest('.workout').querySelector('.edit').textContent = 'Edit';
      h1.setAttribute('contenteditable', 'false');
      h1.classList.add('edited');
      // console.log(this);
      // console.log(first);
      //to find the clicked one
      const obj = this.#workouts.find(obj => obj.id === first.dataset.id);

      //to change internally in object
      obj.description = h1.textContent;
      //to save it in local storage
      this._setLocalStorage();
      console.log(obj);
      //This was to reload map without explicitly reloading whole webpage
      this.#map.remove();
      //To load map in the position of list which was edited.
      this._loadMap({
        coords: { latitude: obj.coords[0], longitude: obj.coords[1] },
      });
    }
  }
  _moveToPopup(e) {
    if (
      e.target.classList.contains('edit') ||
      e.target.classList.contains('delete')
    )
      return;
    const workoutEl = e.target.closest('.workout');
    // console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      work => workoutEl.dataset.id === work.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data.length);
    if (data.length === 0) return;
    // To remove message if data is already there.
    document.querySelector('.guide--message')?.remove();
    this.#workouts = data;
    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }
  //Public interface
  reset() {
    localStorage.removeItem('workouts'); //based on the key
    //We remove our workouts from localStorage,we can now reload the page programatically
    location.reload(); //location is a big object that contains a lotta method and properties in the broswer
    //We do it in console by app.reset()
  }
}

const app = new App(); //coz we dont need constructor fn
