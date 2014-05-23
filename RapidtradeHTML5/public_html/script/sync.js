
//**********************************************************************************
var g_syncSupplierID;
var g_syncUserID;
var g_syncTables = [];
var g_syncPosted = [];
var g_syncCount = 0;
var g_syncDao = undefined;
var g_syncNumRows = 300;
var g_syncStopSync = false;

var g_syncIsOrderPosted = false;
var g_syncLastUserID = '';
var g_syncPricelistSyncMethod = 'Sync5';
var g_syncLivePricelist = false;
var g_syncDownloadOrderURL = '';
var g_syncDownloadOrderType = '';

/*
 * In doc ready, always call openDB first.
 * openDB will call init()
 */
function syncOnPageShow() {
	//first open database and it will call init
	g_syncDao = new Dao();
	g_syncDao.openDB(function(user) {
					syncInit();	
				});
	
	syncBind();
}

/*
 * All binding to buttons etc. should happen in the function() method
 */
function syncBind() {
   
	$('#syncButton').unbind();
 	$('#syncButton').click(function( event ) {
        			syncFetchUser();	
       			}); 	
 	
 	$('#signinagain').unbind();
 	$('#signinagain').click(function(event){
 		
				 		g_syncIsOrderPosted = false;
				 		g_syncLastUserID = '';
				 		g_syncPricelistSyncMethod = 'Sync5';
				 		g_syncLivePricelist = false;

 						syncDeleteDB();
 					});

 	$('#password').unbind();
 	$("#password").keypress(function (event) {
 	 
 	    var keycode = (event.keyCode ? event.keyCode : event.which);
 	    if (keycode == '13') {
 	        if (!(/MSIE (\d+\.\d+);/.test(navigator.userAgent)))
 	        	syncFetchUser();
 	    }
 	});

 	$('#syncMenu').unbind();
 	$('#syncMenu').click(function (event) {

       g_loadMenu();
   });
}


/*
 * The init method is either the 2nd method to be called after openDB 
 */
function syncInit() {
	// since indexDB works on async methods, we will replicate that in our DAO
	// Below 'userreadok' is defined in the DAO as the event raised when a user is read OK
	// its important to unbind there after
	g_syncDao.get('Users', 'user',
			function(user) {
				$('#userid').val(user.UserID);
				$('#userid').addClass('ui-disabled');
			},
			function(user) {
				g_syncIsFirstSync = true;
				$('#userid').removeClass('ui-disabled');
			},
			undefined);
	
	//disable login again button
	var dao = new Dao();
	var unsent = false;
	dao.cursor('Unsent', undefined, undefined,
            function (event) {
                unsent = true;
            },
            undefined, 
            function (event) {
                  if (unsent) 
                	  $('#signinagain').addClass('ui-disabled');
            });
	
}

/*
 * Anytime we fetch data from the server, it should always be in a fetch<xxxx>...
 */
function syncFetchUser() {
	g_syncStopSync = false;
    $.mobile.showPageLoadingMsg();
	$.support.core = true;
	$.mobile.allowCrossDomainPages = true;
	$.mobile.pushState = false;
	 
	$('#message').text('Please wait, verifying your userid');
	$('#syncimg').attr('src','img/Sand-Timer-48.png');
	g_syncUserID = $('#userid').val();
	var userPassword = $('#password').val();
	var url = g_restUrl + 'Users/VerifyPassword?userID=' + g_syncUserID + '&password=' + userPassword + '&format=json';
	var success = function (json) {
	    var status = Boolean(json.Status);
	    if (status) {
	        g_syncSupplierID = json.UserInfo.SupplierID;
	        if (json.UserInfo.UserID != g_syncLastUserID) {
	            syncSaveUser(json.UserInfo);
	            g_syncLastUserID = json.UserInfo.UserID;
	        } else {
	            syncTryToPostData();
	        }
	    } else {
	        $.mobile.hidePageLoadingMsg();
	        g_alert('Wrong password...');
	        $('#syncimg').attr('src', 'img/info-48.png');
	        $('#message').text('Enter your password and click OK');
	    }
	};
	var error = function (e) {
	    console.log(e.message);
	};

	g_ajaxget(url, success, error);
}

