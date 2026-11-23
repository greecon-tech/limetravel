(function () {
  'use strict';

  // Harta interaktive: Leaflet dhe pllakat e OpenStreetMap ngarkohen vetëm pasi vizitori klikon butonin.
  var LEAFLET_JS = '/assets/vendor/leaflet/leaflet.js';
  var LEAFLET_CSS = '/assets/vendor/leaflet/leaflet.css';
  var loading = null;

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      document.head.appendChild(css);
      var script = document.createElement('script');
      script.src = LEAFLET_JS;
      script.onload = function () {
        resolve(window.L);
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return loading;
  }

  function init(root) {
    var data;
    try {
      data = JSON.parse(root.dataset.map);
    } catch (error) {
      return;
    }
    var facade = root.querySelector('.map__facade');
    var canvas = root.querySelector('.map__canvas');
    var button = root.querySelector('[data-map-load]');
    if (!data.stops || !canvas || !button) return;

    button.addEventListener('click', function () {
      button.disabled = true;
      loadLeaflet().then(
        function (L) {
          facade.hidden = true;
          canvas.hidden = false;
          var map = L.map(canvas, { scrollWheelZoom: false, zoomControl: true });
          L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors',
          }).addTo(map);
          var points = data.stops.map(function (stop) {
            return [stop.lat, stop.lon];
          });
          if (data.line) {
            L.polyline(points, { color: '#123D2B', weight: 3, opacity: 0.85, dashArray: '2 8', lineCap: 'round' }).addTo(map);
          }
          data.stops.forEach(function (stop, index) {
            var icon = L.divIcon({
              className: 'map-pin',
              html: '<span>' + (index + 1) + '</span>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            });
            L.marker([stop.lat, stop.lon], { icon: icon, title: stop.name, keyboard: true }).addTo(map).bindTooltip(stop.name, { direction: 'top', offset: [0, -12] });
          });
          map.fitBounds(points, { padding: [36, 36], maxZoom: 11 });
          // Zmadhimi me rrotë vetëm pasi harta merr fokusin (nuk e kap lëvizjen e faqes)
          canvas.addEventListener('focus', function () { map.scrollWheelZoom.enable(); }, true);
          canvas.addEventListener('blur', function () { map.scrollWheelZoom.disable(); }, true);
        },
        function () {
          button.disabled = false;
        }
      );
    });
  }

  document.querySelectorAll('.map[data-map]').forEach(init);
})();
