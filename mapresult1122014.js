var map;
var overlay;
var clickedPixel;
var markerArray = [];
var menuMap = "<a onclick='javascript:showAll();'><div class='context' style='cursor:pointer;'>&nbsp;&nbsp;Show All&nbsp;&nbsp;</div></a>" + "<a onclick='javascript:zoomIn();'><div class='context' style='cursor:pointer;'>&nbsp;&nbsp;Zoom In&nbsp;&nbsp;</div></a>" + "<a onclick='javascript:zoomOut();'><div class='context' style='cursor:pointer;'>&nbsp;&nbsp;Zoom Out&nbsp;&nbsp;</div></a>";
var contextmenuDir = document.createElement("div");
var infowindow = new google.maps.InfoWindow;
// Variables for Loading Loop
var init = 0;
var markers;
contextmenuDir.className = 'contextmenu';
/**
 * Gets canvas location
 * @method getCanvasXY
 * @param {} caurrentLatLng
 * @return caurrentLatLngOffset
 */
function getCanvasXY(caurrentLatLng) {
    var scale = Math.pow(2, map.getZoom());
    var nw = new google.maps.LatLng(
        map.getBounds().getNorthEast().lat(),
        map.getBounds().getSouthWest().lng()
    );
    var worldCoordinateNW = map.getProjection().fromLatLngToPoint(nw);
    var worldCoordinate = map.getProjection().fromLatLngToPoint(caurrentLatLng);
    var caurrentLatLngOffset = new google.maps.Point(
        Math.floor((worldCoordinate.x - worldCoordinateNW.x) * scale),
        Math.floor((worldCoordinate.y - worldCoordinateNW.y) * scale)
    );
    return caurrentLatLngOffset;
}

/**
 * Sets context menu's position
 * @method setMenuXY
 * @param {} caurrentLatLng
 * @return
 */
function setMenuXY(caurrentLatLng) {
    var mapWidth = $('#map').width();
    var mapHeight = $('#map').height();
    var menuWidth = $('.contextmenu').width();
    var menuHeight = $('.contextmenu').height();
    var clickedPosition = getCanvasXY(caurrentLatLng);
    var x = clickedPosition.x;
    var y = clickedPosition.y;

    if ((mapWidth - x) < menuWidth)
        x = x - menuWidth;
    if ((mapHeight - y) < menuHeight)
        y = y - menuHeight;

    $('.contextmenu').css('left', x);
    $('.contextmenu').css('top', y);
};
/**
 * Zoom In
 * @method zoomIn
 * @return
 */
function zoomIn() {
    map.setCenter(clickedPixel);
    map.setZoom(map.getZoom() + 1);
    $('.contextmenu').remove();
}

/**
 * Zoom Out
 * @method zoomOut
 * @return
 */
function zoomOut() {
    map.setCenter(clickedPixel);
    map.setZoom(map.getZoom() - 1);
    $('.contextmenu').remove();
}

/**
 * Shows context menu
 * @method showContextMenu
 * @param {} caurrentLatLng
 * @return
 */
function showContextMenu(caurrentLatLng) {
    var projection;
    projection = map.getProjection();
    $('.contextmenu').remove();

    contextmenuDir.innerHTML = menuMap;
    $(map.getDiv()).append(contextmenuDir);

    setMenuXY(caurrentLatLng);

    contextmenuDir.style.visibility = "visible";
}

function getMarkers() {
    $.ajax({
        url: '%bind(:1)',
        type: 'GET',
        dataType: "xml"
    })
        .done(function(result) {
            var xmlDoc = result;
            markers = xmlDoc.documentElement.getElementsByTagName("marker");
            window.setTimeout(loadMarkers, 1);
        });
}

