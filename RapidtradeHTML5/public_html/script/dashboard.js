
//var gmapurl = '';
//var markers = [];
var temp;
var EvtName, EvtID, EvtuserID, EvtFieldType, RowId;
var activityTypes = new Object();
var selectedDate = moment();
var selectUserText = 'Select a user...';

var locationArray = [];
var locationTitleArray = [];
var isMapViewActive = false;
var isMapShown = false;
var g_dashboardPageTranslation = {};
var g_userDailySalesDetailTranslation = {};
var g_monthlySummaryTranslation = {};

function dashboardOnPageBeforeCreate() {
    
    g_dashboardPageTranslation = translation('dashboardpage');      
}

//********************************************************************************** Load Page
$(document).ready(function () {
	
    if (!g_currentUser()) 
            return;  
        
    g_dashboardPageTranslation.safeExecute(function(){
        
        fetchUsers();
        fetchActivityTypes();        
    });
    //fetchMonthySummary()
    
    var dao = new Dao();
    dao.openDB(function () { bind(); DaoOptions.fetchOptions();});
});

//********************************************************************************** Bind Events
function bind() {
    
    $('.headerLogo').attr('src', g_logo);
	
    $("#msName").change(function () {
        $("#msActivity")[0].selectedIndex = 0;
        $("#msActivity").selectmenu("refresh");
        filterUser($("#msName").val());
    });

    $("#msActivity").change(function () {
        $("#msName")[0].selectedIndex = 0;
        $("#msName").selectmenu("refresh");
        filterActivity($("#msActivity").val());
    });

    $("#duedate").change(function () {
        selectedDate = moment($("#duedate").val());
    });

    $("#duedate2").change(function () {
    	selectedDate = moment($("#duedate2").val());
        //fetchCallCycle();
    });
    
    $('#dsSubmit').click(function() {
        fetchDailySummary();
    });
    

    $("#alSubmit").click(function () {
        fetchActivityList();
    });

    $("#mcsSubmit").click(function () {
    	fetchMonthlyCalendarSummary();
    });

    $("#ccSubmit").click(function () {
        fetchCallCycle();
    });

    $("#dsComment").click(function () {
        saveComment("ds");
    });

    $("#dsCancel").click(function () {
        cancelComment("ds");
    });

    $("#alComment").click(function () {
        saveComment("al");
    });

    $("#alCancel").click(function () {
        cancelComment("al");
    });
    
    $('input[type="radio"]').change(function() {
    	
        isMapViewActive = $(this).attr('value') == 'map';
    	
    	$('#dailyMap').toggleClass('invisible', !isMapViewActive);
		$('#dailyList').toggleClass('invisible', isMapViewActive);
		
    	if (isMapViewActive)    		
    		showMap();
    });
    
    $('#alActivity, #mcsActivity').change(function() {
    	
    	var that = this;
    	
    	var onSuccess = function(activityType) {
    		
    		var defaultDataArray = activityType.DefaultData && activityType.DefaultData.split(',') || [];
    		
    		var summaryType = that.id.replace('Activity', ''); 
    	
    		$('#' + summaryType + 'ChoiceDiv').toggle(defaultDataArray.length > 0);
    		
    		if (defaultDataArray.length)
    			showActivityChoice('#' + summaryType + 'Choice', defaultDataArray);
    		
    	};    	
    	
    	var dao = new Dao();
    	dao.get('ActivityTypes', g_currentUser().SupplierID + $(this).val(), onSuccess);    	
    });
    
    $('.subDBPBackButton').off().on('click', function() {
        $.mobile.changePage('dashboard.html');
    });
}

function showActivityChoice(choiceSelector, options) {
	
	$(choiceSelector).empty(); 
	
	$(choiceSelector).append('<option value="ALL" selected>All</option>');
	
	for (var i = 0; i < options.length; ++i) {
		
		$(choiceSelector).append('<option value="' + options[i] + '">' + options[i] + '</option>');
	}
	
    $(choiceSelector).selectmenu('refresh');
}

//***************************************************************************** Filters
function filterUser(username) {
    $("#monthlysummarytable tbody tr").each(function (index) {
        var $tableuser = $(this).find('td:first').text();
        if ($tableuser == username) {
            $(this).fadeIn();
        } else {
            $(this).fadeOut();
        }
    });
}

