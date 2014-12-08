
/*
 * all global variables must start with a g_
 */

var g_logo = 'img/rapidtrade-logo-small.png';
//var g_logo = "img/SGlogoSml.png";

//var g_url = "http://www.dedicatedsolutions.co.za:8082/";
//var g_restUrl = g_url + "rest2/";
//var g_restUrl = g_url + "testrest/";
//var g_vanSales = true;
//var g_restPHPUrl = "www.super-trade.co.za:8083/rest/index.php";


var g_url = "https://app.rapidtrade.biz/"; 
var g_restUrl = g_url + "rest/";
var g_vanSales = false;
var g_restPHPUrl = "http://107.21.55.154/rest/index.php/";

var g_indexedDB;
var g_defaultDisplayFields = [];
var g_builtInScanner = false;
var g_translations = {};

//phonegap functions
var g_scandit = false;
var g_canTakePhoto = false;
var g_phonegap = false;
var g_deviceVersion;
var g_smp = false;  //only set to true if running on SMP platform
var g_smpUser = '';
var g_smpResult;

/*
 * Call cycle variables
 */
var g_callCycleCurrentUserID;

/*
 * Company variables
 */
var g_companyPageTranslation = {};

/*
 * Pricelist variables
 */
var g_pricelistItemsHtml = '';
var g_pricelistCurrentPricelistPage = 1;
var g_pricelistSearchPricelistText;
var g_pricelistNumerOfIteminPricelist = 0;
var g_pricelistTop = 50;
var g_pricelistItemsOnPage;
var g_pricelistCurrentBasket = [];
var g_pricelistSortField = 'des';

/*
 * Discount variables
 */

var g_discounts = [];
var g_discountConditions = [];

/*
 * My territory variables
 */
var g_myterritoryCurrentMyterritoryPage = 1;
var g_myterritoryNumerOfIteminMyterritory = 0;
var g_myterritoryTop = 50;
var g_myterritoryItemsOnPage;
var g_myterritorySearchMyTerritoryText;
var g_myterritorySortField = 'Name';

/*
 * Order Header variables
 */
var g_orderheaderStocks = [];
var g_orderheaderOrderType;
var g_orderheaderCallReduceStock = false;

/*
 * GRV variables
 */
var g_grv_replorderid;
var g_grvCachedBasketItems = [];
/*
 * 
 */
var g_callcycleedit_custcount = 0;

/*
 * Sync variables
 */
var g_syncIsFirstSync = false;

/*
 * Menu variables
 */
var g_menuGRVLabelText = 'Receive my stock';

/*
 * Stock variables
 */
var g_stockDescriptions = {'-9999': 'N/A', '-9998': 'Back Order'};

/*
 * global functions
 */

function g_phonegapon(onComplete){
    try {
        $('#status').text('Ready');
        g_phonegap = true;
        g_canTakePhoto = true;
        g_scandit = true;
        g_deviceVersion = parseFloat(window.device.version);
        $('#status').text('Device ready ' + g_deviceVersion);
        if (!sap) {
            onComplete();
        } else {
            g_smpon(onComplete);
        }
        
    } catch (err){
            $('#status').text(err.message);
    }
}

function g_smpon(onComplete){
    alert('in g_smpon');
    g_smp = true;
    $('#smpstatus').text('Checking SMP');
    smp.getInstance().logon(
                    function(msg) { $('#smpstatus').text(msg);},
                    function(smpUser) {
                        g_smpUser = smpUser;
                        $('#smpstatus').text('Logged in to SMP'); 
                        onComplete();
                    }
                );
}

function g_isiPad() {
	
	var userAgent = navigator.userAgent;
	return /iPad/i.test(userAgent) || /iPhone OS 3_1_2/i.test(userAgent)
			|| /iPhone OS 3_2_2/i.test(userAgent);
}


function g_isIOS7(){
    if (g_phonegap == false) return
    if (parseFloat(window.device.version) > 6.0) {
    	g_iPadBar('#menupage');
        return true;
    } else {
        return false;
    }
}

/*
 * Below is to add 20px onto screens as on IOS7 jquerymobile does not deal with the to bar.
 */
function g_iPadBar(panel){
	if (g_phonegap == false) return
    if (parseFloat(window.device.version) > 6.0) {
    	$(panel).addClass('ipadStatusBar');
    }
}