/*
 * Collect the data to be posted into an array
 */

function syncFetchPostData() {

    g_syncPosted = [];
    g_syncDao.cursor('Unsent', undefined, undefined,
               function (jsonRow) {
                   g_syncPosted.push(jsonRow);
               },
               undefined,
               function (event) {
                   if (g_syncPosted.length > 0)
                       syncPostData(0);
                   else {
                	   syncAll();
//                       $('#syncimg').attr('src', 'img/Tick-48.png');
//                       $('#message').text('Sync completed OK. Click Next button to continue');
//                       $('#results tbody tr:last td').text('No unsent data');
//                       $.mobile.hidePageLoadingMsg();
                   }
               });
}

/*
 * Posts 1 row at a time to the server
 */
function syncPostData(index) {
	
    $('#Table').val(g_syncPosted[index].Table);
    $('#Method').val(g_syncPosted[index].Method);
    $('#json').val(JSON.stringify(g_syncPosted[index].JsonObject));
    
    var postData = $('#sendForm').serialize();
    
    var success = function () {
        syncPostedOK(index);
    };
    var error = function (e) {
        if (e.status == 200 || e.status == 0) {
            success();
        } else {
            console.log('error');
        }
    };
    
    var orderExistsOnSuccess = function(json) {
    	
    	(json._Status == true) ? syncPostedOK(index) : orderExistsOnError();    			
    };
    
    var orderExistsOnError = function() {
    	
		g_append('#results tbody', '<tr><td>Error: order not verified.</td></tr>');
		
		if (json._Errors[0])
			g_append('#results tbody', '<tr><td>' + json._Errors[0] + '</td></tr>');
		
		$.mobile.hidePageLoadingMsg();
		$('#message').text('Sync completed. Click Next button to continue');
    };
    
    var postOrderOnSuccess = function() {
    	
    	var url = DaoOptions.getValue(g_orderHeaderOrder.Type + 'ExistsURL');
    	
    	if (!url)
    		url = g_restUrl + 'Orders/Exists';
    	
    	g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json', orderExistsOnSuccess, orderExistsOnError);

    };
    
    var url = g_restUrl + 'post/post.aspx';
    
    if (g_syncPosted[index].Table == 'Orders') {  
    	
    	success = postOrderOnSuccess;
    	
        if (DaoOptions.getValue(g_syncPosted[index].JsonObject.Type + 'LiveURL'))
            url = DaoOptions.getValue(g_syncPosted[index].JsonObject.Type + 'LiveURL');
    }
    
    var saveInvoiceNumberOnSuccess = function(json) {
    	(json._Status == true) ? syncPostedOK(index) :saveInvoiceNumberOnError();
    };
    
    var saveInvoiceNumberOnError = function() {
    	
		g_append('#results tbody', '<tr><td>Error: The last invoice number not sent.</td></tr>');
		
		$.mobile.hidePageLoadingMsg();
		$('#message').text('Sync completed. Click Next button to continue');
    };
    
    if ((g_syncPosted[index].Table == 'Options') && (g_syncPosted[index].Method == 'QuickModify')) {
    	
    	var lastInvoiceNumberOption = g_syncPosted[index].JsonObject;
    	
    	g_ajaxget(g_restUrl + 'Options/QuickModify?supplierID=' + lastInvoiceNumberOption.SupplierID + 
    			'&name=' + lastInvoiceNumberOption.Name + '&group=' + lastInvoiceNumberOption.Group + 
    			'&otype=' + lastInvoiceNumberOption.Type + '&value=' + lastInvoiceNumberOption.Value, 
    			
    			saveInvoiceNumberOnSuccess, saveInvoiceNumberOnError);
    	
    	return;
    }
    	
    	
    g_ajaxpost(postData, url, success, error);
}

/*
 * Data posted OK, so post the next index
 */
