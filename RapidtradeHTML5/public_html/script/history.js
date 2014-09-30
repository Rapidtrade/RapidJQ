var g_historyLastRadioButton;

/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function historyOnPageShow() {
    
    g_companyPageTranslation.safeExecute(function() {
        
        g_companyPageTranslation.translateButton('#companyHistoryRefresh','Refresh');
        g_companyPageTranslation.translateRadioButton('radioActivity', 'Activity');
        g_companyPageTranslation.translateRadioButton('radioOrders', 'Orders');
    });

    $('#noorders, #noactivities').hide();
    
    historyHideFooter();	
    overlaySetMenuItems();

    historyOnPageShowSmall();
    historyBind();
    
    $('#companyHistoryRefresh').removeClass('invisible');
    $('#companyHistoryRefresh').off();
    $('#companyHistoryRefresh').on('click', function() {
        historyRefreshClicked();
    });

    g_showCurrentCompanyName();

    //check for re-load of same customer, reload not needed
    if (sessionStorage.getItem('HistoryCacheAccountID') && g_currentCompany().AccountID == sessionStorage.getItem('HistoryCacheAccountID')) {
        historyFromCache();
    } else {
            //else reload from scratch
            //if (g_isOnline()) {
                var dao = new Dao();
                dao.openDB(function() {	historyInit();	});
            //}
    }	
}

function historyOnPageShowSmall() {
	
	if (g_isScreenSmall()) {
		
		$('.hideonphone').hide();
		$('.phoneonly').show();
	}
}

function historyHideFooter() {
	
	/*
	if (sessionStorage.getItem('HistoryNoFooter') == 'true') {
		$('#historyFooter, #historyBackButton, #historyNextButton').hide();		
	}
	*/
}

/*
 * reload the page from cache
 */
function historyFromCache() {
	
	if (g_currentUser().Role != 'CUST')
		$('.options').removeClass('invisible');
	
	//remember the radio button state
	if (g_historyLastRadioButton=='radioActivity') {
		
		$("#radioActivity").attr("checked", true).checkboxradio("refresh");
		$("#radioOrders").attr("checked", false).checkboxradio("refresh");
		
	} else {
		
		$("#radioActivity").attr("checked", false).checkboxradio("refresh");
		$("#radioOrders").attr("checked", true).checkboxradio("refresh");
	}	
	//reload the orders and activity tables
	historySetRadioButton(g_historyLastRadioButton);
//        g_currentUser().Role != 'CUST' ? historyFetchActivities() : historyFetchOrders();
	historyActivitiesListView(JSON.parse(sessionStorage.getItem('CacheHistoryActivities')));
	historyOrderListView(JSON.parse(sessionStorage.getItem('CacheHistoryOrders')));
	$('.hidden').removeClass('hidden');
}


/*
 * All binding to buttons etc. should happen in this <yyy>Bind function() method
 */
function historyBind() {

	sessionStorage.getItem('HistoryNoFooter') == 'true' ?  g_menuBind() : overlaySetMenuButton();
	
	$('input:radio').on('click', function() {
		
		historySetRadioButton(this.id);
	});
}

function historySetRadioButton(radioId){
	
	g_historyLastRadioButton = radioId;
	
	if (radioId == 'radioActivity') {
		
        $("#activities").show();
        $("#orders").hide();		
        
	} else {
		
        $("#activities").hide();
        $("#orders").show();		
	}
}

function historyInit() {
	
    $('#noactivities').hide();
    $('#noorders').hide();
    $("#orders").hide();
    $('.hidden').removeClass('hidden');
    
    g_historyLastRadioButton = 'radioActivity';
    sessionStorage.setItem('HistoryCacheAccountID', g_currentCompany().AccountID);
    
    if (g_currentUser().Role != 'CUST') {
    	
    	historyFetchActivities();
    	$('td.options').removeClass('invisible');
    	
    } else {
    	
    	historyFetchOrders();
    	historySetRadioButton('radioOrders');
    }
}

/*
 * fetch activities history for a company 
 */
