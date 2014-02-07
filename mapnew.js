var map;
var geocoder;
var shapes = [];
var selectedShape = 0;
var polyMarkers = [];
var polyShapes = [];
var polygons = [];
var selectedMarker;
var sType = "Properties";
var session = null;
var source = null;
var clickedPixel;
var contextmenuDir;

var menuMap = '<a onclick="javascript:showAll();"><div class="context">&nbsp;&nbsp;Show All Boundaries&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:zoomIn();"><div class="context">&nbsp;&nbsp;Zoom In&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:zoomOut();"><div class="context">&nbsp;&nbsp;Zoom Out&nbsp;&nbsp;</div></a>';
var menuNewCircle = '<a onclick="javascript:addShape(1);"><div class="context">&nbsp;&nbsp;New Circle (Radius = 1)&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:addShape(2);"><div class="context">&nbsp;&nbsp;New Circle (Radius = 3)&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:addShape(3);"><div class="context">&nbsp;&nbsp;New Circle (Radius = 5)&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:radiusPrompt();"><div class="context">&nbsp;&nbsp;Custom Radius&nbsp;&nbsp;</div></a>';
var menuNewPolygon = '<a onclick="javascript:addShape(0);"><div class="context">&nbsp;&nbsp;New Polygon&nbsp;&nbsp;</div></a>';
var menuCircle = '<a onclick="javascript:drawCircle(1);getCount();"><div class="context">&nbsp;&nbsp;Radius = 1&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:drawCircle(3);getCount();"><div class="context">&nbsp;&nbsp;Radius = 3&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:drawCircle(5);getCount();"><div class="context">&nbsp;&nbsp;Radius = 5&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:radiusPrompt();"><div class="context">&nbsp;&nbsp;Custom Radius&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:removeShape();"><div class="context">&nbsp;&nbsp;Remove Circle&nbsp;&nbsp;</div></a>';
var menuPolygon = '<a onclick="javascript:deleteLastPoint();"><div class="context">&nbsp;&nbsp;Remove Last Point&nbsp;&nbsp;</div></a>' + '<a onclick="javascript:removeShape();"><div class="context">&nbsp;&nbsp;Remove Polygon&nbsp;&nbsp;</div></a>';
var menuMarker = '<a onclick="javascript:deleteSelectedPoint();"><div class="context">&nbsp;&nbsp;Remove Selected Point&nbsp;&nbsp;</div></a>';

var fillColor = "#0000FF"; // blue fill
var lineColor = "#000000"; // black line
var opacity = .35;
var lineWeight = 2;

var ae_cb = null;

contextmenuDir = document.createElement("div");
contextmenuDir.className = 'contextmenu';

/**
 * JavaScript Prompt
 * @method ae$
 * @param {} a
 * @return CallExpression
 */
function ae$(a) {
    return document.getElementById(a);
}

/**
 * JavaScript Prompt
 * @method ae_prompt
 * @param {} cb
 * @param {} q
 * @param {} a
 * @param {} t
 * @return
 */
function ae_prompt(cb, q, a, t) {
    ae_cb = cb;
    ae$('aep_t').innerHTML = t;
    ae$('aep_prompt').innerHTML = q;
    ae$('aep_text').value = a;
    ae$('aep_ovrl').style.display = ae$('aep_ww').style.display = '';
    ae$('aep_text').focus();
    ae$('aep_text').select();
}

/**
 * JavaScript Prompt
 * @method ae_clk
 * @param {} m
 * @return
 */
function ae_clk(m) {
    ae$('aep_ovrl').style.display = ae$('aep_ww').style.display = 'none';
    if (!m) {
        ae_cb(null); // user pressed cancel, call callback with null
        $('.contextmenu').remove();
    } else
        ae_cb(ae$('aep_text').value); // user pressed OK 
}

/**
 * Prompt for Radius
 * @method radiusPrompt
 * @return
 */
function radiusPrompt() {
    $('.contextmenu').remove();
    ae_prompt(customRadius, "Enter Radius Desired (.01-1000 mi):", shapes[selectedShape].radius, "");
}

/**
 * Sets custom radius of circle
 * @method customRadius
 * @param {} r
 * @return
 */
