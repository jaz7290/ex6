function extend(B, A) {
	function I() {}
	I.prototype = A.prototype;
	B.prototype = new I();
	B.prototype.constructor = B;
}


function JSONManager (){
	nokia.maps.util.OObject.call(this);
	this.init();
}

extend(JSONManager,
		nokia.maps.util.OObject);


JSONManager.prototype.init = function  (){
	var that = this;
	that.set("state","initial");	
	that.parseJSON = function (filename){
		that.set("state", "started");
		$.ajax({
			type: "GET",
			url: filename ,
			success: function (json){
				that.set("state", "loaded");
				that.set("object", JSON.parse(json));
				that.set("state", "finished");
			}	,
			error : function onFailed(err){
				that.set("state", "failed");
			}
		});
	}
}


function GeoJSONContainer (options){
	nokia.maps.map.Container.call(this);
	this.init(options);
}

extend(GeoJSONContainer,
		nokia.maps.map.Container);


GeoJSONContainer.prototype.init =function  (options){
	
	var that = this;
	
	this.set("state","initial");
	
	
	if (options !==undefined && options.container !== undefined){
		this.container = container;
	}
	if (options !==undefined && options.theme !== undefined){
		this.theme = [];
		this.theme.getPointPresentation =(options.theme.getPointPresentation !== undefined) ?
			options.theme.getPointPresentation : GeoJSONTheme.getPointPresentation;
		this.theme.getLineStringPresentation =
			(options.theme.getLineStringPresentation !== undefined) ?
			options.theme.getLineStringPresentation: GeoJSONTheme.getLineStringPresentation;
		this.theme.getPolygonPresentation = 
			(options.theme.getPolygonPresentation !== undefined) ?
			options.theme.getPolygonPresentation: GeoJSONTheme.getPolygonPresentation;
	} else {
		this.theme = GeoJSONTheme;
	}
	

	that.geometryToMapObjects = function( geojsonGeometry, properties ){
	
		var mapObject;

		switch ( geojsonGeometry.type ){
			case "Point":
				mapObject = that.theme.getPointPresentation(
					[geojsonGeometry.coordinates[1], geojsonGeometry.coordinates[0]]
						,properties);
				if (properties) {
					mapObject.set("properties", properties);
				}
				break;
	
			case "MultiPoint":
				mapObject = nokia.maps.map.Container();
				for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
					var point = that.theme.getPointPresentation(
						[geojsonGeometry.coordinates[1], geojsonGeometry.coordinates[0]]
							,properties);
					mapObject.objects.add(point);
				}
				if (properties) {
					for (var k = 0; k < mapObject.objects.getLength(); k++){
						mapObject.objects.get(k).set("properties", properties);
					}
				}
				break;

			case "LineString":
				var path = [];
				for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
					var coord = geojsonGeometry.coordinates[i];
					var ll = new nokia.maps.geo.Coordinate(coord[1], coord[0]);
					path.push(ll);
				}
				mapObject = that.theme.getLineStringPresentation(path, properties);
				if (properties) {
					mapObject.set("properties", properties);
				}
				break;
	
			case "MultiLineString":
				mapObject = nokia.maps.map.Container();
				for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
					var path = [];
					for (var j = 0; j < geojsonGeometry.coordinates[i].length; j++){
						var coord = geojsonGeometry.coordinates[i][j];
						var ll = new nokia.maps.geo.Coordinate(coord[1], coord[0]);
						path.push(ll);
					}
					
					var lineString = that.theme.getLineStringPresentation(path, properties);
					mapObject.objects.add(lineString);
				}
				if (properties) {
					for (var k = 0; k < mapObject.objects.getLength(); k++){
						mapObject.objects.get(k).set("properties", properties);
					}
				}
				break;
	
			case "Polygon":
				var geoStrip = new nokia.maps.geo.Strip();
				var exteriorDirection;
				var interiorDirection;
				for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
					for (var j = 0; j < geojsonGeometry.coordinates[i].length; j++){
						geoStrip.add(
						new nokia.maps.geo.Coordinate (geojsonGeometry.coordinates[i][j][1],
							geojsonGeometry.coordinates[i][j][0]));
					}
				}
				
				mapObject = that.theme.getPolygonPresentation(geoStrip, properties);
				if (properties) {
					mapObject.set("properties", properties);
				}
				break;
	
			case "MultiPolygon":
				mapObject = new nokia.maps.map.Container();
				for (var i = 0; i < geojsonGeometry.coordinates.length; i++){
					var polygons = [];
					for (var j = 0; j < geojsonGeometry.coordinates[i].length; j++){	
						var geoStrip = new nokia.maps.geo.Strip();
						for (var k = 0; k < geojsonGeometry.coordinates[i][j].length; k++){
							geoStrip.add(
								new nokia.maps.geo.Coordinate(geojsonGeometry.coordinates[i][j][k][1],
								 geojsonGeometry.coordinates[i][j][k][0]));
						}
	                    var polygon = that.theme.getPolygonPresentation(geoStrip, properties);
	                    polygons.push(polygon);
					}
					
					mapObject.objects.addAll(polygons);
				}
				if (properties) {
					for (var k = 0; k < mapObject.objects.getLength(); k++){
						mapObject.objects.get(k).set("properties", properties);
					}
				}
				break;
	
			case "GeometryCollection":
				mapObject = nokia.maps.map.Container();
				if (!geojsonGeometry.geometries){
					error = _error("Invalid GeoJSON object: GeometryCollection object " +
						" missing \"geometries\" member.");
				}else{
					for (var i = 0; i < geojsonGeometry.geometries.length; i++){
						var obj = geometryToMapObjects(geojsonGeometry.geometries[i], 
							 properties || null);
						if (obj !== undefined ){
							mapObject.objects.add( obj);
						} else {
							break;
						}
					}
				}
				break;
	
			default:
				error = _error("Invalid GeoJSON object: Geometry object must be one of " +
					"\"Point\", \"LineString\", \"Polygon\" or \"MultiPolygon\".");
		}

		return mapObject;

	};

	that._error = function( message ){
		that.set("state","failed");
		return {
			type: "Error",
			message: message
		};

	};

}