function syncPostedOK(index){
	
    if (!g_syncIsOrderPosted && g_syncPosted[index].Table == 'Orders')
            g_syncIsOrderPosted = true;
		
    if ('POD' == g_syncPosted[index].JsonObject.Type) {
    	
    	g_acceptDelivery(g_syncPosted[index].JsonObject, function() {
    		localStorage.removeItem('CacheDeliveryOrders');
    	});
    }

	$('#results tbody tr:last td').text((index + 1) + ' of ' + g_syncPosted.length + ' rows sent OK' );

	if (index == (g_syncPosted.length - 1)){
		
		if (g_syncIsOrderPosted)
			sessionStorage.setItem('HistoryCacheAccountID', '');	
		
		g_syncDao.clear('Unsent');
		syncAll();
		
//		console.log('===== Sync completed OK =====');
//		g_syncDao.clear('Unsent');
//		$('#syncimg').attr('src','img/Tick-48.png');
//		$('#message').text('Sync completed OK. Click Next button to continue');
//		
//		$.mobile.hidePageLoadingMsg();
		
	} else {
		index = index + 1;
		syncPostData(index);
	}
}

/*
 * Set up our synchronization
 */
function syncAll() {
	 
    localStorage.setItem('lastSyncDate', g_today());

    $('#userid').addClass('ui-disabled');
    $('#message').text('Please wait, downloading latest data');

    g_syncTables = [];
    g_syncCount = 0;
    
    if (localStorage.getItem('lastSyncDate') != g_today()) {
        
        g_syncDao.clear('Orders');
        g_syncDao.clear('OrderItems');
    }

    syncAddSync(g_syncSupplierID, null, 'Options', 'Sync2', 0);
    syncAddSync(g_syncSupplierID, null,'DisplayFields','Sync2', 0);
    
    syncAddSync(g_syncSupplierID, g_syncUserID, 'ActivityTypes', 'Sync4', 0);
    syncAddSync(g_syncSupplierID, g_syncUserID, 'Contacts', 'Sync2', 0);
    syncAddSync(g_syncSupplierID, g_syncUserID, 'CallCycle', 'Sync', 0);
    syncAddSync(g_syncSupplierID, g_syncUserID, 'Companies','Sync2', 0);
    syncAddSync(g_syncSupplierID, g_syncUserID, 'Stock', 'Sync4', 0);    
    syncAddSync(g_syncSupplierID, g_syncUserID, 'Pricelists', 'Sync5', 0);
    syncAddSync(g_syncSupplierID, g_syncUserID, 'Address', 'Sync4', 0);
    
    if (g_vanSales) {
    	
        syncAddSync(g_syncSupplierID, g_syncUserID, 'Discount', 'Sync4', 0);
        syncAddSync(g_syncSupplierID, g_syncUserID, 'DiscountCondition', 'Sync4', 0);
        syncAddSync(g_syncSupplierID, g_syncUserID, 'DiscountValues', 'Sync4', 0);
    }
       
    var item = g_syncTables[g_syncCount];
    syncTableCount = 0;
    syncFetchTable(item.supplierid,item.userid,item.table,item.method,syncFetchLastTableSkip(syncGetLocalTableName(item.table, item.method)));

    sessionStorage.setItem('cacheMyTerritory', null);
    sessionStorage.setItem('cachePricelist', null);
    $('#signinagain').removeClass('ui-disabled');
}

/*
 * add the sync required
 */
function syncAddSync(supplierid, userid, table, method){
    
    var syncTable= {};
    syncTable.supplierid = supplierid;
    syncTable.userid = userid;
    syncTable.table = table;
    syncTable.method = method;
    g_syncTables.push(syncTable);
}

function syncGetLocalTableName(table, method) {
    
    return ('Orders' == table) && ('GetOrderItemsByType3' == method) ? 'OrderItems' : table;
}

/*
 * Fetch method to get each individual table from the server
 */