function customRadius(r) {
    if (r != null) {
        if (isNaN(r)) {
            ae_prompt(customRadius, "Enter Radius Desired (.01-1000 mi):", shapes[selectedShape].radius, "Invalid Radius - Please enter a number");
        } else if (r > 0 && r <= 1000) {
            setCurrentRadius(r);
            mapClick(clickedPixel);
            getCount();
        } else {
            ae_prompt(customRadius, "Enter Radius Desired (.01-1000 mi):", shapes[selectedShape].radius, "Radius out of range - Please enter a radius from .01 to 1000mi");
        }
    }
}

/**
 * Shape constructor
 * @method shapeDesc
 * @param {} type
 * @param {} radius
 * @return
 */
function shapeDesc(type, radius) {
    this.type = type;
    this.radius = radius;
}

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
    if ($('#newCircleBtn').prop('disabled')) {
        contextmenuDir.innerHTML = menuNewCircle;
    }
    if ($('#newPolygonBtn').prop('disabled')) {
        contextmenuDir.innerHTML = menuNewPolygon;
    }

    $(map.getDiv()).append(contextmenuDir);

    setMenuXY(caurrentLatLng);

    contextmenuDir.style.visibility = "visible";
}

/**
 * Converts degress to radians
 * @method toRad
 * @return BinaryExpression
 */
Number.prototype.toRad = function() {
    return this * Math.PI / 180;
}

/**
 * Converts radians to degrees
 * @method toDeg
 * @return BinaryExpression
 */
Number.prototype.toDeg = function() {
    return this * 180 / Math.PI;
}

/**
 * Gets a point of map with specified angle and distance
 * @method destinationPoint
 * @param {} brng
 * @param {} dist
 * @return NewExpression
 */
google.maps.LatLng.prototype.destinationPoint = function(brng, dist) {
    dist = dist / 3959;
    brng = brng.toRad();

    var lat1 = this.lat().toRad(),
        lon1 = this.lng().toRad();

    var lat2 = Math.asin(Math.sin(lat1) * Math.cos(dist) +
        Math.cos(lat1) * Math.sin(dist) * Math.cos(brng));

    var lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(dist) *
        Math.cos(lat1),
        Math.cos(dist) - Math.sin(lat1) *
        Math.sin(lat2));

    if (isNaN(lat2) || isNaN(lon2)) return null;

    return new google.maps.LatLng(lat2.toDeg(), lon2.toDeg());
}

/**
 * Centers map to display all shapes
 * @method showAll
 * @return
 */
function showAll() {
    var oBounds = new google.maps.LatLngBounds();
    if (polyMarkers.length > 0) {
        for (var i = 0; i < polyMarkers.length; i++) {
            if (shapes[i].type == "Circle") {
                oBounds.extend(polyMarkers[i][0].position.destinationPoint(0, shapes[i].radius));
                oBounds.extend(polyMarkers[i][0].position.destinationPoint(90, shapes[i].radius));
                oBounds.extend(polyMarkers[i][0].position.destinationPoint(180, shapes[i].radius));
                oBounds.extend(polyMarkers[i][0].position.destinationPoint(270, shapes[i].radius));
            } else {
                for (var j = 0; j < polyMarkers[i].length; j++) {
                    oBounds.extend(polyMarkers[i][j].position);
                }
            }
        }
        map.fitBounds(oBounds);
    }
    $('.contextmenu').remove();
}

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
 * Process Shapes added from Context Menu
 * @method addShape
 * @param {} kind
 * @return
 */
function addShape(kind) {
    switch (kind) {
        case 0:
            $('.contextmenu').remove();
            mapClick(clickedPixel);
            break;
        case 1:
            $('.contextmenu').remove();
            setCurrentRadius(1);
            mapClick(clickedPixel);
            break;
        case 2:
            $('.contextmenu').remove();
            setCurrentRadius(3);
            mapClick(clickedPixel);
            break;
        case 3:
            $('.contextmenu').remove();
            setCurrentRadius(5);
            mapClick(clickedPixel);
            break;
        case 4:
            $('.contextmenu').remove();
            ae_prompt(customRadius, "Enter Radius Desired (.01-1000 mi):", "1", "");
            mapClick(clickedPixel);
            break;
    }
}

/**
 * Sets radius of current shape and updates the shape list
 * @method setCurrentRadius
 * @param {} r
 * @return
 */
