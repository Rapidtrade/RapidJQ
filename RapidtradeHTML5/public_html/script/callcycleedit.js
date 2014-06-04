g_callCycleEditSelectedWeek = 1;
g_callCycleEditVisibleCustomerKeys = [];
g_callCycleEditDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function callCycleEditOnPageShow() {
	
	if (g_isOnline()) {
	
		var dao = new Dao();
		dao.openDB(function() {callCycleEditInit();});
	}
}

function callCycleEditInit() {
	callCycleEditBind();
	callCycleEditFetch();
}

function callCycleEditBind() {

 	$('#nextWeek, #prevWeek').click(function() {
 		
 		g_callCycleEditSelectedWeek = parseInt($('#weekNumber').text()) + (($(this).attr('id') == 'prevWeek') ? - 1 : 1);
 		callCycleEditShowSelectedWeek();
     });
 	
 	$('#addCustomer, #searchbtn').click(function() {
 		
 		callCycleEditFetchCustomers();
     });
    
    $("#search").keypress(function (event) {
    	
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') callCycleEditFetchCustomers();
            
            //$('#searchbtn').click();
    });
    
 	$('#save').click(function() {
 		
 		callCycleEditSave();
     }); 
 	
 	$('#removeAll').click(function() {
 		
 		$( "#callcycleReport li" ).each(function(index) {
 			
 			callCycleEditDeleteCustomer($(this).attr('id'));
 		});
 	});
}

function callCycleEditFetch() {
	
    var url = g_restUrl + "CallCycle/GetCollection?supplierID=" + g_currentUser().SupplierID + "&userID=" + g_callCycleCurrentUserID + "&format=json";

    $.mobile.showPageLoadingMsg();
    var success = function (json) {

        callCycleEditSetCachedItems(json);
        callCycleEditShowSelectedWeek();

        $('.hidden').removeClass('hidden');
        $('#loadingPanel').hide();
        $('#refinesearch').hide();
        $('#callcycleReport').fadeIn();
        $.mobile.hidePageLoadingMsg();
    };
    
    var error = function (e) {
        console.log(e.message);
        $.mobile.hidePageLoadingMsg();
    };


    g_ajaxget(url, success, error);
}

function callCycleEditGetNextMondayForWeek(week) {
	
	  var weekDifference = week - g_currentCallCycleWeek();	  
	  var now = moment().day(1);
	  
	  
	  if (week < g_currentCallCycleWeek())		  
		   now.add('weeks', callCycleEditNumberOfWeeks() + weekDifference); 
	  
	  else if (week > g_currentCallCycleWeek())			   
		   now.add('weeks',  weekDifference);
	  
	  return now.format("ddd, MMMM Do");
}

function callCycleEditNumberOfWeeks() {	
	if  (DaoOptions.getValue('WeeksInCallCycle')) {
		var week = parseInt(DaoOptions.getValue('WeeksInCallCycle','0')); 
		if (week > 0) return week;
	} else {
		var numberOfWeeks = 0;
		var date = g_firstMondayOfCurrentMonth();
		while (date.getMonth() == g_mondayOfCurrentWeek().getMonth()) {
			++numberOfWeeks;
			date.setDate(date.getDate() + 7);
		}
		return numberOfWeeks;		
	}
}

function callCycleEditShowSelectedWeek() {
	
	if (g_callCycleEditSelectedWeek > 1) {
		if ($('#prevWeek').hasClass('ui-disabled'))
			$('#prevWeek').removeClass('ui-disabled');
	} else {
		if (!$('#prevWeek').hasClass('ui-disabled'))
			$('#prevWeek').addClass('ui-disabled');		
	}
	
	if ((callCycleEditNumberOfWeeks() <= g_callCycleEditSelectedWeek)) {
		if (!($('#nextWeek').hasClass('ui-disabled')))
			$('#nextWeek').addClass('ui-disabled');
	} else {
		if (($('#nextWeek').hasClass('ui-disabled')))
			$('#nextWeek').removeClass('ui-disabled');		
	}	
	if (g_callCycleEditSelectedWeek >= 1 && g_callCycleEditSelectedWeek <= callCycleEditNumberOfWeeks()) {
		
	    $('#weekNumber').text(g_callCycleEditSelectedWeek);
	    $('#nextWeekNumber').text(g_callCycleEditSelectedWeek);
	    
	    $('#nextDate').text(callCycleEditGetNextMondayForWeek($('#weekNumber').text()));
	    callCycleEditLoadReport();
	}
}