function syncFetchTable(supplierid, userid, table, method, skip, onSuccess) {
		
    // due the optional table sync, we always need to sync all data from Options table

    var version = ('Options' == table) ? 0 : syncFetchLastTableVersion(syncGetLocalTableName(table, method));

    var userParameter = '';

    if (userid) 
        userParameter = '&userID=' + userid;

    if ('Pricelists' == table)
        method = g_syncPricelistSyncMethod;

    var url = ('Orders' == table ? (g_syncDownloadOrderURL || DaoOptions.getValue('DownloadOrderURL')) + '/rest/' : g_restUrl)  + table + '/' + method +
                                                    '?supplierID=' + supplierid + 
                                                     userParameter + 
                                                    '&version=' + version + 
                                                    '&skip=' + skip + 
                                                    ('Orders' == table ? '&orderType=' + g_syncDownloadOrderType : '') +
                                                    (('Orders' == table) && g_currentCompany() ? '&accountID=' + g_currentCompany().AccountID : '') +
                                                    ('Orders' == table ? '&CallWeekNumber=' + g_currentCallCycleWeek() : '') +
                                                    ('Orders' == table ? '&CallDayOfWeek=' + todayGetCurrentDay() : '') +
                                                    '&top=' + g_syncNumRows + '&format=json';
    console.log(url);
    var success = function (json) {
        syncSaveToDB(json, supplierid, userid, version, table, method, skip);
        
        if (onSuccess)
            onSuccess();
    };

    var error = function (e) {
        console.log(e.message);
    };

    g_ajaxget(url, success, error);	
}

/*
 * return the last succesfull version for this table
 */
function syncFetchLastTableVersion(table){
	var lastversion = localStorage.getItem('lastversion' + table);
	if (lastversion == null) 
		lastversion = 0;
	if (isNaN(lastversion))
		lastversion = 0;
	
	return parseInt(lastversion);
}

/*
 * Store's the last page returned so we can restart from that point 
 */
function syncFetchLastTableSkip(table) {
	
	// due the optional table sync, we always need to sync all data from Options table
	if ('Options' == table)
		return 0;
	
	var lastskip = localStorage.getItem('lastSkip' + table);
	if (lastskip == null) 
		lastskip = 0;
	return parseInt(lastskip);
}


function syncNextItem() {
	
	g_syncCount++;
	
	if (g_syncLivePricelist && g_syncTables[g_syncCount]) {
		
		//skip Pricelists and Stock table		
		while (('Pricelists' == g_syncTables[g_syncCount].table) || ('Stock' == g_syncTables[g_syncCount].table))
			g_syncCount++;
	}
	
	return g_syncTables[g_syncCount];	
}

/*
 * Any time we save data, it needs to be in a save<...> method
 * This method saves the sync data to local database
 */