function setCurrentRadius(r) {
    shapes[selectedShape].radius = r;
    $("#shapelabel" + selectedShape).html("&nbsp; " + (selectedShape + 1) + " - Circle (" + r + ")");
}

/**
 * Initializes map
 * @method initialize
 * @return
 */
function initialize() {
    var mapOptions = {
        center: new google.maps.LatLng(34, -118),
        zoom: 13
    };
    map = new google.maps.Map(document.getElementById("map"),
        mapOptions);
    google.maps.event.addListener(map, 'rightclick', function(event) {
        clickedPixel = event.latLng;
        showContextMenu(event.latLng);
    });

    google.maps.event.addListener(map, 'click', function(event) {
        if (event.latLng) {
            $('.contextmenu').remove();
            mapClick(event.latLng);
        };
    });
    // Load Shapes passed in as parameters in the query string
    // skip the first character, we are not interested in the "?"
    var query = location.search.substring(1);
    var lat;
    var lon;

    // split the rest at each "&" character to give a list of  "argname=value"  pairs
    var pairs = query.split("&");
    for (var j = 0; j < pairs.length; j++) {
        // break each pair at the first "=" to obtain the argname and value
        var pos = pairs[j].indexOf("=");
        var argname = pairs[j].substring(0, pos).toLowerCase();
        var value = pairs[j].substring(pos + 1).toLowerCase();

        // process each possible argname
        if (argname == "lat") {
            lat = parseFloat(value);
        }
        if (argname == "lon") {
            lon = parseFloat(value);
        }
        if (argname == "zoom") {
            map.setZoom(parseInt(value));
        }
        if (argname == "circle") {
            var circleParams = value.split(",");
            var delimiter = circleParams[1].indexOf("^");
            var centerPoint = new google.maps.LatLng(parseFloat(circleParams[1].substring(0, delimiter)), parseFloat(circleParams[0]));
            newShape("Circle");
            shapes[selectedShape].radius = parseFloat(circleParams[1].substring(delimiter + 1));
            mapClick(centerPoint);
        }
        if (argname == "poly") {
            var polygonParams = value.substring(1, value.length - 1).split(",");
            newShape("Polygon");
            for (var p = 0; p < polygonParams.length - 2; p = p + 2) {
                var nextPoint = new google.maps.LatLng(parseFloat(polygonParams[p + 1]), parseFloat(polygonParams[p]));
                mapClick(nextPoint);
            }
        }
        if (argname == "stype") {
            switch (parseInt(value)) {
                case 1:
                    sType = "Properties";
                    break;
                case 2:
                    sType = "Tenants";
                    break;
                case 3:
                    sType = "Transactions";
                    break;
                case 4:
                    sType = "Properties";
                    break;
            }
        }
        if (argname == "session") {
            session = value;
        }
        if (argname == "source") {
            source = value;
        }
    }
    if (lat != undefined && lon != undefined) {
        point = new google.maps.LatLng(lat, lon);
        map.setCenter(point);
    }
    showAll();
    getCount();
}

/**
 * Redraws polygon
 * @method redrawPolygon
 * @return
 */
function redrawPolygon() {
    if (polygons[selectedShape]) {
        polygons[selectedShape].setMap(null)
    };
    if (polyShapes[selectedShape].length > 0) {
        polygons[selectedShape] = new google.maps.Polygon({
            paths: polyShapes[selectedShape],
            strokeColor: lineColor,
            strokeWeight: lineWeight,
            strokeOpacity: opacity,
            fillColor: fillColor,
            fillOpacity: opacity,
            indexID: selectedShape
        });
        polygons[selectedShape].setMap(map);
        google.maps.event.addListener(polygons[selectedShape], 'rightclick', function(event) {
            $('.contextmenu').remove();
            updateSelected(this.indexID);
            $("#radio" + this.indexID).prop("checked", true);
            contextmenuDir = document.createElement("div");
            contextmenuDir.className = 'contextmenu';
            contextmenuDir.innerHTML = menuPolygon;
            $(map.getDiv()).append(contextmenuDir);
            setMenuXY(event.latLng);
            contextmenuDir.style.visibility = "visible";
        });
        google.maps.event.addListener(polygons[selectedShape], 'click', function(event) {
            $('.contextmenu').remove();
            updateSelected(this.indexID);
            $("#radio" + this.indexID).prop("checked", true);
        });
    } else {
        removeShape();
    }
}