function filterActivity(activityname) {
    $("#monthlysummarytable tbody tr").each(function (index) {
        var $tableuser = $(this).find('td:eq(2)').text();
        if ($tableuser == activityname) {
            $(this).fadeIn();
        } else {
            $(this).fadeOut();
        }
    });
}

//***************************************************************************** User Summary
function usersummaryShow(){
    fetchUsers();	
}

function fetchUsers(){

    var url = (DaoOptions.getValue('LiveDashboardURL') || g_restUrl) + 'Dashboard/GetUsers?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID + '&format=json';
    
    //Clear user
    $('#usersummarytable tbody').empty();

    $('#msName').empty();
    $('.userChoice').empty();
    $('#alName').empty();
    $('#mcsName').empty();
    $('#ccName').empty();

    $('.userChoice').append("<option>" + g_dashboardPageTranslation.translateText(selectUserText) + "</option>");
    $('#alName').append("<option value='ALL'>All users...</option>");
    $('#mcsName').append("<option value='SELECT'>Select a user...</option>");
    $('#ccName').append("<option value='ALL'>Select one...</option>");

    $.mobile.loading("show");
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {
            temp = '';
            $.each(json, function (i, item) {
                var logindate = moment(parseInt(item.LastLoginDate.substr(6)));
                temp += '<tr>' +
                    '<td class="name">' + item.Name + '</td>' +
                    '<td class="activ">' + getTrafficLights(logindate) + '</td>' +
                    '<td class="date">' + logindate.format("ddd, MMM DD YY, h:mm a") + '</td>' +
                    '<td class="num">' + item.ActivitiesThisMonth + '</td>' + 
                    '<td class="num">' + item.OrdersThisMonth + '</td>' +
                    '</tr>';

                //$('#msName').append('<option>' + item.UserID + '</option>');
//                $('#msName').append("<option value='" + item.UserID + "'>" + item.Name + "</option>");
                $('.userChoice').append("<option value='" + item.UserID + "'>" + item.Name + "</option>");
                $('#alName').append("<option value='" + item.UserID + "'>" + item.Name + "</option>");
                $('#mcsName').append("<option value='" + item.UserID + "'>" + item.Name + "</option>");
                $('#ccName').append("<option value='" + item.UserID + "'>" + item.Name + "</option>");
            });

            $('#usersummarytable tbody').html(temp);
            //$('#usersummarylist').listview('refresh');//Console error
            $.mobile.loading("hide");
        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });

}

function getTrafficLights(logindate) {
    var text = ""
    if (logindate < moment().add('days', -10))
    {
        text = "<img src='img/Traffic-Lights-Red.ico'/>"
    }
    else if (logindate < moment().add('days', -5))
    {
        text = "<img src='img/Traffic-Lights-Yellow.ico'/>"
    }
    else
    {
        text = "<img src='img/Traffic-Lights-Green.ico'/>"
    }
    return text
    //Green - if they logged in within the last 5 days
    //Yellow - if they logged in withint the last 10 days
    //Red - if they have not logged in for 10 days
}

//**************************************************************************** Activity Types
function fetchActivityTypes() {
    
    $('#msActivity').append("<option>" + g_dashboardPageTranslation.translateText('Show All...') + "</option>");
    
    var url = g_restUrl + 'ActivityTypes/GetCollection?supplierID=' + g_currentUser().SupplierID + '&skip=0&top=100&format=json';
    $.mobile.loading("show");
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback3', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {
            $.each(json, function (i, item) {
                $('#msActivity').append("<option>" + g_dashboardPageTranslation.translateText(item.Label) + "</option>");
                $('#alActivity').append("<option value='" + item.EventID + "'>" + item.Label + "</option>");
                $('#mcsActivity').append("<option value='" + item.EventID + "'>" + item.Label + "</option>");
                activityTypes[item.EventID] = item.FieldType;
            });
            $.mobile.loading("hide");
        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });

}

function monthlySummaryOnPageBeforeCreate() {
    
    g_monthlySummaryTranslation = translation('monthlysummary');
}

function monthlySummaryOnPageShow() {
    
    g_monthlySummaryTranslation.safeExecute(function() {
        
        g_monthlySummaryTranslation.translateButton('#msBack', 'Dashboard');
    });    
    
    fetchMonthySummary();
}