function callCycleEditLoadReport() {
	
    g_callCycleEditVisibleCustomerKeys = [];

    $.mobile.showPageLoadingMsg();

    $("#callcycleReport").empty();
	
    $.each(callCycleEditCachedItems(), function (i, item) {
    	
    	if (!item.Deleted && item.Week == g_callCycleEditSelectedWeek)
    		callCycleEditAddItemToReport(i, item);
    });
    
    $("#callcycleReport").listview('refresh');
    
    $.mobile.hidePageLoadingMsg();
}

function callCycleEditAddItemToReport(index, item) {
    
    g_append('#callcycleReport', callCycleEditRowHtml(index, item))
    g_callCycleEditVisibleCustomerKeys.push(callCycleEditItemKey(item));
	
    $('.exclusive' + index).click(function () {
    	
        var checked = $(this).attr('checked');
//        
//        $('.exclusive' + index + ':checked').each(function() {
//            $(this).attr('checked', false);
//        });
//        
//        $(this).attr('checked', checked);

        
            var cachedItems = callCycleEditCachedItems();

            var selectedDayIndex = $(this).val();

            $.each(cachedItems, function (i, cachedItem) {

            if (callCycleEditItemKey(cachedItem) == callCycleEditItemKey(item) && (cachedItem.Week == g_callCycleEditSelectedWeek)) {

                    cachedItems[i].Changed = true;
                    cachedItems[i][g_callCycleEditDays[selectedDayIndex]] = (checked === 'checked');

//                    for (var j = 0; j < g_callCycleEditDays.length; ++j) {
//
//                        cachedItems[i][g_callCycleEditDays[j]] = (j == selectedDayIndex) ? (checked == "checked") : false;
//                    }

                    callCycleEditSetCachedItems(cachedItems);

                    return false;
            }
        });
        
    });	
}

function callCycleEditRowHtml(rowIndex, item) {

	var html = 	'<li id="' + callCycleEditItemKey(item) + '">' +
				'<table class="callcycle">' +
				'<tr>' +
				'<td class="name">' + item.Name + '</td>' +
				'<td class="delete"><a id="delete" href="#" data-role="button" data-inline="true" onclick="callCycleEditDeleteCustomer(\'' + 
				callCycleEditItemKey(item) + '\')">Delete</a></td>';
	
	for ( var i = 0; i < g_callCycleEditDays.length; ++i) {
		
		html += '<td class="day">' + '<input class="exclusive' + rowIndex + 
									 '" value="'+ i + '" type="checkbox"' + (item[g_callCycleEditDays[i]] ? ' checked' : '') + 
									 '>' + '</td>';
	}
	
    html += '</tr>' +
			'</table>' +
			'</li>';
	
	return html;
}

function callCycleEditFetchCustomers() {
	
	$.mobile.showPageLoadingMsg();
	$('#callCycleEditCustomerList').empty();
	$('#refinesearch').hide();
	var searchText = $('#search').val().toLowerCase();
	var customerListHtml = '';
	g_callcycleedit_custcount = 0;
	var dao = new Dao();
	dao.cursor('Companies',
			undefined, 
			undefined,
			function(company) {			
				var customerInfo = company.Name + (company.BranchID ? '[' + company.BranchID + ']' : '');
				if (g_callcycleedit_custcount > 30) 
					return;
				if ((customerInfo.toLowerCase().indexOf(searchText) != -1) && jQuery.inArray(company.key, g_callCycleEditVisibleCustomerKeys) == -1) {
					if ((g_vanSales && (company.BranchID.toLowerCase() == g_currentUser().RepID.toLowerCase())) || !g_vanSales)
						customerListHtml += '<li data-theme="c"><a>' + customerInfo + '</a><a id="add-' + company.key + 
											'" data-role="button" onclick="callCycleEditAddCustomer(\'' + company.key + '\')">Add</a></li>';
					g_callcycleedit_custcount++;
				} 	
				if (g_callcycleedit_custcount == 30) 
					$('#refinesearch').show();
			},
			undefined,
			function(event) {
			    g_append('#callCycleEditCustomerList', customerListHtml);
				//$('#callCycleEditCustomerList').append(customerListHtml);
				$('#callCycleEditCustomerList').listview('refresh');
				$.mobile.hidePageLoadingMsg();
			}	
		);
}