function syncSaveToDB(json, supplierid, userid, version, table, method, skip) {
	
    if (g_syncStopSync==true) 
        return;

    localStorage.setItem('lastSkip' + syncGetLocalTableName(table, method), skip);
    
    if ('Orders' == table)
        json._Items = json;

    if (json._Items == null) {

        //this table sync is finished, so check if we need more downloads of this table
        g_append('#results tbody', '<tr><td> ' + table + ' - up to date</td></tr>');
		//$('#results tbody').append('<tr><td> ' + table + ' - up to date</td></tr>');
    	syncSetLastVersion(table, json._LastVersion);
		
    	if ((g_syncTables.length == (g_syncCount + 1))) { //completed the SYNC

		console.log('===== Sync completed OK =====');
	        $('#syncimg').attr('src', 'img/Tick-48.png');
	        $('#message').text('Sync completed OK. Click Menu button to continue');
	        $.mobile.hidePageLoadingMsg();
		  
		} else {	// go on to the next table
			var item = syncNextItem();
			if (item) syncFetchTable(item.supplierid,item.userid,item.table,item.method,syncFetchLastTableSkip(syncGetLocalTableName(item.table, item.method)));
			return;
		}
	} else if (/*('Orders' === table) || */((json._Items.length ) < 100 && (table != 'Pricelists'))) {
	    //less than 250 records, so move on to the next sync, except pricelist, dont always get back 250
	    $('#results tbody tr:last td').text(syncGetLocalTableName(table, method) + ' (' + (skip + json._Items.length) + ') downloaded');
	    syncSetLastVersion(syncGetLocalTableName(table, method), 'Orders' === table ? 0 : json._LastVersion);
            
	    if ((g_syncTables.length == (g_syncCount + 1))) {

		console.log('===== Sync completed OK =====');
                $('#syncimg').attr('src', 'img/Tick-48.png');
                $('#message').text('Sync completed OK. Click Menu button to continue');
                $.mobile.hidePageLoadingMsg();
	    	
	    } else {
	        //do the next table
	        var item = syncNextItem();
	        try {
		        g_append('#results tbody', '<tr><td> Fetching new ' + syncGetLocalTableName(item.table, item.method) + '...</td></tr>');
		        //$('#results tbody').append('<tr><td> Fetching new ' + item.table + '...</td></tr>');
		        syncFetchTable(item.supplierid, item.userid, item.table, item.method, syncFetchLastTableSkip(syncGetLocalTableName(item.table, item.method)));	        	
	        } catch(err) {
	        	console.log('Skipping');
	        }
	    }
	} else {
	        //get the next 250 records for the table
	        $('#results tbody tr:last td').text(syncGetLocalTableName(table, method) + ' (' + (skip + json._Items.length) + ') downloaded');
	        syncFetchTable(supplierid, userid, table, method, skip + g_syncNumRows); //get next 250 records	    
	}
	
    try {
    	
        if (json._Items != null) {
        	
            $.each(json._Items, function (i, item) {
            	
                if (table == "Options") {
                	
                    if (!g_vanSales && (item.Name == 'LocalDiscounts') && (item.Value == 'true')) {
                    	
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'Discount', 'Sync4', 0);
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'DiscountCondition', 'Sync4', 0);
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'DiscountValues', 'Sync4', 0);
                    }
                    
                    if (item.Name == 'DownloadOrderURL')
                        g_syncDownloadOrderURL = item.Value;
                    
                    if (item.Name == 'DownloadOrderType')
                        g_syncDownloadOrderType = item.Value;
                    
                    if (item.Name == 'AllowMasterChartDownload') {
                    
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'Orders', 'GetCollectionByType3', 0);
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'Orders', 'GetOrderItemsByType3', 0);
                    }
                    
                    if (item.Name == 'MobileOnlinePricelist')
                    	g_syncLivePricelist = (item.Value == 'true');
                    
                    if (((item.Name == 'AllowAdvancedSearch') || (item.Name == 'MobileCategories')) && (item.Value == 'true'))                    	
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'ProductCategories2', 'Sync2', 0);
                     
                    if ((item.Name == 'AllowAdvancedSearch') && (item.Value == 'true'))
                        syncAddSync(g_syncSupplierID, g_syncUserID, 'ProductCategory2Link', 'Sync', 0);
                    
                    if (item.Name == 'PricelistSyncVersion')                    	
                    	g_syncPricelistSyncMethod = item.Value;
                    
                    if (item.Name == 'AccountSortField') {
                    	
                    	g_myterritorySortField = item.Value;
                    	
                    	if (g_indexedDB) {
                    		
                    		var request = window.indexedDB.open("RapidTrade12", 15);
                    		
                    		request.onsuccess = function (event) {
                    			
                                db = request.result;
                                
    	                    	var transaction = db.transaction('Companies');
    	                        var objectStore = transaction.objectStore('Companies');
    	                        objectStore.createIndex(g_myterritorySortField, g_myterritorySortField, { unique: false });
                            };
                    	}
                    }
                    
                    
                    if (item.Name == 'PriceListSortField') {
                    	
                    	g_pricelistSortField = item.Value;
                    	
                    	if (g_indexedDB) {
                    		
                    		var request = window.indexedDB.open("RapidTrade12", 15);
                    		
                    		request.onsuccess = function (event) {
                    			
                                db = request.result;
                                
    	                    	var transaction = db.transaction('Pricelists');
    	                        var objectStore = transaction.objectStore('Pricelists');
    	                        objectStore.createIndex(g_pricelistSortField, g_pricelistSortField, { unique: false });
                            };
                    	}
                    }
                }
                
                if ('DeliveryOrderType' == item.Name)
                	g_menuGRVLabelText = 'Deliveries';
            });
            
            table = syncGetLocalTableName(table, method);
            
            if (g_indexedDB) {

                $.each(json._Items, function (i, item) {

                    if ((table == "DisplayFields" && item.Visible == true) || table != "DisplayFields"){     

                            item.key = syncGetKeyField(item, table);

                        if ((item.Deleted != null && item.Deleted == false) || !item.Deleted) {
                            g_syncDao.put(item, table, item.key);		                
                        } else {
                            g_syncDao.deleteItem(table, item.key, undefined, undefined, undefined, undefined);			            	
                        };
                    };


                });
            } else {

                g_syncDao.sqlputMany(json._Items, table,
                                undefined,
                        function (tx) {
                            g_alert('Error on download, can\'t continue: ' + tx.message);
                            g_syncStopSync = true;
                            $.mobile.hidePageLoadingMsg();
                        });

            };
        };


	} catch (err) {	
		
		g_alert('Error opening transaction' + err.message);
		return;
	}
}