function historyFetchActivities() {
	
    var date = new Date();
    var day = g_setLeadingZero(date.getDate());
    var month = g_setLeadingZero(date.getMonth()+1);
    
    $.mobile.showPageLoadingMsg();

    var toDate = date.getFullYear().toString() + month.toString() + day.toString();
    var fromDate = (date.getFullYear() - 1).toString() + month.toString() + day.toString();
    var url = g_restUrl + 'Activities2/GetCollection?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID + '&accountID=' + g_currentCompany().AccountID +  '&fromDate=' + fromDate + '&toDate=' + toDate + '&skip=0&top=0&format=json';
   
    var success = function (json) {
    	
        try {
        	
            sessionStorage.setItem('CacheHistoryActivities', JSON.stringify(json)); //cache results		
            historyActivitiesListView(json);
            
        } catch (error) {
        	
            $('#noactivities').show();
            sessionStorage.setItem('CacheHistoryActivities', '[]');
        }

        $.mobile.hidePageLoadingMsg();
        historyFetchOrders();
    };
    
    var error = function (e) {
    	alert('You dont seem to be online');
        console.log(e.message);
        historyFetchOrders();        
    };
    
    g_ajaxget(url, success, error);	 
}

/*
 * create table of activities 
 */
function historyActivitiesListView(activities){
	
    var prevdate = '';
    $("#activityUL").empty();
   
    if (!activities  || !activities.length) {
    	
    	$('#noactivities').show();
    	return;
    }
    
    $('#noactivities').hide();
    
    var length = activities.length;
    
    for (var i = 0; i < length  ; i++) {
    	
        var activity = activities[i];
        //get date
        var substringedDate = activity.DueDate.substring(6);
        var parsedIntDate = parseInt(substringedDate);
        var duedate = new Date(parsedIntDate);
        var month = duedate.getMonth() + 1;
        var day = duedate.getDate();
        var year = duedate.getFullYear();
        var date = day + "/" + month + "/" + year;
        
        //date header
        if (prevdate != date)        	
            g_append('#activityUL', '<li data-role="list-divider" role="heading">' + date + '</li>');
        
        prevdate = date;
        
        if (!activity.Notes) 
        	activity.Notes = "";
        
        //
        var liStr = '<li id="' + activity.EventID + '"><a class="activityLink">' +
					'        <p class="ui-li-aside ui-li-desc"><strong>' + duedate.toLocaleTimeString() + '</strong></p>' +
					'        <h3 class="ui-li-heading">' + activity.Description + '</h3>' +
					'        <p class="ui-li-desc data">' + activity.Data + '</p>' +
					'        <p class="ui-li-desc notes"><strong>' + activity.Notes + '</strong></p>' +
					'</a><a onclick="historyShowPhotoForActivity(' + activity.EventID + ')">Show photo</a></li>';

        g_append('#activityUL', liStr);
        
        historyAttachActivityToItem(activity, $('#activityUL').find('.activityLink').last());        
    }
    
    $('#activityUL').listview('refresh');
}

function historyAttachActivityToItem(activity, itemSelector) {
	
    $(itemSelector).off('click');
    $(itemSelector).on('click', function(activity) {
    	
    	return function() {
    		historyEditActivity(activity);
    	};
    	
    }(activity));
}

function historyEditActivity(activity) {

    activityFormShowInPopup(activity, '#activityPopup');

    $('#activityPopup').on('popupafterclose', function(event) {

            if (sessionStorage.getItem('activitySavedItems')) {

                    activity = JSON.parse(sessionStorage.getItem('currentActivity'));				

                    var activitySavedItems = JSON.parse(sessionStorage.getItem('activitySavedItems'));

                    activity.Data = activitySavedItems.Data;
                    activity.Notes = activitySavedItems.Notes;

                    sessionStorage.removeItem('activitySavedItems');

                    $('#' + activity.EventID).find('.data').text(activity.Data);
                    $('#' + activity.EventID).find('.notes').html('<strong>' + activity.Notes + '</strong>');

                    historyAttachActivityToItem(activity, $('#' + activity.EventID).find('.activityLink'));
            };

            sessionStorage.removeItem('currentActivity');
    });	
}

function historyShowPhotoForActivity(id) {
	
    $('#imagePopup img').attr('src', g_restUrl + 'Files/GetImage?id=' + id + '&supplierID=' + g_currentUser().SupplierID + '&width=700&height=700');
    $('#imagePopup').popup('open');
}

/*
 * fetch orders history for a company 
 */
function historyFetchOrders() {
    
    if (!g_isOnline(false)) {

        var orders = [];
        
        var showOrders = function() {            
            
            sessionStorage.setItem('CacheHistoryOrders',JSON.stringify(orders));
            historyOrderListView(orders);           
            $.mobile.hidePageLoadingMsg();
        };

        $.mobile.showPageLoadingMsg();

        var dao = new Dao;
        dao.index('Orders', g_currentCompany().AccountID, 'index1', function(order) {

            orders.push(order);

        }, undefined, showOrders);

        g_busy(false);
        return;        
    }

    var url = DaoOptions.getValue('LiveHistoryOrders') || g_restUrl + 'Orders/GetCollection';

    url += '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID + '&skip=0&top=100&format=json';

    console.log(url);

    var success = function (json) {

        sessionStorage.setItem('CacheHistoryOrders',JSON.stringify(json)); //cache results
        historyOrderListView(json);            
    };

    var error = function (e) {
        console.log(e.message);
    };

    g_ajaxget(url, success, error);
}