//*************************************************************************** Monthy Summary
function fetchMonthySummary() {
 	var url = g_restUrl + 'Dashboard/GetActivities?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID + '&format=json';

 	var names = ' ';
 	var activities = ' ';
 	$.mobile.loading("show");
	$.ajax({
		type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback', contentType: "application/json", dataType: 'jsonp',
		success: function (json) {
		    $('#monthlysummarytable tbody').empty();
		    hasValue = false;
		    $.each(json, function (i, item) {
		        $('#monthlysummarytable tbody').append('<tr><td style = "display:none">' +
                        item.UserID +
  						'</td><td>' +
                        item.Name +
  						'</td><td>' +
  						g_dashboardPageTranslation.translateText(item.Label) +
  						'</td><td class="month">' +
  						replaceNull(item.Jan) +
  						'</td><td class="month">' +
  						replaceNull(item.Feb) +
  						'</td><td class="month">' +
  						replaceNull(item.Mar) +
  						'</td><td class="month">' +
  						replaceNull(item.Apr) +
  						'</td><td class="month">' +
  						replaceNull(item.May) +
  						'</td><td class="month">' +
  						replaceNull(item.Jun) +
  						'</td><td class="month">' +
  						replaceNull(item.Jul) +
  						'</td><td class="month">' +
  						replaceNull(item.Aug) +
  						'</td><td class="month">' +
  						replaceNull(item.Sep) +
  						'</td><td class="month">' +
  						replaceNull(item.Oct) +
  						'</td><td class="month">' +
  						replaceNull(item.Nov) +
  						'</td><td class="month">' +
  						replaceNull(item.Dec) +
  						'</td></tr>');
		    });
		    $.mobile.loading("hide");
   		},
   		error: function(e) {
   		    console.log(e.message);
   		    $.mobile.loading("hide");
   		}
	});

}

//**************************************************************************** Daily Summary
function fetchDailySummary() {
	
	locationArray = [];
	locationTitleArray = [];
	
	isMapShown = false;

	var username = $("#dsName").val();
	
	$('#viewChoiceDiv').toggleClass('invisible', username == selectUserText);
	selectedDate = moment($("#duedate").val());
	
    $("#loading").fadeIn();
    var start = selectedDate.format("YYYYMMDD");
	var end = selectedDate.add('days',1).format("YYYYMMDD");
	var url = g_restUrl + 'Activities2/GetCollection?supplierID=' + g_currentUser().SupplierID + '&userID=' + username + '&fromDate=' + start + '&toDate=' + end + '&skip=0&top=300&format=json';
	var separator = ',';
	var input = '';
//	gmapurl = '';
	$.mobile.loading("show");
    
    console.log(url);
    
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {

            $('#dailySummaryTable tbody').empty();

            //Marker arrey for post
            //markers = []; //markers.length = 0;


            //Invert item list
            var arr = [];
            $.each(json, function (i, item) {
                arr.push(item);
            });
            var rowIndex = 0;
            var n = arr.length - 1;
            for (i = n; i >= 0; i--) {
                var item = arr[i];
                
                var dateFromSrv = (item.DueDate ? item.DueDate.replace('/Date(','').replace(')/','').split('+') : new Array(0,1));
                var mom = new moment(parseInt(dateFromSrv[0]));
                var duedate;
                
                //if (item.EventTypeID === 'ORDERS') {
                //    var offset = new Date().getTimezoneOffset();
                //    duedate = new Date(parseInt(item.DueDate.substr(6, 13)) + offset * 60000);
                //} else {
                    duedate = mom.toDate(); 
                    duedate.setHours(duedate.getHours() + parseInt(dateFromSrv[1].substr(0,2)));
                //}
                
                
                //var offset = new Date().getTimezoneOffset();
                //var duedate = new Date(parseInt(item.DueDate.substr(6, 13)) + offset * 60000);

                //todo add offset
                var time;
                if (duedate.getHours() < 12)
                    time = duedate.getHours() + "am";
                else
                    time = duedate.getHours() + "pm";

                var img = "<img onClick=\"showPopup('ds','" + item.Name + "','" + item.EventID + "','" + item.UserID + "','" + item.EventTypeID + "','" + (rowIndex++) + "')\" src='img/comment.png'/>";
                $('#dailySummaryTable tbody').append("<tr>" +
											"<td><b>" + time + "</b></td>" +
											"<td class='nowrap bold'>" + item.Name + "</td>" +
											"<td class='nowrap'>" + item.Description + "</td>" +
											"<td>" + item.Data + "</td>" +
											"<td>" + item.Notes + "</td>" +
                                            "<td>" + img + "</td>" +
											"</tr>");


                input = '';
                input = time.replace(separator, " ") + separator + item.Name.replace(separator, " ") + separator + item.Latitude + separator + item.Longitude;
                input = input.replace("&", "and");

                var markerTitle = '(' + time + ') ' + item.Name;
                
                var isItemMarked = (locationTitleArray.indexOf(markerTitle) != -1);
                
                if (item.Longitude && item.Latitude && !isItemMarked ) {
                	
                	var newLocation = new google.maps.LatLng(item.Latitude, item.Longitude);
                	locationArray.push(newLocation);
                	locationTitleArray.push(markerTitle);                             	
                }

            }

            hideRepeatingValues('#dailySummaryTable tbody tr');
            //$("#loading").fadeOut();
            $.mobile.loading("hide");
            
        	if (isMapViewActive)    		
        		showMap();
        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });
}