function g_checkUsageMode() {

    $("#mode option").filter(function() {        	
        return $(this).attr('value') === localStorage.getItem('usageMode');
    }).attr('selected', true);

    $('#mode').selectmenu('refresh');
    
    $('#mode').off().on('change', function() {
       
        localStorage.setItem('usageMode', $(this).val());
        $('#mode').selectmenu('refresh');
    });    
}

function g_loadMenu() {

    $.mobile.changePage('index.html');
    
    //commented out because it doesn't work well when translations are used 
  
//	if (g_isiPad() || window.MSApp) {
//		
//		$.mobile.changePage('index.html');
//		
//	} else {
//		
//		var menuPageUrl = navigator.userAgent.match(/Android/i) ? 'index.html'
//				: location.href
//						.substring(0, location.href.lastIndexOf('/') + 1);
//		$.mobile.changePage(menuPageUrl);
//	}
}

function g_menuBind() {
	
	$('#menuButton').unbind();
	$('#menuButton').click(function() {
		
            if ($.mobile.activePage.attr('id') !== 'companypage')    
		g_loadMenu();
	});
}

function g_isScreenSmall() {
	return $(document).width() < 550;
}

function g_currentUser() {
	return JSON.parse(sessionStorage.getItem('currentUser'));
}

function g_currentCompany() {
	return JSON.parse(sessionStorage.getItem('currentCompany'));
}

/*
 * If we force a user to a particular branch/warehouse
 */
function g_currentBranch(){
    
    if (DaoOptions.getValue('VanandWareOrder', 'false') == 'true')
        return (g_pricelistInvoiceWarehouse ? g_pricelistInvoiceWarehouse : g_currentCompany().BranchID).toUpperCase(); 
       
    if (!g_currentUser().Role) return g_currentCompany().BranchID.toUpperCase();

    var role = g_currentUser().Role.toLowerCase(); 
    if (role.indexOf('wh=') != -1){
            var wh = role.substring(role.indexOf('wh=')+3);
            wh = (wh.indexOf(',') != -1 ) ? wh.substring(0,wh.indexOf(',')) : wh;
            return wh.toUpperCase();
    } else {
            return g_currentCompany().BranchID.toUpperCase();
    }
	
}


function g_currentProduct() {
	return JSON.parse(sessionStorage.getItem('currentProduct'));
}

function g_showCurrentCompanyName() {
    $('.companyName').text(g_currentCompany().Name);
}

function g_vat() {
		
    return (DaoOptions.getValue('taxpercent') || 14) / 100;
}

function g_isOnline(showAlert) {

    showAlert = (showAlert !== undefined) ? showAlert : true;

    if (!navigator.onLine && showAlert)
            alert('This feature is disabled in the offline mode.');

    return navigator.onLine;
}

function g_setLeadingZero(number) {
	return number < 10 ? '0' + number : number;
}

function g_isPackSizeUnitValid(unit) {
	return (DaoOptions.getValue('ForcePackSize')  == 'true') && !isNaN(unit);
}

/*
 * get current week of the year
 */
Date.prototype.getWeekOfYear = function() {
	
	var onejan = new Date(this.getFullYear(), 0, 1);
	return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
};

function g_dayOfYear() {
	
    var date = new Date();
    var onejan = new Date(date.getFullYear(), 0, 1);
	
    var JJJ = (Math.ceil((date - onejan) / 86400000)).toString();
    
    while (JJJ.length < 3)
        JJJ = '0' + JJJ;
    
    return JJJ;
};


function g_mondayOfCurrentWeek() {
	
	var date = new Date();	
	var day = date.getDay();
	var diff = date.getDate() - day + (0 == day ? -6 : 1);
    return new Date(date.setDate(diff)); // adjust when day is Sunday	
}

function g_firstMondayOfCurrentMonth() {
	
	var month = g_mondayOfCurrentWeek().getMonth();
	
	var date = new Date();
	date.setMonth(month, 1);
	
	while (date.getDay() != 1)
		date.setDate(date.getDate() + 1);
	
	return date;
}


function g_currentCallCycleWeek() {
	if (DaoOptions.getValue('WeeksInCallCycle','')=='2' )
		return (g_getWeek() % 2) + 1;
	else
		return parseInt((g_mondayOfCurrentWeek().getDate() - g_firstMondayOfCurrentMonth().getDate()) / 7, 10) + 1;
}