/**
 * Drags Marker
 * @method dragMarker
 * @return
 */
function dragMarker() {
    // Populate polyShapes with Marker Points
    polyShapes[selectedShape].length = 0;
    for (var i = 0; i < polyMarkers[selectedShape].length; i++) {
        polyShapes[selectedShape].push(polyMarkers[selectedShape][i].position);
    }
    redrawPolygon();
}

/**
 * Adds Marker
 * @method drawCoordinates
 * @return
 */
function drawCoordinates() {
    /* Add Marker */
    if (polyShapes[selectedShape].length > 0) {
        var lastMarker = polyMarkers[selectedShape].length;
        polyMarkers[selectedShape].push(new google.maps.Marker({
            position: polyShapes[selectedShape][polyShapes[selectedShape].length - 1],
            draggable: true,
            map: map,
            indexID: polyShapes[selectedShape].length - 1
        }));
        google.maps.event.addListener(polyMarkers[selectedShape][lastMarker], 'drag', function() {
            dragMarker();
        });
        google.maps.event.addListener(polyMarkers[selectedShape][lastMarker], 'dragend', function() {
            getCount();
        });
        google.maps.event.addListener(polyMarkers[selectedShape][lastMarker], 'rightclick', function(event) {
            $('.contextmenu').remove();
            contextmenuDir = document.createElement("div");
            contextmenuDir.className = 'contextmenu';
            contextmenuDir.innerHTML = menuMarker;
            $(map.getDiv()).append(contextmenuDir);
            setMenuXY(event.latLng);
            contextmenuDir.style.visibility = "visible";
            selectedMarker = polyMarkers[selectedShape][this.indexID];
        });
    }
    redrawPolygon();
    getCount();
}

/**
 * Draw A Circle with specified Radius
 * @method drawCircle
 * @param {} radius
 * @return
 */
function drawCircle(radius) {
    $('.contextmenu').remove();
    if (polygons[selectedShape]) {
        polygons[selectedShape].setMap(null);
    }
    shapes[selectedShape].radius = radius;
    radiusInMetres = radius * 1609.34;
    var circleOptions = {
        strokeColor: lineColor,
        strokeOpacity: opacity,
        strokeWeight: 2,
        fillColor: fillColor,
        fillOpacity: opacity,
        map: map,
        center: polyMarkers[selectedShape][0].position,
        radius: radiusInMetres,
        indexID: selectedShape
    };
    polygons[selectedShape] = new google.maps.Circle(circleOptions);
    google.maps.event.addListener(polygons[selectedShape], 'rightclick', function(event) {
        $('.contextmenu').remove();
        updateSelected(this.indexID);
        $("#radio" + this.indexID).prop("checked", true);
        contextmenuDir = document.createElement("div");
        contextmenuDir.className = 'contextmenu';
        contextmenuDir.innerHTML = menuCircle;
        $(map.getDiv()).append(contextmenuDir);
        setMenuXY(event.latLng);
        contextmenuDir.style.visibility = "visible";
    });
    google.maps.event.addListener(polygons[selectedShape], 'click', function(event) {
        $('.contextmenu').remove();
        updateSelected(this.indexID);
        $("#radio" + this.indexID).prop("checked", true);
    });
    polygons[selectedShape].bindTo('center', polyMarkers[selectedShape][0], 'position');
    $("#shapelabel" + selectedShape).html("&nbsp; " + (selectedShape + 1) + " - Circle (" + radius + ")");
}

/**
 * Handle map click event
 * @method mapClick
 * @param {} clickedPoint
 * @return
 */