/* MAP FUNCTIONS*/

//Note: this value is exact as the map projects a full 360 degrees of longitude
var GALL_PETERS_RANGE_X = 800;

// Note: this value is inexact as the map is cut off at ~ +/- 83 degrees.
// However, the polar regions produce very little increase in Y range, so
// we will use the tile size.
var GALL_PETERS_RANGE_Y = 510;

function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

function radiansToDegrees(rad) {
  return rad / (Math.PI / 180);
}

/** @constructor */
function GallPetersProjection() {

  // Using the base map tile, denote the lat/lon of the equatorial origin.
  this.worldOrigin_ = new google.maps.Point(GALL_PETERS_RANGE_X * 400 / 800,
      GALL_PETERS_RANGE_Y / 2);

  // This projection has equidistant meridians, so each longitude degree is a linear
  // mapping.
  this.worldCoordinatePerLonDegree_ = GALL_PETERS_RANGE_X / 360;

  // This constant merely reflects that latitudes vary from +90 to -90 degrees.
  this.worldCoordinateLatRange = GALL_PETERS_RANGE_Y / 2;
};

GallPetersProjection.prototype.fromLatLngToPoint = function(latLng) {

  var origin = this.worldOrigin_;
  var x = origin.x + this.worldCoordinatePerLonDegree_ * latLng.lng();

  // Note that latitude is measured from the world coordinate origin
  // at the top left of the map.
  var latRadians = degreesToRadians(latLng.lat());
  var y = origin.y - this.worldCoordinateLatRange * Math.sin(latRadians);

  return new google.maps.Point(x, y);
};

GallPetersProjection.prototype.fromPointToLatLng = function(point, noWrap) {

  var y = point.y;
  var x = point.x;

  if (y < 0) {
    y = 0;
  }
  if (y >= GALL_PETERS_RANGE_Y) {
    y = GALL_PETERS_RANGE_Y;
  }

  var origin = this.worldOrigin_;
  var lng = (x - origin.x) / this.worldCoordinatePerLonDegree_;
  var latRadians = Math.asin((origin.y - y) / this.worldCoordinateLatRange);
  var lat = radiansToDegrees(latRadians);
  return new google.maps.LatLng(lat, lng, noWrap);
};

function _newGoogleMapsMarker(param) {
	
    var r = new google.maps.Marker({
        map: param._map,
        position: param._position/*new google.maps.LatLng(param._lat, param._lng)*/,
        title: param._title
    });
    
    if (g_isiPad() && param._data) {
        google.maps.event.addListener(r, 'click', function() {
            // this -> the marker on which the onclick event is being attached
            if (!this.getMap()._infoWindow) {
                this.getMap()._infoWindow = new google.maps.InfoWindow();
            }
            this.getMap()._infoWindow.close();
            this.getMap()._infoWindow.setContent(param._data);
            this.getMap()._infoWindow.open(this.getMap(), this);
        });
    }
    return r;
}

function showMap() {

	if (isMapShown)
		return;
	
	var mapCenter = new google.maps.LatLng(0,0);
	
	if (locationArray.length)
		mapCenter = locationArray[0];
	
	  var mapOptions = {
			  
	    zoom: 12,
	    center: mapCenter,
	    mapTypeId: google.maps.MapTypeId.ROADMAP
	  };
	  
	  var dailyMap = new google.maps.Map(document.getElementById('dailyMap'),
	      mapOptions);

	  for (var markerIndex in locationArray) {
		  
		    var marker = _newGoogleMapsMarker({
		        _map: dailyMap,
		        _position: locationArray[markerIndex],
		        _title: locationTitleArray[markerIndex],
		        _data:  locationTitleArray[markerIndex]
		    });
	    
	  }
	  
	  isMapShown = true;
}

