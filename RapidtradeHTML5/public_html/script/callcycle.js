var g_callCycleBranchID = '';

var g_callCyclePageTranslation = {};

function callCycleOnPageBeforeCreate() {
    
    g_callCyclePageTranslation = translation('callcyclepage');
}

function callCycleOnPageShow() {
	
    callCycleInit();
    callCycleBind();
}

function callCycleBind() {
	
    $('#callcycletoMenu').button()
.click(function (event) {

    g_loadMenu();
});
    
    $('#userSelect').change(function () {	    	
        
    	g_callCycleCurrentUserID = $(this).attr('value');
    	
    	if (g_isOnline()) {
    		
    		$.mobile.showPageLoadingMsg();
    		$('#callcyclePanel').addClass('invisible');
    		$('#nocallcycle').addClass('invisible');
    		callCycleFetch();
    	}
    });
}

function callCycleInit() {
	
	if (g_isOnline()) {	
		$.mobile.showPageLoadingMsg();
		
		if (!g_callCycleCurrentUserID)
			g_callCycleCurrentUserID = g_currentUser().UserID;
		
		callCycleReadStaff();
	}
}

function callCycleReadStaff() {
	
	var url = g_restUrl + 'Users/ReadStaff?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID +'&format=json';
	
	g_ajaxget(url, callCycleReadStuffOnSuccess);
}

function callCycleReadStuffOnSuccess(json) {
	
	if (json.length > 1) {
		
		$('#userSelectDiv').removeClass('invisible');
		
		$('#userSelect').empty();
		
		for (var i = 0; i < json.length; ++i)
			$('#userSelect').append('<option value="' + json[i].UserID + '">' + json[i].UserID  + '</option>');
		
        $("#userSelect option").filter(function() {        	
            return $(this).attr('value') == g_callCycleCurrentUserID;
        }).attr('selected', true);
        
		$('#userSelect').selectmenu('refresh');
	}
        
        callCycleFetch();
}

function callCycleFetch() {
	
    $("#callcycleReport").empty();
	
    var date = new Date();
    var start = date.getFullYear() + "" + g_setLeadingZero((date.getMonth() + 1)) + "" + g_setLeadingZero(date.getDate());
    var url = g_restUrl + "callcycle/GetReport?supplierID=" + g_currentUser().SupplierID + "&userID=" + g_callCycleCurrentUserID + "&startdate=" + start + "&format=json";
    
    console.log(url);
    
    var success = function (json) {
        	
        $.each(json, function (i, item) {
            g_append('#callcycleReport', '<li>' +
                                        '<table class="callcycle">' +
                                        '<tr>' +
                                        '<td class="name">' + item.Name + '</td>' +
                                        '<td class="week">' + item.Week + '</td>' +
                                        '<td class="day">' + callCycleShowImage(item.Mon) + '</td>' +
                                        '<td class="day">' + callCycleShowImage(item.Tue) + '</td>' +
                                        '<td class="day">' + callCycleShowImage(item.Wed) + '</td>' +
                                        '<td class="day">' + callCycleShowImage(item.Thu) + '</td>' +
                                        '<td class="day">' + callCycleShowImage(item.Fri) + '</td>' +
                                        '<td class="day">' + callCycleShowImage(item.Sat) + '</td>' +
                                        '</tr>' +
                                        '</table>' +
                                        '</li>');
            
            g_callCycleBranchID = g_callCycleBranchID || item.BranchID;
        });

        if ($('#callcycleReport li').length) {
            $('#callcyclePanel').removeClass('invisible');
            $("#callcycleReport").listview('refresh');
            $("#callcycleReport").fadeIn();
        }
        else
            $('#nocallcycle').removeClass('invisible');
           
        $("#loadingPanel").addClass('invisible');

        $.mobile.hidePageLoadingMsg();
    }
    var error = function (e) {
        console.log(e.message);
    }

    g_ajaxget(url, success, error);	
}

function callCycleShowImage(number) {
	
    if (number == 1) 
    	return "<img src='img/cancel.png'/>";
    if (number == 2) 
    	return "<img src='img/yellow.png'/>";
    if (number == 3) 
    	return "<img src='img/green.png'/>";
    
    return "-";
}