function g_getWeek(){
	  // Create a copy of this date object  
	  var d  = new Date();  
	  var target  = new Date();  
	  // ISO week date weeks start on monday  
	  // so correct the day number  
	  var dayNr   = (d.getDay() + 6) % 7;  
	  // Set the target to the thursday of this week so the  
	  // target date is in the right year  
	  target.setDate(target.getDate() - dayNr + 3);  
	  // ISO 8601 states that week 1 is the week  
	  // with january 4th in it  
	  var jan4    = new Date(target.getFullYear(), 0, 4);  
	  // Number of days between target date and january 4th  
	  var dayDiff = (target - jan4) / 86400000;    
	  // Calculate week number: Week 1 (january 4th) plus the    
	  // number of weeks between target date and january 4th    
	  var weekNr = 1 + Math.ceil(dayDiff / 7);    
	 
	  return weekNr;    
}

function g_saveObjectForSync(object, key, table, method, poncomplete) {

    if (('Orders' == table) && (DaoOptions.getValue('VerifyOrders') == 'true'))
        object.Status = 'Validated';

    var objectInfo = new Object();

    objectInfo.Table = table;
    objectInfo.Method = method;
    objectInfo.JsonObject = object;

    var dao = new Dao();
    dao.put(objectInfo, 'Unsent', key, poncomplete, undefined, undefined);

    if (table === 'Orders') {

        $.each(object.orderItems, function(index, item) {
            
            var key = syncGetKeyField(item, 'Stock');         

            dao.get('Stock', key, function(stockItem) {
                                
                stockItem.Stock -= item.Quantity;
                dao.put(stockItem, 'Stock', key, function() {
                    
                    console.log('Stock ' + key + ' reduced to ' + stockItem.Stock + '.');
                })
            });
        });
    }            
}

function g_today() {

	var date = new Date;
	return g_setLeadingZero(date.getMonth() + 1) + "/"
			+ g_setLeadingZero(date.getDate()) + "/" + date.getFullYear();
}

function g_markCustomerAsVisited(customerID) {

	if (g_isCustomerVisited(customerID))
		return;

	var visitedCustomers = JSON.parse(localStorage.getItem('visitedCustomers'));

	if (!visitedCustomers)
		visitedCustomers = new Object;

	if (visitedCustomers.date != g_today()) {
		visitedCustomers.date = g_today();
		visitedCustomers.list = "";
	}

	if (visitedCustomers.list)
		visitedCustomers.list += ',';

	visitedCustomers.list += customerID;

	localStorage.setItem('visitedCustomers', JSON.stringify(visitedCustomers));
}

function g_isCustomerVisited(customerID) {
	var visitedCustomers = JSON.parse(localStorage.getItem('visitedCustomers'));
	return visitedCustomers && (visitedCustomers.date == g_today())
			&& (Boolean(visitedCustomers.list.match(customerID)).valueOf());
}

function g_navigateBackFromCompanyView() {
	try {
		var target = sessionStorage.getItem('companyBack');
		if (target != undefined) {
			$.mobile.changePage(target);
		} else {
			$.mobile.changePage('company.html');
		}
	} catch (error) {
		$.mobile.changePage('company.html');
	}
}

function g_addProductToBasket(productID, supplierID, accountID, quantity,
		userID, nett, description, discount, gross, type, userField01, repNett,
		repDiscount, unit, userField02, warehouse, vat, stock, categoryName, barcode, userField03, userField04,
		userField05, userField06, userField07, userField08, userField09, userField10, userField15) {

//        nett = nett.toFixed(2);

	var repChangedPrice = repNett && (nett != repNett);
	
	var basketInfo = new BasketInfo(productID, supplierID, accountID, quantity,
			userID, nett, description, parseFloat(discount), gross, type,
			userField01, repChangedPrice,  repNett, parseFloat(repDiscount), unit, userField02, warehouse, vat, stock, categoryName, barcode,
			userField03, userField04, userField05, userField06, userField07, userField08, userField09, userField10, userField15);

	basketInfo.save();
}

function g_roundToTwoDecimals(number) {
    return parseFloat(Math.round(number * 100) / 100).toFixed(2);
}

// Clears each cache that depends on basket. This is used when basket is cleared
// and we cached html that is related to basket. As basket becomes invalid such
// cache also becomes invalid.
function g_clearCacheDependantOnBasket(resetCounter) {
	
	if (resetCounter == undefined)
		resetCounter = true;
	
	sessionStorage.setItem('cachePricelist', null);
	
	if (resetCounter)
            g_pricelistItemsOnPage = 0;
}