//******************************************************************************** Activity List
function fetchActivityList() {
	
    $("#loading").fadeIn();
    var name = $("#alName").val();
    var includeReps = false;
    if (name == "ALL") {
        name = g_currentUser().UserID;
        includeReps = true;
    }

    var activity = $("#alActivity").val();
    var range = $("#alDateRange").val();
    var start = getRangeStartDate(range).format("YYYYMMDD");
    var end = getRangeEndDate(range).format("YYYYMMDD");
    https: //orangeone.svn.cvsdude.com/rapidemailer
    var url = g_restUrl + "Activities2/GetCollection2?supplierID=" + g_currentUser().SupplierID + "&userID=" + name + "&includeReps=" + includeReps + "&activityTypes=" + activity + "&fromDate=" + start + "&toDate=" + end + "&skip=0&top=300&format=json";

    var activityChoice = $('#alChoice').is(':visible') ? $('#alChoice option:selected').val() : '';
    
	$.mobile.loading("show");
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {

            $('#activityListTable tbody').empty();
            var rowIndex = 0;

            $.each(json, function (i, item) {
            	
            	if (activityChoice && (activityChoice != 'ALL') && item.Data.indexOf(activityChoice) == -1)
            		return true;
            	
                //make sure its only this rep
                if (includeReps == false && item.UserID != name) 
                	return true;
            	
                var mduedate = new moment(parseInt(item.DueDate.substr(6)));
                var img = "<img onClick=\"showPopup('al','" + item.Name + "','" + item.EventID + "','" + item.UserID + "','" + item.EventTypeID + "','" + (rowIndex++) + "')\" src='img/comment.png'/>";
                $("#activityListTable tbody").append("<tr>" +
                                                    "<td class='nowrap bold'>" + mduedate.format("ddd DD/MM/YY") + "</td>" +
                                                    "<td class='nowrap'>" + item.UserID + "</td>" +
                                                    "<td class='nowrap'>" + item.Description + "</td>" +
                                                    "<td>" + item.Data + "</td>" +
                                                    "<td>" + item.Notes + "</td>" +
                                                    "<td>" + img + "</td>" +
                                                    "<td>" + item.EventID + "</td>" +
                                                    "<td>" + item.Data + "</td>" +
                                                    "</tr>");

            });
            hideRepeatingValues('#activityListTable tbody tr');
            //$("#loading").fadeOut();
            $.mobile.loading("hide");
        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });
}

function getRangeStartDate(range) {
    var starttime = moment(); 
    if (range==0) return starttime;                                 //today
    if (range == 1) return starttime.subtract('days', 1);           //yesterday
    if (range == 2) return starttime.day(0);                        //this week
    if (range == 3) return starttime.date(1);                       //this month
    if (range == 4) return starttime.date(1).subtract('months', 1);  //last month
    if (range == 5) return starttime.date(1).subtract('months', 1);  //last + this month
}

function getRangeEndDate(range) {
    var starttime = moment();
    if (range == 0) return starttime.add('days', 1);    //today
    if (range == 1) return starttime;                   //yesterday
    if (range == 2) return starttime.weekday(7);    //this week
    if (range == 3) return starttime.add('months', 1).date(1);    //this month
    if (range == 4) return starttime.date(1);         //last month
    if (range == 5) return starttime.date(0).add('months', 1); //last + this month
}