function mapClick(clickedPoint) {
    if (polyShapes[selectedShape]) {
        if (shapes[selectedShape].type == "Polygon") {
            polyShapes[selectedShape].push(clickedPoint);
            drawCoordinates();
            $("#newPolygonBtn").prop("disabled", false);
        } else if (shapes[selectedShape].type == "Circle") {
            if (polyShapes[selectedShape].length == 0) {
                polyShapes[selectedShape].push(clickedPoint);
                polyMarkers[selectedShape].push(new google.maps.Marker({
                    position: polyShapes[selectedShape][0],
                    draggable: true,
                    map: map
                }));
            }
            if (shapes[selectedShape].radius == 0) {
                shapes[selectedShape].radius = 1;
            }
            google.maps.event.addListener(polyMarkers[selectedShape][0], 'dragend', function() {
                polyShapes[selectedShape][0] = polyMarkers[selectedShape][0].position;
                getCount();
            });
            drawCircle(shapes[selectedShape].radius);
            getCount();
            $("#newCircleBtn").prop("disabled", false);
        }
    }
}

/**
 * Adds new shape to map
 * @method newShape
 * @param {} shapeType
 * @return
 */
function newShape(shapeType) {
    var newShape = [];
    var newMarkers = [];
    if (shapes.length < 7) {
        /* Hide Previous Markers */
        if (polyShapes.length > 0) {
            for (var i = 0; i < polyShapes[selectedShape].length; i++) {
                polyMarkers[selectedShape][i].setMap(null);
            }
        }
        selectedShape = polyShapes.length;
        shapes[selectedShape] = new shapeDesc(shapeType, 0);
        polyShapes.push(newShape);
        polyMarkers.push(newMarkers);
        if (shapeType == "Circle") {
            newCircleBtn();
        } else if (shapeType == "Polygon") {
            newPolygonBtn();
        }
    } else {
        alert("The maximum number of User Defined Shapes is 7");
    }
}

/**
 * Remove Selected Shape
 * @method removeShape
 * @return
 */
function removeShape() {
    $('.contextmenu').remove();
    for (var i = 0; i < polyMarkers[selectedShape].length; i++) {
        polyMarkers[selectedShape][i].setMap(null);
    }
    polygons[selectedShape].setMap(null);
    for (var k = selectedShape; k < polygons.length; k++) {
        polygons[k].indexID = polygons[k].indexID - 1;
    }
    polyMarkers.splice(selectedShape, 1);
    polyShapes.splice(selectedShape, 1);
    polygons.splice(selectedShape, 1);
    shapes.splice(selectedShape, 1);
    selectedShape = 0;
    if (polyShapes[0]) {
        updateSelected(0);
    }
    // Recreate Radio Button List
    $("#shapeList").html("");
    if (shapes.length > 0) {
        for (var j = 0; j < shapes.length; j++) {
            if (shapes[j].type == "Polygon") {
                $("#shapeList").html($("#shapeList").html() + "<input type='radio' id='radio" + j + "' name='shapes' value='" + j + "' onclick='updateSelected(" + j + ");'><label for='radio" + j + "'>&nbsp;" + (j + 1) + " - " + shapes[j].type + "</label><br>");
            } else if (shapes[j].type == "Circle") {
                $("#shapeList").html($("#shapeList").html() + "<input type='radio' id='radio" + j + "' name='shapes' value='" + j + "' onclick='updateSelected(" + j + ");'><label for='radio" + j + "'>&nbsp;" + (j + 1) + " - " + shapes[j].type + " - (" + shapes[j].radius + ")</label><br>");
            }
        }
        $("#radio" + 0).prop("checked", true);
    } else
        $("#shapeList").html("No Boundaries Defined");
    getCount();
}

/**
 * Remove Selected Point from Polygon
 * @method deleteSelectedPoint
 * @return
 */
function deleteSelectedPoint() {
    $('.contextmenu').remove();
    if (polyShapes.length > 0 && selectedMarker) {
        if (polyShapes[selectedShape].length > 0) {
            var l = polyMarkers[selectedShape].length;
            for (var i = 0; i < l; i++) {
                if (polyMarkers[selectedShape][i] == selectedMarker) {
                    polyMarkers[selectedShape][i].setMap(null);
                    for (var k = i; k < polyMarkers[selectedShape].length; k++) {
                        polyMarkers[selectedShape][k].indexID = polyMarkers[selectedShape][k].indexID - 1;
                    }
                    polyMarkers[selectedShape].splice(i, 1);
                    polyShapes[selectedShape].splice(i, 1);
                    redrawPolygon();
                    getCount();
                }
            }
        }
    } else
        $("#shapeList").html("No Boundaries Defined");
}

/**
 * Remove Last Created Point from Polygon
 * @method deleteLastPoint
 * @return
 */