function g_isValidQuantityCharPressed(event, allowDecimals) {

	var keyCode = (event.keyCode ? event.keyCode : event.which);
        
        // decimal point
        if ((190 == keyCode) && ((DaoOptions.getValue('AllPartfullUnit') == 'true') || allowDecimals))
            return true;
	
	// Numeric keypad
	if ((keyCode > 95) && (keyCode < 106))
            return true;
	
	
	if (isNaN(String.fromCharCode(event.which)) || event.which == 32
			|| (event.keyCode >= 186 && event.keyCode <= 222))
		if (event.which != 8 && event.which != 9)
			return false;

	return true;
}

function g_addCommas(nStr) {

	nStr += '';
	var x = nStr.split('.');
	var x1 = x[0];
	var x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}

	return x1 + x2;
}

function g_createDefaultDisplayFields() {

	g_defaultDisplayFields = [];

	var displayFieldsInfo = [ {
		id : 'Company',
		fields : [ 'Name', 'Pricelist', 'AccountGroup' ]
	}, {
		id : 'Contact',
		fields : [ 'Name', 'Position', 'Email', 'Mobile', 'TEL' ]
	}, {
		id : 'OrderHeader',
		fields : [ 'Reference' ]
	}, {
		id : 'StatusOrderHeader',
		fields : [ 'Reference', 'Comments', 'RequiredByDate', 'ERPStatus' ]
	} ];

	for ( var i = 0; i < displayFieldsInfo.length; ++i) {

		for ( var j = 0; j < displayFieldsInfo[i].fields.length; ++j) {

			var displayField = new Object();

			displayField.ID = displayFieldsInfo[i].id;
			displayField.Name = displayFieldsInfo[i].fields[j];
			displayField.ReadOnly = false;
			displayField.SortOrder = j + 1;
			displayField.Type = 'Text';
			displayField.Visible = true;

			g_defaultDisplayFields.push(displayField);
		}
	}
}

function g_getDefaultDisplayFieldsById(id) {

    return jQuery.grep(g_defaultDisplayFields, function(field) {
        return field.ID == id;
    });
}

function g_append(element, text) {
    
    if (window.MSApp) {
        MSApp.execUnsafeLocalFunction(function() {
                $(element).append(text);
        });
    } else {
        $(element).append(text);
    }
}

function g_html(element, text) {
	if (window.MSApp) {
		MSApp.execUnsafeLocalFunction(function() {
			$(element).html(text);
		});
	} else {
		$(element).html(text);
	}

}
function g_ajaxget(url, success, error) {

    if (window.MSApp) {
            WinJS.xhr({
                    type : 'GET',
                    url : url,
                    cache : false,
                    crossDomain: true,
                    jsonpCallback : 'jsonCallback2',
                    headers : {
                            "Content-type" : "application/json",
                            "If-Modified-Since" : new Date()

                    },
                    dataType : 'jsonp',
            }).then(function complete(request) {
                    var json = JSON.parse(request.responseText);
                    success(json);
            }, function(err) {

                    error(err);
            });
    } else {  

        $.ajax({
                type : 'GET',
                url : url,
                cache : false,
                crossDomain: true,
                jsonpCallback : 'jsonCallback2',
                dataType : 'json',
                success:success,
                error:error,
                timeout: DaoOptions.getValue('AjaxTimeout', 30000)                  
        });

        /*
            $.ajax({
                    type : 'GET',
                    url : url,
                    jsonpCallback : 'jsonCallback2',
                    dataType : 'jsonp',
                    success:success,
                    timeout:10000

            }).error(function() {

                if (error)
                    error();
            });
         */

        /*
        $.get(url,undefined,success,"jsonp")
        .fail(function(p) {
                alert( "Error, you seem to be offline" );
        }).error(function() {
        alert( "Error, you seem to be offline" );
        });
        */
    }

}

function g_ajaxpost(data, url, success, error, completeF) {
	if (window.MSApp) {
		WinJS.xhr({
			type : 'POST',
			url : url,
                        cache: false,
                        crossDomain: true,
			headers : {
				"Content-type" : "application/x-www-form-urlencoded",
				"If-Modified-Since" : new Date()
			},
			data : data
		}).then(function complete(request) {
			success();

		}, function(err) {

			error(err);
		});
	} else {
		try {
                    if (completeF) {
                        $.ajax({
				type : 'POST',
				data : data,
                                cache : false,
                                crossDomain: true,
				url : url,
				success : success,
				error : error,
                                complete: completeF});//,
                                //timeout: DaoOptions.getValue('AjaxTimeout', 30000)
			//});
                    } else {
			$.ajax({
				type : 'POST',
				data : data,
                                cache : false,
                                crossDomain: true,
				url : url,
				success : success,
				error : error,
                                timeout: DaoOptions.getValue('AjaxTimeout', 30000)
			});
                    }
		} catch (error){
			alert("Oops");
		}
	}
}