/*
 * create table of orders, Onclick, show popup with order details and ordered items
 */
function historyOrderListView(orders) {
	
    $("#orderlist").empty();
    var prevMonth = '';
    var ordersList = '';
    
    if (orders == null){
    	$('#noorders').show();
    	return;
    }
    if (orders.length == 0){
    	$('#noorders').show();
    	return;
    } else 
    	$('#noorders').hide();
    
    for (var i = 0; i < orders.length; i++) {     
        var order = orders[i];
        
        var displayedDate = '';
        var month = -1;
        
        if (order.CreateDate) {
        	
            var substringedDate = order.CreateDate.substring(6);
            var parsedIntDate = parseInt(substringedDate);
            var createDate = new Date(parsedIntDate);
            month = createDate.getMonth();
            
            displayedDate = createDate.getFullYear() + "/" + 
            				g_setLeadingZero(month + 1) + "/" + 
            				g_setLeadingZero(createDate.getDate());
        }
        
        if (prevMonth != month){
        	 ordersList = ordersList + '<li data-role="list-divider">' + historyGetMonth(month + 1) + '</li>';
        } 
        
        prevMonth = month;
        
        if (!order.Comments) 
        	order.Comments = "";
        if (!order.ERPStatus) 
        	order.ERPStatus = "";
        if (!order.ERPOrderNumber) 
        	order.ERPOrderNumber = "";
        
        ordersList = ordersList +   '<li>' +
                                    '	<a onclick="historyOrderOnClick(' + i + ')">' + 
                                    '        <h3 class="ui-li-heading">' + order.Reference + '</h3>' +
                                    '        <p class="ui-li-desc">' + order.Comments + '</p>' +
                                    '        <p class="ui-li-desc"><strong>' + order.ERPOrderNumber + '</strong></p>' +
                                    '        <p class="ui-li-aside ui-li-desc"><strong>' + displayedDate + '</strong></p>' +
                                    '        <p><strong>' + (order.Type ? order.Type.toUpperCase() : '') +  '</strong></p>' +
                                    '   </a>' +
                                    '</li>';   		
    }
    
    g_append('#orderlist', ordersList);
    $('#orderlist').listview('refresh');  
}

function historyOrderOnClick(cnt) {	
	
	sessionStorage.setItem('currentOrderCount',cnt); //store for other pages
	$.mobile.changePage("orderdetails.html", { transition: "none" });
 };	


function historyGetMonth(month) {
	
	switch (month) {
	
		case 1: 
			return 'January';
			break;
		case 2: 
			return 'February';
			break;
		case 3: 
			return 'March';
			break;
		case 4: 
			return 'April';
			break;
		case 5: 
			return 'May';
			break;
		case 6: 
			return 'June';
			break;
		case 7: 
			return 'July';
			break;
		case 8: 
			return 'August';
			break;
		case 9: 
			return 'September';
			break;
		case 10: 
			return 'October';
			break;
		case 11: 
			return 'November';
			break;
		case 12: 
			return 'December';
			break;	
	}
}

function historyRefreshClicked() {
    $('#companyHistoryRefresh').addClass('ui-disabled');
    
     $('#noactivities').hide();
    $('#noorders').hide();
    $("#orders").hide();
    $('.hidden').removeClass('hidden');
    
    sessionStorage.removeItem('CacheHistoryActivities');
    sessionStorage.removeItem('CacheHistoryOrders');
    var dao = new Dao;
    dao.clear('Orders');
    
    //if (g_historyLastRadioButton==='radioActivity') {
        historyFetchActivities();
      //  $("#radioActivity").attr("checked", true).checkboxradio("refresh");
        //$("#radioOrders").attr("checked", false).checkboxradio("refresh");
		
    //} else {
    //    historyFetchOrders();
     //   $("#radioActivity").attr("checked", false).checkboxradio("refresh");
     //   $("#radioOrders").attr("checked", true).checkboxradio("refresh");
    //}
    historyFromCache();
    $('#companyHistoryRefresh').removeClass('ui-disabled');
}