function callCycleEditAddCustomer(key) {
	
	var dao = new Dao();
	
	dao.get('Companies',
			key,
			function(company) {
				
				var isItemAlreadyCached = false;
				
				var cachedItems = callCycleEditCachedItems();

				$.each(cachedItems, function (i, item) {
			    	
			    	if ((callCycleEditItemKey(item) == key) && (item.Week == g_callCycleEditSelectedWeek)) {
			    		
			    		isItemAlreadyCached = true;
			    		cachedItems[i].Deleted = false;
			    		cachedItems[i].Changed = true;
			    		
						for (var j = 0; j < g_callCycleEditDays.length; ++j)
							cachedItems[i][g_callCycleEditDays[j]] = false;
			    		
			    		return false;
			    	}
			    });
				
				if (!isItemAlreadyCached)  {
					
					var callCycleInfo = new Object();
					
					callCycleInfo.AccountID = company.AccountID;
					callCycleInfo.BranchID = company.BranchID;
					callCycleInfo.Name = company.Name;
					callCycleInfo.Deleted = false;
					for (var i = 0; i < g_callCycleEditDays.length; ++i)
						callCycleInfo[g_callCycleEditDays[i]] = false;
					
					callCycleInfo.Week = g_callCycleEditSelectedWeek;
					
					callCycleInfo.SupplierID = company.SupplierID;
					callCycleInfo.UserID = g_callCycleCurrentUserID;
					
					callCycleInfo.Changed = true;
				
					cachedItems.push(callCycleInfo);
				}
				
				$('.callcycleeditPopupInfo').text('Customer ' + company.Name + ' is added.');
				
	    		callCycleEditSetCachedItems(cachedItems);
	    		callCycleEditLoadReport();
				callCycleEditFetchCustomers();
			},
			undefined,undefined);
}

function callCycleEditDeleteCustomer(key) {
	
	var keyIndex = jQuery.inArray(key, g_callCycleEditVisibleCustomerKeys);
	g_callCycleEditVisibleCustomerKeys.splice(keyIndex, 1);
	
	var cachedItems = callCycleEditCachedItems();
	
    $.each(cachedItems, function (i, item) {
    	
    	if ((callCycleEditItemKey(item) == key) && (item.Week == g_callCycleEditSelectedWeek)) {
    		
    		cachedItems[i].Deleted = true;
    		cachedItems[i].Changed = true;
    		callCycleEditSetCachedItems(cachedItems);
    		
    		return false;
    	}
    });
    
    callCycleEditLoadReport();
}

function callCycleEditSave() {
	
	var changedItems = [];
	
	var cachedItems = callCycleEditCachedItems();
	
    $.each(cachedItems, function (i, item) {
    	
    	if (item.Changed && (item.Week == g_callCycleEditSelectedWeek)) {
    		
    	    item.UserID = g_callCycleCurrentUserID;
    	   
    		delete cachedItems[i].Changed;
    		changedItems.push(item);
    	}
    });
    
    callCycleEditSetCachedItems(cachedItems);
    
//    g_saveObjectForSync(changedItems, createId(), "CallCycle", "ModifyAll");
    
    var callCycleInfo = new Object();
    
    callCycleInfo.Table = "CallCycle";
    callCycleInfo.Method = "ModifyAll";
    callCycleInfo.json = JSON.stringify(changedItems);
    var url = g_restUrl /*'http://192.168.1.106/RapidTradeRest/'*/ + 'post/post.aspx';
    
    var success = function () {

    	callCycleEditSaveOnSuccess();
    };
    
    var error = function (e) {
        if (e.status == 200 || e.status == 0) {
        	
        	callCycleEditSaveOnSuccess();

        } else {
            g_alert('ERROR: Changes are not saved.');
        }
    };
   
    g_ajaxpost(jQuery.param(callCycleInfo), url, success, error);
}

function callCycleEditSaveOnSuccess() {
	
    if (!g_syncDao)
            g_syncDao = new Dao();

    syncFetchTable(g_currentUser().SupplierID, g_callCycleCurrentUserID, 'CallCycle', 'Sync', syncFetchLastTableSkip('CallCycle'));
    
    g_alert('Changes are saved.');
}

function callCycleEditCachedItems() {
	return JSON.parse(sessionStorage.getItem('CallCycleCache'));
}

function callCycleEditSetCachedItems(items) {
	
	for ( var item in items)
		callCycleEditSetBranchID(item);
	
	sessionStorage.setItem('CallCycleCache', JSON.stringify(items));
}

function callCycleEditItemKey(item) {
	
	callCycleEditSetBranchID(item);
	
	return item.SupplierID + item.AccountID + item.BranchID;
}

function callCycleEditSetBranchID(item) {
	item.BranchID = item.BranchID || g_callCycleBranchID;
}