function loadMarkers() {
    if (init < markers.length) {
        var max = Math.min(init + 10, markers.length);
        while (init < max) {
            var lat = parseFloat(markers[init].getAttribute("lat"));
            var lng = parseFloat(markers[init].getAttribute("lng"));
            var point = new google.maps.LatLng(lat, lng);
            var html = markers[init].getAttribute("html");
            var propType = markers[init].getAttribute("propType");

            switch (propType) {
                case '1':
                    markerColor = "Red";
                    break;
                case '2':
                    markerColor = "Yellow";
                    break;
                case '3':
                    markerColor = "Green";
                    break;
                case '4':
                    markerColor = "White";
                    break;
                default:
                    markerColor = "Red";
            }
            var marker = createMarker(point, html, init + 1, markerColor);
            markerArray.push(marker);
            if (init == 0) {
                map.setCenter(marker.position, 13);
            }
            $("#results").append("<li onclick='selectMarker(" + init + ")'>" + html.substring(html.indexOf(">", html.indexOf(">", html.indexOf(">") + 1) + 1) + 1, html.indexOf("</a>") - 4) + "</li>");
            init = init + 1;
            $("#load").css({
                'display': 'block'
            });
            $("#load").html("<b>Loading " + init + " of " + (markers.length) + "</b>");
        }
        if (init % 50 == 0) {
            showAll();
        }
        window.setTimeout(loadMarkers, 1);
    }
    if (init >= markers.length) {
        showAll();
        //map.savePosition();
        $("#load").css({
            'display': 'none'
        });
    }
}

// A function to create the marker and set up the event window
function createMarker(point, html, n, markerColor) {
    var image;
    if (n < 301) {
        image = "https://uscdcmix26/ReportPreview/" + markerColor + "Icons/marker" + n + ".png";
    } else {
        image = "https://uscdcmix26/ReportPreview/" + markerColor + "Icons/blank.png";
    }

    var newMarker = new google.maps.Marker({
        position: point,
        map: map,
        icon: image
    });
    google.maps.event.addListener(newMarker, 'click', function() {
        infowindow.setContent("<div style='font-style:normal;font-family:Arial, sans-serif; font-size:9pt;font-weight:normal;margin-bottom:5px;'>Pin " + n + "</div>" + html);
        infowindow.open(map, newMarker);
    });
    return newMarker;
}

function selectMarker(markerNum) {
    map.setZoom(13);
    if ($("#sidebar").css('display') != 'none') {
        map.setZoom(17);
        map.setCenter(markerArray[markerNum].position);
        //map.setCenter(map.fromContainerPixelToLatLng(new GPoint(520, 180)));
    } else {
        map.panTo(markerArray[markerNum].position);
    }
    google.maps.event.trigger(markerArray[markerNum], "click");
}

/**
 * Centers map to display all shapes
 * @method showAll
 * @return
 */
function showAll() {
    var oBounds = new google.maps.LatLngBounds();
    if (markerArray.length > 0) {
        for (var i = 0; i < markerArray.length; i++) {
            oBounds.extend(markerArray[i].position);
        }
        map.fitBounds(oBounds);
    }
    $('.contextmenu').remove();
}


function showSidebar() {
    $("#showSidebarControl").css({
        "display": "none"
    });
    $("#sidebar").css({
        "display": "block"
    });
    $("#hideSidebarControl").css({
        "display": "block"
    });
    /*
        map.removeControl(mapTypeControl);
        mapTypeControl = new GMapTypeControl();
        map.addControl(mapTypeControl, new GControlPosition(G_ANCHOR_TOP_RIGHT, new GSize(310,10)));
        map.setCenter(map.fromContainerPixelToLatLng(new GPoint(520,238)));*/
    var coordinates = overlay.getProjection().fromContainerPixelToLatLng(
        new google.maps.Point(520, 238)
    );
    map.setCenter(coordinates);
}

function hideSidebar() {
    $("#showSidebarControl").css({
        "display": "block"
    });
    $("#sidebar").css({
        "display": "none"
    });
    $("#hideSidebarControl").css({
        "display": "none"
    });
    /*
        map.removeControl(mapTypeControl);
        mapTypeControl = new GMapTypeControl();
        map.addControl(mapTypeControl);        
        map.setCenter(map.fromContainerPixelToLatLng(new GPoint(240,238)));
        */
    var coordinates = overlay.getProjection().fromContainerPixelToLatLng(
        new google.maps.Point(240, 238)
    );
    map.setCenter(coordinates);
}

function initialize() {
    var mapOptions = {
        center: new google.maps.LatLng(34, -118),
        zoom: 13
    };
    map = new google.maps.Map(document.getElementById("map"),
        mapOptions);
    overlay = new google.maps.OverlayView();
    overlay.draw = function() {};
    overlay.setMap(map);
    google.maps.event.addListener(map, "rightclick", function(event) {
        clickedPixel = event.latLng;
        showContextMenu(event.latLng);
    });
    google.maps.event.addListener(map, 'click', function(event) {
        if (event.latLng) {
            $('.contextmenu').remove();
        };
    });
    if (markers == undefined) {
        getMarkers();
    }
}

google.maps.event.addDomListener(window, 'load', initialize);