function deleteLastPoint() {
    $('.contextmenu').remove();
    if (polyShapes.length > 0) {
        if (polyShapes[selectedShape].length > 0) {
            polyMarkers[selectedShape][polyMarkers[selectedShape].length - 1].setMap(null);
            polyMarkers[selectedShape].pop();
            polyShapes[selectedShape].pop();
            redrawPolygon();
            getCount();
        }
    } else
        $("#shapeList").html("No Boundaries Defined");
    getCount();

}

/**
 * Get bounds of polygon
 * @method getBounds
 * @return bounds
 */
google.maps.Polygon.prototype.getBounds = function() {
    var bounds = new google.maps.LatLngBounds();
    var paths = this.getPaths();
    var path;
    for (var i = 0; i < paths.getLength(); i++) {
        path = paths.getAt(i);
        for (var ii = 0; ii < path.getLength(); ii++) {
            bounds.extend(path.getAt(ii));
        }
    }
    return bounds;
}

/**
 * Update the Selected Shape
 * @method updateSelected
 * @param {} selectedValue
 * @return
 */
function updateSelected(selectedValue) {
    /* Hide Previous Markers */
    if (polyShapes[selectedShape]) {
        for (var i = 0; i < polyShapes[selectedShape].length; i++) {
            polyMarkers[selectedShape][i].setMap(null);
        }
    }

    /* Update Selected Shape */
    selectedShape = selectedValue;

    /* Show Select Shape Markers */
    if (polyShapes[selectedShape]) {
        for (var i = 0; i < polyShapes[selectedShape].length; i++) {
            polyMarkers[selectedShape][i].setMap(map);
        }
    }
    /* Commented as causing problem with right click
    if (polygons[selectedShape]) {
        map.panTo(polygons[selectedShape].getBounds().getCenter());
    } */
}

/**
 * Create a new Polygon Radio Button
 * @method newPolygonBtn
 * @return
 */
function newPolygonBtn() {
    /* Add Radio Button for New Polygon */
    if ($("#shapeList").html() == "No Boundaries Defined") {
        $("#shapeList").html("");
    }
    $("#shapeList").html($("#shapeList").html() + "<input type='radio' id='radio" + selectedShape + "' name='shapes' value='" + selectedShape + "' onclick='updateSelected(" + selectedShape + ");'><label for='radio" + selectedShape + "'>&nbsp; " + (selectedShape + 1) + " - Polygon</label><br>");
    $("#radio" + selectedShape).prop("checked", true);
    $("#newPolygonBtn").prop("disabled", true);
}

/**
 * Create a new Circle Radio Button
 * @method newCircleBtn
 * @return
 */
function newCircleBtn() {
    if ($("#shapeList").html() == "No Boundaries Defined") {
        $("#shapeList").html("");
    }
    $("#shapeList").html($("#shapeList").html() + "<input type='radio' id='radio" + selectedShape + "' name='shapes' value='" + selectedShape + "' onclick='updateSelected(" + selectedShape + ");'><label id='shapelabel" + selectedShape + "' for='radio" + selectedShape + "'>&nbsp; " + (selectedShape + 1) + " - Circle (1)</label><br>");
    $("#radio" + selectedShape).prop("checked", true);
    $('#newCircleBtn').prop("disabled", true);
}

/**
 * Clears all overlays from map
 * @method clearMap
 * @return
 */
function clearMap() {
    for (var i = 0; i < polyShapes.length; i++) {
        for (var j = 0; j < polyShapes[i].length; j++) {
            polyMarkers[i][j].setMap(null);
        }
    }
    for (var i = 0; i < polygons.length; i++) {
        polygons[i].setMap(null);
    }
    polyShapes.length = 0;
    polyMarkers.length = 0;
    shapes.length = 0;
    selectedShape = 0;
    polygons.length = 0;
    $("#results").html("");
    $("#results").css({
        display: 'none'
    });
    $("#shapeList").html("No Boundaries Defined");
    $("#newCircleBtn").prop("disabled", false);
    $("#newPolygonBtn").prop("disabled", false);
}

/**
 * Pass Parameters in Query String
 * @method returnToSearch
 * @param {} status
 * @return
 */