//********************************************************************************  Monthly Calendar Summary
function fetchMonthlyCalendarSummary() {
	
	var name = $("#mcsName").val();
	
	if (name == "SELECT")
		return;
	
	var includeReps = false;

	var activity = $("#mcsActivity").val();
	var range = 5; //last + this month
	var start = getRangeStartDate(range).format("YYYYMMDD");
	var end = getRangeEndDate(range).format("YYYYMMDD");
	var url = g_restUrl + "Activities2/GetCollection2?supplierID=" + g_currentUser().SupplierID + "&userID=" + name + "&includeReps=" + includeReps + "&activityTypes=" + activity + "&fromDate=" + start + "&toDate=" + end + "&skip=0&top=500&format=json";

	var arr = [];

	$.mobile.loading("show");
	$('#calendar').empty();
	
    var activityChoice = $('#mcsChoice').is(':visible') ? $('#mcsChoice option:selected').val() : '';

	var fetchedActivities = {};
	
	$.ajax({
		type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
		success: function (json) {
			
			$.each(json, function (i, item) {

            	if (activityChoice && (activityChoice != 'ALL') && item.Data.indexOf(activityChoice) == -1)
            		return true;
				
				//make sure its only this rep
				if (includeReps == false && item.UserID != name) 
					return true;
				
				var startdate = new Date(parseInt(item.DueDate.substr(6)));
				var enddate = new Date(parseInt(item.EndDate.substr(6)));
				
				fetchedActivities[item.EventID] = item;
				
				arr.push({
					id:item.EventID,
					title: item.Description,
					start: new Date(startdate),
					end: new Date(enddate)
				});
			});

		},
		error: function (e) {
			console.log(e.message);
			$.mobile.loading("hide");
		}
	});

	var maxLoop = 10; //Max wait 10s
	var myInterval = setInterval(function () {
		
		if (0 < arr.length || maxLoop == 0) {
			$('#calendar').fullCalendar({
				/*editable: true,*/
				events: arr,
			    eventClick: function(event) {
			    	
			    	activityFormShowInPopup(fetchedActivities[event.id], '#dashboardActivityPopup');
			    },
			    eventMouseover: function(event) {
			    	
			    	$(this).css('cursor', 'hand');
			    }
			});
			clearInterval(myInterval);
			$.mobile.loading("hide");
		}
		else
		{
			maxLoop = maxLoop - 1;
		}
	}, 1000);

}

function checkIfFinished() {
	return (Results.length >= 28);
}

//******************************************************************************** Call Cycle
function fetchCallCycle() {
    $("#loading").fadeIn();
    var name = $("#ccName").val();
    var start = selectedDate.format("YYYYMMDD");

    var url = g_restUrl + "callcycle/GetReport?supplierID=" + g_currentUser().SupplierID + "&userID=" + name + "&startdate=" + start + "&skip=0&top=300&format=json";

    $.mobile.loading("show");
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {

            $("#callcycleTable tbody").empty();
            var rowIndex = 0;

            $.each(json, function (i, item) {
                var img = "<img onClick=\"showPopupDetail('" + name + "','" + item.AccountID + "')\" src='img/Arrow-right-26.png'/>";

                $("#callcycleTable tbody").append("<tr>" +
											"<td class='nowrap bold'>" + item.Name + "</td>" +
											"<td>" + item.Week + "</td>" +
											"<td>" + showImage(item.Mon) + "</td>" +
											"<td>" + showImage(item.Tue) + "</td>" +
											"<td>" + showImage(item.Wed) + "</td>" +
                                            "<td>" + showImage(item.Thu) + "</td>" +
                                            "<td>" + showImage(item.Fri) + "</td>" +
                                            "<td>" + showImage(item.Sat) + "</td>" +
                                            "<td>" + img + "</td>" +
                                            "</tr>");
            });

            //$("#loading").fadeOut();
            $.mobile.loading("hide");
        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });
}

function showImage(number) {
    if (number == 1) return "<img src='img/cancel.png'/>";
    if (number == 2) return "<img src='img/yellow.png'/>";
    if (number == 3) return "<img src='img/green.png'/>";
    return "-"
}

//******************************************************************************** Order Count By User
function fetchOrderCountByUser() {
    var url = (DaoOptions.getValue('LiveDashboardURL') || g_restUrl) + 'Dashboard/GetUserOrdering?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID + '&format=json';
    $.mobile.loading("show");
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {
            $('#orderCountByUserTable tbody').empty();
            $.each(json, function (i, item) {
                $('#orderCountByUserTable tbody').append('<tr><td>' +
                        item.Month +
  						'</td><td>'  +
  						item.UserID+
  						'</td><td>' +
  						item.SalesRep +
                        '</td><td>' +
                        item.NumOrders  +
  						'</td></tr>');
            });
            hideRepeatingValues('#orderCountByUserTable tbody tr');
            $.mobile.loading("hide");
        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });
}

//******************************************************************************** User Daily Sales Detail

function userDailySalesDetailOnPageBeforeCreate() {
    
    g_userDailySalesDetailTranslation = translation('userDailySalesDetail');
}