function g_alert(message) {
	if (window.MSApp) {
		var md = new Windows.UI.Popups.MessageDialog(message);
		md.showAsync();
	} else {
		alert(message);
	}
}

function g_print(selector) {    
    if (g_isiPad()) {
        cordova.exec(null, null, "PrintPlugin", "print", [{'printHTML': $(selector).html()}]);
    } else {
        print();
    }
}

function g_isQuantityValid(quantity, unit) {
	
        quantity = Number(quantity);
        
	var isValid = (quantity > 0) /*&& (quantity < 10000)*/;
	
	if (isValid && g_isPackSizeUnitValid(unit)) {
		
		var remainder = quantity % unit;
		
		if (remainder) {
			
			alert('You are ordering in incorrect units. The pack size requires you to order in units of ' + unit);
			isValid = false;
		}
	}
	
	return isValid;	
}

function g_showInvoice(popupId) {
	
    var printer = localStorage.getItem('printer');
    
    var isSmallBtnHidden = $('#smallPrinterButton').hasClass('hidden');
    if (DaoOptions.getValue('HideSmallPrint') === 'true') {
        if (!isSmallBtnHidden)
            $('#smallPrinterButton').addClass('hidden');
    } else {
        if (isSmallBtnHidden)
        $('#smallPrinterButton').removeClass('hidden');
    }
    if (printer)
        $.mobile.changePage('printinvoice' + printer + '.html');
    else
        $('#' + popupId).popup('open');
}

function g_saveLostSale(productId, quantity, stock) {
	
    var activity = {};
	
    activity.EventID = createId();
    activity.Deleted = false;
    activity.EventTypeID = DaoOptions.getValue('LostSaleActivityID');
    activity.AccountID = g_currentCompany().AccountID;
    activity.SupplierID = g_currentCompany().SupplierID;
    activity.UserID = g_currentUser().UserID;
    activity.Data = productId + ';' + quantity + ';' + stock;
    activity.DueDate = moment().toDate(); 

    activity.key = g_currentCompany().SupplierID + g_currentCompany().AccountID + activity.EventID;

    g_saveObjectForSync(activity, activity.key, "Activities", "Modify", undefined);
}

function g_fetchAvailableCredit() {
	
	var onSuccess = function(json) {
		
		if (json)
                    sessionStorage.setItem(g_currentCompany().AccountID + 'AvailableCredit', json._AvailableCredit);
		else
                    console.log('No available credit fetched.');
	};
	
	var onError = function() {
		
		console.log('Error in fetching available credit');
	};
	var creditcheck = DaoOptions.getValue('LiveCreditCheckURL');
	if (creditcheck === undefined) return;
	
	var url = DaoOptions.getValue('LiveCreditCheckURL') + '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID + '&branchID=' + g_currentCompany().BranchID;

	g_ajaxget(url, onSuccess, onError);
}

function g_getDefaults(){
    
}

function g_busy(show) {
    if (show) {
        $.mobile.loading( 'show', {
                        text: 'Please wait',
                        textVisible: true,
                        textonly: false,
                        });
    } else {
        $.mobile.loading( 'hide' );
    }
}

var g_popup = (function() {
    
    var onClose;
    var clickedButtonId;
    
    return function(popupSelector) {
        
        return {            
      
            show: function(miliseconds, callback, validate) {
                
                var that = this;
                               
                onClose = callback;                

                $(popupSelector).popup('open');
                $(popupSelector).off().on('click', 'a', function() {
                    
                    clickedButtonId = this.id;
                    
                    if (!validate || validate())
                        that.hide();
                });
                
                $(popupSelector).bind({
                    
                    popupafterclose: function() { 
                        
                        if (onClose)
                            onClose();
                    }
                });

                if (miliseconds)
                    setTimeout(this.hide, miliseconds);
            },

            hide: function() {

                $(popupSelector).popup('close');                
            },
            
            clickedButton: function() {
                
                return clickedButtonId;
            }
        };
    };
})();
 