function returnToSearch(status) {
    var url = "%BIND(:1)EMPLOYEE/MIX/c/CBRE_PROPERTY.CBRE_PROP_LIST.GBL?Page=CBRE_PROP_LIST_STD";
    var params = "";
    var loadSearchType = "Y"
    if (polyShapes[selectedShape]) {
        for (var i = 0; i < (polyShapes.length); i++) {
            if (shapes[i].type == "Polygon" && polyShapes[i].length > 0) {
                if (params.length == 0) {
                    params = "poly=(";
                } else {
                    params += "&poly=(";
                }
                for (var j = 0; j < (polyShapes[i].length); j++) {
                    params += Math.round(polyShapes[i][j].lng() * 1000000) / 1000000 + "," + Math.round(polyShapes[i][j].lat() * 1000000) / 1000000 + ",";
                }
                params += Math.round(polyShapes[i][0].lng() * 1000000) / 1000000 + "," + Math.round(polyShapes[i][0].lat() * 1000000) / 1000000 + ")";
            } else if (shapes[i].type == "Circle" && polyShapes[i].length > 0) {
                if (params.length == 0) {
                    params = "circle=";
                } else {
                    params += "&circle=";
                }
                params += Math.round(polyShapes[i][0].lng() * 1000000) / 1000000 + "," + Math.round(polyShapes[i][0].lat() * 1000000) / 1000000 + "^" + shapes[i].radius;
            }
        }
    }
    if (source == "map") {
        loadSearchType = "MapReturn";
    }
    window.location.href = url + "&status=" + status + "&" + params + "&ls=" + loadSearchType + "&session=" + session;
}

/**
 * Centers map on searched address
 * @method centerOnAddress
 * @return
 */
function centerOnAddress() {
    var address = $("#Address").val();
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({
        'address': address
    }, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) {
            map.setCenter(results[0].geometry.location);
            newShape('Circle');
            shapes[selectedShape].radius = .0568;
            mapClick(results[0].geometry.location);
        } else {
            alert(address + " not found.");
        }
    });
}

/**
 * Search address
 * @method submitAddress
 * @param {} myfield
 * @param {} e
 * @return
 */
function submitAddress(myfield, e) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13) {
        centerOnAddress();
        return false;
    } else
        return true;
}

/**
 * Get property count
 * @method getCount
 * @return
 */
function getCount() {
    if (polyShapes[selectedShape]) {
        if (polyShapes[selectedShape].length > 2 || shapes[selectedShape].type == "Circle") {
            var url = "%BIND(:1)EMPLOYEE/MIX/s/WEBLIB_CBRE_MAP.ISCRIPT1.FieldFormula.IScript_getCount";

            var params = "";
            for (var i = 0; i < (polyShapes.length); i++) {
                if (polyShapes[i].length > 2) {
                    if (params.length == 0) {
                        params = "poly=(";
                    } else {
                        params += "&poly=(";
                    }

                    for (var j = 0; j < (polyShapes[i].length); j++) {
                        params += polyShapes[i][j].lng() + "," + polyShapes[i][j].lat() + ",";
                    }
                    params += polyShapes[i][0].lng() + "," + polyShapes[i][0].lat() + ")";
                } else if (shapes[i].type == "Circle" && polyShapes[i].length > 0) {
                    if (params.length == 0) {
                        params = "circle=";
                    } else {
                        params += "&circle=";
                    }
                    params += polyShapes[i][0].lng() + "," + polyShapes[i][0].lat() + "^" + shapes[i].radius;
                }
            }
            if (params != "" && session != null) {
                params += "&session=" + session;
                $.ajax({
                    url: url,
                    type: "GET",
                    data: params,
                    timeout: 10000,
                    /**
                     * Get property count via AJAX call
                     * @method beforeSend
                     * @return
                     */
                    beforeSend: function() {
                        $("#results").html("Retrieving Count...");
                    }
                })
                    .done(function(results) {
                        $("#results").html(results + " " + sType);
                        $("#results").css({
                            display: 'block'
                        });
                    })
                    .fail(function() {
                        $("#results").html("Failed to get counts.");
                        $("#results").css({
                            display: 'block'
                        });
                    });
            }
        }
    } else {
        $("#results").html("");
        $("#results").css({
            display: 'none'
        });
        $("#getPropBtn").prop('disabled', true);
    }
}