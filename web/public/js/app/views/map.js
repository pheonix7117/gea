/*global define*/
define([
  'backbone',
  'text!./mapMarker.html',
  'app/vent',
  'oms',
  'mc',
  'util/jqr!'
], function (bb, html, vent) {
  // Template
  var template = _.template(html);

  // Maps API available as the variable `google`
  var contentMap = null;
  var iw = null;
  var markerArray = [];

  return new (bb.View.extend({
    el: '#map',
    events: {
      'click #iw-img': 'playSong'
    },
    initialize: function () {
      //this is centered on Coffeyville, KS - geographic center of US
      this.mapCenter = new google.maps.LatLng(39.8282, -98.5795);
      this.mapOptions = {
        center: this.mapCenter,
        zoom: 4,
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      //creating a GoogleMap object
      this.map = new google.maps.Map(this.el, this.mapOptions);
      //creating an OMS (Spiderfier) object
      this.oms = new OverlappingMarkerSpiderfier(this.map, {keepSpiderfied: true});
      //Creating a MarkerClusterer object
      this.mc = new MarkerClusterer(this.map, [], {gridSize: 80, maxZoom: 6});
      //initial load of markers, default is all time
      this.loadAllMarkers("");
      //creating InfoWindow object and listener for clicking on pins
      iw = new google.maps.InfoWindow();
      this.oms.addListener('click', $.proxy(function(m) {
        iw.setContent(m.desc);
        iw.open(this.map, m);
      }, this));

      //creating the MarkerImage for the default
      this.redIcon = {
        url: '/img/sprite.png',
        size: new google.maps.Size(20,34),
        origin: new google.maps.Point(100,400), 
        //for anchor, origin x+10, origin y+34
        anchor: new google.maps.Point(10,34) 
      };

      this.redIconShadow = {
        url: '/img/sprite.png',
        // The shadow image is larger in the horizontal dimension
        // while the position and offset are the same as for the main image.
        size: new google.maps.Size(37, 34),
        origin: new google.maps.Point(120,434),
        anchor: new google.maps.Point(10, 34)
      };

      this.blueIcon = {
        url: '/img/sprite.png',
        size: new google.maps.Size(20,34),
        origin: new google.maps.Point(100,434),
        anchor: new google.maps.Point(10,34)
      };

      this.blueIconShadow = {
        url: '/img/sprite.png',
        // The shadow image is larger in the horizontal dimension
        // while the position and offset are the same as for the main image.
        size: new google.maps.Size(37, 34),
        origin: new google.maps.Point(120,434),
        anchor: new google.maps.Point(10, 34)
      };

      this.oms.addListener('spiderfy', $.proxy(function(markers) {
        for(var i = 0; i < markers.length; i ++) {
          markers[i].setIcon(this.blueIcon);
          markers[i].setShadow(this.blueIconShadow);
        } 
        iw.close();
      }, this));

      this.oms.addListener('unspiderfy', $.proxy(function(markers) {
        for(var i = 0; i < markers.length; i ++) {
          markers[i].setIcon(this.redIcon);
          markers[i].setShadow(this.redIconShadow);
        } 
        iw.close();
      }, this)); 

      vent.on('mapFilter', $.proxy(function (hours) {
        this.clearMarkers();
        this.loadAllMarkers(hours);
      }, this));
    },

    loadAllMarkers: function (hours) {
      var timePeriod = (hours) ? "&pastHours=" + hours : "";
      $.get('/rate?limit=10' + timePeriod, $.proxy(function (data) {
        for (var position in data) {
          var rank = 1;
          data[position].reverse().forEach($.proxy(function (d) {
            var split = position.split(",");
            var latLng = new google.maps.LatLng(split[0], split[1]);
            this.addNewMarker(latLng, d.title, d.artist, d.album, d.image, d.score, d.rdioId, rank);
            rank++;
          }, this));
        }
      }, this));
    },

    addNewMarker: function (position, song, artist, album, image, score, key, rank) {
      var marker = new google.maps.Marker({
        position: position,
        map: this.map,
        title: "#" + rank + ". " + song,
        desc: template({
          image: image,
          song: song,
          album: album,
          artist: artist,
          score: score,
          key: key
        })
      });
      this.oms.addMarker(marker);
      this.mc.addMarker(marker);
      markerArray.push(marker);
    },

    clearMarkers: function () {
      if (iw) {
        iw.close();
      }
      if (markerArray) {
        for (i=0; i < markerArray.length; i++) {
            markerArray[i].setMap(null);
        }
        markerArray.length = 0;
      }
      this.oms.unspiderfy();
      this.oms.clearMarkers();
      this.mc.clearMarkers();
    },

    playSong: function () {
      vent.trigger('play-key', this.$('#iw-key').val());
    }
  }))();
});