function userDailySalesDetailOnPageShow() {
    
    g_userDailySalesDetailTranslation.safeExecute(function() {
        
        g_userDailySalesDetailTranslation.translateButton('#udsBackButton', 'Dashboard');
        g_userDailySalesDetailTranslation.translateButton('#printButton', 'Print');
        g_userDailySalesDetailTranslation.translateButton('#udsSubmit', 'Submit'); 
    });
    
      
    $('#udsSubmit').off().on('click', fetchUserDailySalesDetail);
    if (g_isVanUser()) {
        $('#printButton').off().on('click', function() {

            g_print('#userDailySalesDetail');
        });
    } else {
        $('#printButton').off();
        $('#printButton').hide('invisible');
    }
}

function fetchUserDailySalesDetail() {   
    
    var url = g_restPHPUrl + 'GetView?view=vSalesOrderDetailRpt&params=where%20SupplierID=%27' + g_currentUser().SupplierID + 
            '%27%20and%20UserID=%27' + $("#udsName").val() + '%27%20and%20OrderDate=%27' + moment($("#udsduedate").val()).format("YYYY-MM-DD") +'%27';
    
    console.log(url);
    
    $.mobile.showPageLoadingMsg();
    
    g_ajaxget(url, onSuccess, onFailure);
    
    function onSuccess(json) {
        
        $('#userDailySalesDetailTable tbody').empty();
        $.each(json, function (i, item) {
            $('#userDailySalesDetailTable tbody').append('<tr><td style="color:black; font-weight: bolder;">' +
                    item.ProductID +
                    '</td><td style="color:black; font-weight: bolder;">'  +
                    item.Description+
                    '</td><td style="color:black; font-weight: bolder;">' +
                    item.Quantity +
                    '</td><td style="color:black; font-weight: bolder;">' +
                    item.DailyAmount +
            '</td></tr>');
        });
        
        hideRepeatingValues('#userDailySalesDetailTable tbody tr');          
        
        if (json.length) {            
            
            url = g_restPHPUrl + 'GetView?view=vSalesOrderDetailRptTot&params=where%20SupplierID=%27' + g_currentUser().SupplierID + 
                    '%27%20and%20UserID=%27' + $("#udsName").val() + '%27%20and%20OrderDate=%27' + moment($("#udsduedate").val()).format("YYYY-MM-DD") +'%27';
            
            console.log(url);
            
            g_ajaxget(url, onSuccess2, onFailure);
            
        } else {
            
            $('#userDailySalesDetailTable tfoot tr:not(:first-child)').addClass('invisible');
            $.mobile.hidePageLoadingMsg(); 
        }               
    }
    
    function onSuccess2(json) {

        showTotals(json[0]);
        $.mobile.hidePageLoadingMsg(); 
    }
    
    function onFailure() {
        
        $.mobile.hidePageLoadingMsg();
        g_alert('ERROR: Data are not available.');
    }
    
    function showTotals(json) {        
        
        $('#totalSalesAmountExcl').text(json.TotalSalesAmountExcl);
        $('#totalSalesAmountIncl').text(json.TotalSalesAmountIncl);
        
        $('#totalSalesAmountExcl, #totalSalesAmountIncl').closest('tr').removeClass('invisible');

        var isVan = g_currentUser().Role && (g_currentUser().Role.indexOf('canInv') !== -1);
        
        if ((DaoOptions.getValue('CalcChange') === 'true') && isVan) {

            $('#totalGiven').text(json.ChangeGiven);
            $('#totalTaken').text(json.TotalAmount);
            $('#totalTaken, #totalGiven').closest('tr').removeClass('invisible');
        }                         
    }
}