function syncTryToPostData() {
	
	$('#results tbody').empty();
	
	if (!g_syncIsFirstSync) {
		
	    $('#message').text('Please wait, sending your data');
	    g_append('#results tbody', '<tr><td>Reading...</td></tr>');
	    //$('#results tbody').append('<tr><td>Reading...</td></tr>');
	    syncFetchPostData();
	    
	} else {
		
		syncAll();
//		console.log('===== Sync completed OK =====');
//        $('#syncimg').attr('src', 'img/Tick-48.png');
//        $('#message').text('Sync completed OK. Click Menu button to continue');
//        $.mobile.hidePageLoadingMsg();
	}
}

function syncSetLastVersion(table, version){
	
    localStorage.setItem('lastversion' + table, version);
    localStorage.removeItem('lastSkip' + table);
}


/*
 * Builds a key field for each table type
 */
function syncGetKeyField(item, table) {
	
	var keyf = '';
	
	switch (table) {
	
	case "Companies": 
		keyf = item.SupplierID + item.AccountID + item.BranchID;
		break;
		
	case "DisplayFields": 
		keyf = item.SupplierID + item.ID + item.Name;
		break;
		
	case "Options": 
		keyf = item.SupplierID + item.Name;
		break;
		
	case "ActivityTypes": 
		keyf = item.SupplierID + item.EventID;
	    break;
	    
	case "Contacts": 
		keyf = item.SupplierID + item.AccountID + item.Counter;
	    break;
	    
	case "Pricelists": 
		keyf = item.id + item.pl;
	    break;
	    
	case "CallCycle": 
		keyf = item.SupplierID + item.AccountID + item.Week;
	    break;
	    
	case "Discount": 
		keyf = item.SupplierID + item.DiscountID;
	    break;
	    
	case "DiscountCondition": 
		keyf = item.SupplierID + item.DiscountID + item.DiscountConditionID;
	    break;
	    
	case "DiscountValues": 
		keyf = item.SupplierID + item.DiscountID + item.AccountID + item.Category + item.ProductID + item.BranchID + item.AccountGroup + item.Usefield01 + item.Usefield02 + item.Usefield03 + item.Usefield04 + item.Usefield05+ item.QtyLow+ item.QtyHigh;
	    break;
	    
	case "Address": 
		keyf = item.SupplierID + item.AccountID + item.AddressID;
	    break;
	    
	case "Stock": 
		keyf = item.SupplierID + item.ProductID + item.Warehouse;
	    break;
	
	case "ProductCategories2":
		keyf = item.s + item.c;
		break;
		
	case "ProductCategory2Link":
		keyf = item.s + item.p;
		break;
                
        case "Orders":
            keyf = item.SupplierID + item.OrderID;
            break;
        
        case "OrderItems":
            keyf = item.SupplierID + item.OrderID + item.ItemID;
            break;        
	}
	
	return keyf.trim();
}


/*
 * save<...> methods are used to save data and they should either call a REST service or dao.modify() method
 */
function syncSaveUser(json) {

	g_syncDao.put(json,'Users', 'user',
			function(user) {
				syncTryToPostData();
			});
}

/*
 * save<...> methods are used to save data and they should either call a REST service or dao.modify() method
 */
function syncDeleteDB() {
	
	g_syncDao.deleteDB(function() {
					g_syncIsFirstSync = true;
					g_syncLastUserID = '';
					$('#userid').val('');
					$('#password').val('');
					$('#results tbody').empty();
					
					g_syncDao.openDB(function() {
									g_alert('User deleted, please sign in with a new user.');
									$('#userid').removeClass('ui-disabled');
									$('#syncimg').attr('src', 'img/info-48.png');
									$('#message').text('Enter your password and click OK');
								});
				});
}