GeoJSONContainer.prototype.parseGeoJSON = function (geojson){
	this.objects.clear();
	this.addGeoJSON(geojson);
	return this.objects.asArray();	
}
	
GeoJSONContainer.prototype.addGeoJSON = function (geojson){
	var error;
	this.set("state","started");
	if (this.container !== undefined){
		// clear the internal representation of map objects,
		// since we are using an external container.
		this.objects.clear();
	}
	
	switch (geojson.type ){
		case "FeatureCollection":
			if (!geojson.features){
				error = this._error("Invalid GeoJSON object: FeatureCollection object missing \"features\" member.");
			}else{
				//
				for (var i = 0; i < geojson.features.length; i++){
					this.objects.add(this.geometryToMapObjects(geojson.features[i].geometry,
						geojson.features[i].properties));
				}
			}
			break;

		case "GeometryCollection":
			if (!geojson.geometries){
				error = this._error("Invalid GeoJSON object: GeometryCollection object missing \"geometries\" member.");
			}else{
				
				for (var i = 0; i < geojson.geometries.length; i++){
					this.objects.add(this.geometryToMapObjects(geojson.geometries[i], null));
				}
			}
			break;

		case "Feature":
			if (!( geojson.properties && geojson.geometry )){
				error = this._error("Invalid GeoJSON object: Feature object missing \"properties\" or \"geometry\" member.");
			}else{
				//resultSet = 
				this.objects.add(this.geometryToMapObjects(geojson.geometry, geojson.properties));
			}
			break;

		case "Point": case "MultiPoint": case "LineString": case "MultiLineString": case "Polygon": case "MultiPolygon":
			//resultSet = 
			if(geojson.coordinates){
				this.objects.add(this.geometryToMapObjects(geojson, null));
			} else{
				error = this._error("Invalid GeoJSON object: Geometry object missing \"coordinates\" member.");
			}
			break;

		default:
			error = this._error("Invalid GeoJSON object: GeoJSON object must be one of \"Point\"," + 
				" \"LineString\", \"Polygon\", \"MultiPolygon\", \"Feature\", \"FeatureCollection\" or \"GeometryCollection\".");

	}
	
	if (this.get("state") == "failed"){
		return error;
	} else if (this.container !== undefined){
		this.container.objects.addAll(this.objects.asArray())
	}
	
	this.set("state","finished");
	return (this.container  !== undefined) ? this.container  :this;
}



// This is the default representation of a point, a line string and a
// polygon, override as necessary.
GeoJSONTheme = {
	getPointPresentation: function(dataPoint, properties){
		return new nokia.maps.map.StandardMarker(dataPoint );
	}
	,getLineStringPresentation: function(dataPoints, properties){
		return new nokia.maps.map.Polyline(dataPoints);
	}
	,getPolygonPresentation: function(geoStrip, properties){
		return new nokia.maps.map.Polygon(geoStrip);
	}
};