//******************************************************************************** Popups
function showPopupDetail(name, account) {
    $('#ccList').empty();
    ///$('#ccPopup').popup("open", { positionTo: "#position-header" });
    $('#ccPopup').popup("open", { positionTo: "#position-header" });
    var includeReps = true;
    var end = moment().add('days', 1).format("YYYYMMDD");
    var start = moment().add('months', -3).format("YYYYMMDD");

    var url = g_restUrl + "Activities2/GetCollection2?supplierID=" + g_currentUser().SupplierID + "&userID=" + name + "&accountID=" + account + "&includeReps=" + includeReps + "&fromDate=" + start + "&toDate=" + end + "&skip=0&top=300&format=json";
    $.mobile.loading("show");
    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback2', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {
            var arr = [];
            $.each(json, function (i, item) {
                arr.push(item);
            });

            temp = '';
            var headDate = "";

            var n = arr.length - 1;
            for (i = n; i >= 0; i--) {
                var item = arr[i];
                var mduedate = new moment(parseInt(item.DueDate.substr(6)));

                if (headDate != mduedate.format("DD/MM/YYYY")) {
                    headDate = mduedate.format("DD/MM/YYYY");
                    temp = temp + "<li style='background-color: #CCC;' width='500'>" + mduedate.format("DD/MM/YYYY") + "</li>";
                }
                    
                temp = temp + "<li><table>"
                    + "<tr><td class='nowrap' width='400'><strong>" + item.Name + "</strong></td><td class='nowrap' width='100' align='right'>" + mduedate.format("HH:mm") + "</td></tr>"
                    + "<tr><td colspan='2'>" + item.Notes + "</td></tr>"
                    + "</tr></table></li>";
            }

            $('#ccList').append(temp);
            $('#ccList').listview('refresh');
            $.mobile.loading("hide");

        },
        error: function (e) {
            console.log(e.message);
            $.mobile.loading("hide");
        }
    });
}

function showPopup(type, Name, ID, userID, eventTypeID, rowIndex) {
    EvtName = Name;
    EvtID = ID;
    EvtuserID = userID;
    EvtFieldType = activityTypes[eventTypeID];
    RowId = rowIndex;

    switch (type) {
        case 'ds':
            $('#dsPopup').popup("open");
            break;
        case 'al':
            $('#alPopup').popup("open");
            break;
        default:
            alert('Error!');
            return;
    }
}

function cancelComment(type) {
    switch (type) {
        case 'ds':
            $('#dsPopup').popup("close");
            break;
        case 'al':
            $('#alPopup').popup("close");
            break;
        case 'cc':
            $('#ccPopup').popup("close");
            break;
        default:
            alert('Error!');
    }
}

function saveComment(type) {

    var commentText = "";
    switch (type) {
        case 'ds':
            commentText = $("#dsCommentText").val();
            break;
        case 'al':
            commentText = $("#alCommentText").val()
            break;
        default:
            alert('Error!');
            return;
    }

    var url = g_restUrl + "Comments/SaveComment?" +
            "eventID=" + EvtID +
            "&supplierID=" + g_currentUser().SupplierID +
            "&comment=" + commentText +
            "&g_currentUser().UserID=" + g_currentUser().UserID +
            "&name=" + EvtName +
            "&fieldtype=" + EvtFieldType +
            "&format=json";

    $.ajax({
        type: 'GET', url: url, async: false, jsonpCallback: 'jsonCallback7', contentType: "application/json", dataType: 'jsonp',
        success: function (json) {
            cancelComment(type);
        },
        error: function (e) {
            alert(e.message);
        }
    });

    switch (type) {
        case 'ds':
            var result = $('#dailySummaryTable tbody > tr').eq(RowId).find('td').eq(3);
            $(result).append(" |  " + g_currentUser().UserID + " commented >>>>" + commentText);
            break;
        case 'al':
            var result = $('#activityListTable tbody > tr').eq(RowId).find('td').eq(4);
            $(result).append(" | " + g_currentUser().UserID + " commented >>>>" + commentText);
            break;
        default:
            alert('Error!');
            return;
    }
}


//************************************************************************************ Utility methods
function replaceNull(invar) {
if (invar == null)
   return '-';
else
   return invar;
}
function getURLParameter(name) {
  return decodeURI(
      (RegExp(name + '=' + '(.+?)(&|$)').exec(location.search) || [, null])[1]
  );
}

// Hides repeating values for a report table based on first 2 columns
function hideRepeatingValues(table) {
    var prevcol1 = "";
    var prevcol2 = "";
    var even = true;

    //loop through all rows and delete duplicate cell's
    $(table).each(function (index) {
        var thiscol1 = $(this).find('td:eq(0)').text();
        var thiscol2 = $(this).find('td:eq(1)').text();
        var changed = true;
        if (thiscol1 == prevcol1) {
            $(this).find('td:eq(0)').text("");
            changed = false;
        }
        if (thiscol1 == prevcol1 && thiscol2 == prevcol2) {
            $(this).find('td:eq(1)').text("");
            changed = false;
        }
        if (changed) even = !even;
        if (even)
            $(this).addClass("even");
        else
            $(this).addClass("odd");

        prevcol1 = thiscol1;
        prevcol2 = thiscol2;
    });
}
