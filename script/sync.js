
//**********************************************************************************
var g_syncSupplierID;
var g_syncUserID;
var g_syncTables = [];
var g_syncPosted = [];
var g_syncCount = 0;
var g_syncRetryCount = 0;
var g_syncDao = undefined;
var g_syncNumRows = 300;
var g_syncStopSync = false;

var g_syncIsOrderPosted = false;
var g_syncLastUserID = '';
var g_syncPricelistSyncMethod = 'Sync5';
var g_syncLivePricelist = false;
var g_syncDownloadOrderURL = '';
var g_syncDownloadOrderType = '';

var SYNC_OK_MESSAGE = 'Sync completed OK. Click Menu button to continue';
var g_syncPageTranslation = {};

function syncOnPageBeforeCreate() {

    $('.menuLogo').attr('src', g_menuLogo);
    g_syncPageTranslation = translation('syncpage');
}

/*
 * In doc ready, always call openDB first.
 * openDB will call init()
 */
function syncOnPageShow() {

    g_syncPageTranslation.safeExecute(function() {

        g_syncPageTranslation.translateButton('#signinagain', 'Log out');
        g_syncPageTranslation.translateButton('#syncButton', 'Log in via your supertrade user');
        g_syncPageTranslation.translateButton('#syncButtonAD', 'Log in via your SG network user');
    });
	if (sessionStorage.getItem('disableMenuButton') === 'true')
         $('#syncMenu').addClass('ui-disabled');

    //first open database and it will call init
    g_syncDao = new Dao();
    g_syncDao.openDB(function () { syncInit(); syncBind(); });
    //syncBind();
}

/*
 * All binding to buttons etc. should happen in the function() method
 */
function syncBind() {

    $('#syncButton').unbind();
    $('#syncButton').click(function( event ) {
        syncFetchUser();
    });

    $('#syncButtonAD').unbind();
    $('#syncButtonAD').click(function( event ) {
        syncLoginAD();
    });

    $('#signinagain').unbind();
    $('#signinagain').click(function(event){
            g_syncIsOrderPosted = false;
            g_syncLastUserID = '';
            g_syncPricelistSyncMethod = 'Sync5';
            g_syncLivePricelist = false;
            g_currentExclusiveOrderType = undefined;
            syncDeleteDB();
            if (g_smp) smp.getInstance().logoff(syncSMPLogon, function(errorInfo){alert("error: " + JSON.stringify(errorInfo));} );
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

function synSMPLogon(){
    smp.getInstance().logon(function(){},syncInit);
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
                                if (g_smp) {
                                    $('#password').val(smp.getInstance().getUser().password);
                                    $('#password').addClass('ui-disabled');
                                }
			},
			function(user) {
                if (localStorage.getItem('OldUserName')) {
    				$('#userid').val(localStorage.getItem('OldUserName'));
                    return;
                }
				g_syncIsFirstSync = true;
				$('#userid').removeClass('ui-disabled');
                                //if SMP force in user/password
                                if (g_smp) {
                                    $('#userid').val(smp.getInstance().getUser().user);
                                    $('#userid').addClass('ui-disabled');
                                    $('#password').val(smp.getInstance().getUser().password);
                                    $('#password').addClass('ui-disabled');
                                }
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

//     $('#syncMenu').removeClass('ui-disabled');
    localStorage.removeItem('OldUserName');
    g_syncStopSync = false;
    $.mobile.showPageLoadingMsg();
	$.support.core = true;
	$.mobile.allowCrossDomainPages = true;
	$.mobile.pushState = false;

	$('#message').text(g_syncPageTranslation.translateText('Please wait, verifying your userid'));
	$('#syncimg').attr('src','img/Sand-Timer-48.png');
	g_syncUserID = $('#userid').val();
	var userPassword = $('#password').val();
	var url = g_restUrl + 'Users/VerifyPassword?userID=' + g_syncUserID + '&password=' + userPassword + '&format=json';
	var success = function (json) {
	    var status = Boolean(json.Status);
	    if (status) {
                $('#syncMenu').removeClass('ui-disabled');
	        g_syncSupplierID = json.UserInfo.SupplierID;
	        if (json.UserInfo.UserID != g_syncLastUserID) {
	            syncSaveUser(json.UserInfo);
	            g_syncLastUserID = json.UserInfo.UserID;
	        } else {
	            syncTryToPostData();
	        }
	    } else {
	        $.mobile.hidePageLoadingMsg();
	        g_alert(g_syncPageTranslation.translateText('Wrong password...'));
	        $('#syncimg').attr('src', 'img/info-48.png');
	        $('#message').text('Enter your password and click OK');
	    }
	};
	var error = function (e, a) {
            g_alert(g_syncPageTranslation.translateText('You seem to be offline: ') + g_syncPageTranslation.translateText(a));
            $.mobile.hidePageLoadingMsg();
	    console.log(e.statusText);
	};

	g_ajaxget(url, success, error);
}

function syncLoginAD() {

    g_syncStopSync = false;
    $.mobile.showPageLoadingMsg();
	$.support.core = true;
	$.mobile.allowCrossDomainPages = true;
	$.mobile.pushState = false;

	$('#message').text(g_syncPageTranslation.translateText('Please wait, verifying your userid'));
	$('#syncimg').attr('src','img/Sand-Timer-48.png');
	g_syncUserID = $('#userid').val();
    var getUrlData = null;
    var verifySuccess = function (json) {
        sessionStorage.removeItem('isADCall');
        var status = (json && json.access_token && !json.access_token.IsFaulted && json.access_token.IsCompleted && !json.access_token.IsCanceled);
        if (status) {
            $('#syncMenu').removeClass('ui-disabled');
            g_syncSupplierID = getUrlData.SupplierID;
            var tokenExpiration = Date.now() + (json.expires_in * 1000);
            localStorage.setItem('tokenExpiration', tokenExpiration);
            localStorage.setItem('tokenAD', JSON.stringify(json));
            localStorage.setItem('OldUserName', getUrlData.UserID);
            if (json.UserID != g_syncLastUserID) {
                syncSaveUser(getUrlData);
                g_syncLastUserID = getUrlData.UserID;
            } else {
                syncTryToPostData();
            }
        } else {
            $.mobile.hidePageLoadingMsg();
            g_alert(g_syncPageTranslation.translateText('You seem to be offline: ') + g_syncPageTranslation.translateText(a));
            $('#syncimg').attr('src', 'img/info-48.png');
            $('#message').text('Enter your password and click OK');
        }
    };

    var verifyError = function (e, a) {
        sessionStorage.removeItem('isADCall');
        g_alert(g_syncPageTranslation.translateText('This is not a valid active directory username or password. Have you used the correct format eg. supergrp\john.smith') + g_syncPageTranslation.translateText(a));
        $.mobile.hidePageLoadingMsg();
        console.log(e.statusText);
    };

    var onGetURLSuccess = function(data) {
        if (!data || !data.length) {
            $.mobile.hidePageLoadingMsg();
            g_alert(g_syncPageTranslation.translateText('This is not a valid active directory username or password. Have you used the correct format eg. supergrp\john.smith'));
            $('#syncimg').attr('src', 'img/info-48.png');
            $('#message').text('Recheck your input data and try again');
        }
        getUrlData = data[0];
    	var userPassword = $('#password').val();
    	var userVerifyURL = data[0].url;
        var userInputData = {
            username: data[0].UserID,
            password: userPassword
        };
        sessionStorage.setItem('isADCall', 'true');
    	g_ajaxpost(userInputData, userVerifyURL, verifySuccess, verifyError);
    };

    var onGetURLError = function (e, a) {
        g_alert(g_syncPageTranslation.translateText('You seem to be offline: ') + g_syncPageTranslation.translateText(a));
        $.mobile.hidePageLoadingMsg();
        console.log(e.statusText);
    };

    var geturlURL = g_restPHPUrl + "Get?method=User_ReadActiveDirectory&InUserID=%27" + g_syncUserID + "%27";
    // g_ajaxget(geturlURL, onGetURLSuccess, onGetURLError);
    $.ajax({
        type :          'GET',
        url :           geturlURL,
        cache :         true,
        crossDomain:    true,
        dataType :      'json',
        success:        onGetURLSuccess,
        error:          onGetURLError,
        timeout:        DaoOptions.getValue('AjaxTimeout', 30000)
    });

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

    var success = function (json) {
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

    	(json._Status === true) ? syncPostedOK(index) : orderExistsOnError(json);
    };

    var orderExistsOnError = function(json) {

        g_append('#results tbody', '<tr><td>Error: order not sent.</td></tr>');
        syncPostedOK(index, true);
    };

    var postOrderOnSuccess = function(json) {

    	var url = DaoOptions.getValue(g_orderHeaderOrder.Type + 'ExistsURL');

    	if (!url)
    		url = g_restUrl + 'Orders/Exists';

        //g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json', orderExistsOnSuccess, orderExistsOnError);
        g_ajaxget(url + '?supplierID=' +  g_syncPosted[index].JsonObject.SupplierID + '&orderID=' + g_syncPosted[index].JsonObject.OrderID + '&format=json', orderExistsOnSuccess, orderExistsOnError);


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
        $('#message').text(g_syncPageTranslation.translateText(SYNC_OK_MESSAGE));
    };

    if ((g_syncPosted[index].Table == 'Options') && (g_syncPosted[index].Method == 'QuickModify')) {

    	var invoiceNumberOption = g_syncPosted[index].JsonObject;

        var lastInvoiceNumber = DaoOptions.getValue(g_currentUser().RepID + 'lastInvNum');

        if (invoiceNumberOption.Value >= lastInvoiceNumber) {

            g_ajaxget(g_restUrl + 'Options/QuickModify?supplierID=' + invoiceNumberOption.SupplierID +
                            '&name=' + invoiceNumberOption.Name + '&group=' + invoiceNumberOption.Group +
                            '&otype=' + invoiceNumberOption.Type + '&value=' + invoiceNumberOption.Value,

                            saveInvoiceNumberOnSuccess, saveInvoiceNumberOnError);

        } else {

            saveInvoiceNumberOnSuccess({_Status:true});
        }

    	return;
    }

    var completeF = function (jqXHR, textStatus) {
//        if (g_syncPosted[index].Table === 'Orders') {
//            var url = DaoOptions.getValue(g_orderHeaderOrder.Type + 'ExistsURL');
//
//            if (!url) {
//                url = g_restUrl + 'Orders/Exists';
//            }
//
//            g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json', orderExistsOnSuccess, orderExistsOnError);
//
//        } else {
//            success();
//        }
            if (jqXHR.status === 200 || jqXHR.status === 0)
                success(jqXHR);
            else
                error(jqXHR);
    };
    console.log('POST: ' + url + ' data: ' + postData);
    g_ajaxpost(postData, url, success, error, undefined);
}

/*
 * Data posted OK, so post the next index
 */
function syncPostedOK(index, skip){

    if (!skip) {

        if (!g_syncIsOrderPosted && g_syncPosted[index].Table == 'Orders')
            g_syncIsOrderPosted = true;

        if ('POD' == g_syncPosted[index].JsonObject.Type) {
            /*******  g_acceptDelivery is undefined
            g_acceptDelivery(g_syncPosted[index].JsonObject, function() {
                    localStorage.removeItem('CacheDeliveryOrders');
            });
            */
        }

        //$('#results tbody tr:last td').text((index + 1) + ' of ' + g_syncPosted.length + ' rows sent OK' );
        g_append('#results tbody','<tr><td>' + (index + 1) + g_syncPageTranslation.translateText(' of ') + g_syncPosted.length + g_syncPageTranslation.translateText(' rows sent OK') + '</td></tr>');
    }

    if (index == (g_syncPosted.length - 1)){

        if (!skip) {

            if (g_syncIsOrderPosted)
                sessionStorage.setItem('HistoryCacheAccountID', '');

            g_syncDao.clear('Unsent');
        }

        syncAll();

    } else {

        index = index + 1;
        syncPostData(index);
    }
}

/*
 * Set up our synchronization
 */
function syncAll() {

    localStorage.setItem('lastSyncDate', g_currentDateTime());
    localStorage.setItem('lastSyncDay', new Date().getDay());

    var fnmsDate = new Date();
    localStorage.setItem('lastSyncMonth', '' + fnmsDate.getFullYear() + '-' + g_setLeadingZero(fnmsDate.getMonth() + 1));


    $('#userid').addClass('ui-disabled');
    $('#message').text(g_syncPageTranslation.translateText('Please wait, downloading latest data'));

    g_syncTables = [];
    g_syncCount = 0;
    g_syncRetryCount = 0;

    if (localStorage.getItem('lastSyncDate') !== g_currentDateTime()) {

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

    if ((g_url.indexOf('https://app') !== -1) || (g_url.indexOf('http://app') !== -1))
        syncAddSync(g_syncSupplierID, null, 'Route', 'Sync2', true);

    if (g_vanSales) {

        syncAddSync(g_syncSupplierID, g_syncUserID, 'Discount', 'Sync4', 0);
        syncAddSync(g_syncSupplierID, g_syncUserID, 'DiscountCondition', 'Sync4', 0);
        syncAddSync(g_syncSupplierID, g_syncUserID, 'DiscountValues', 'Sync4', 0);
    }

    var item = g_syncTables[g_syncCount];
    syncTableCount = 0;
    syncFetchTable(item.supplierid,item.userid,item.table,item.method,syncFetchLastTableSkip(syncGetLocalTableName(item.table, item.method)), undefined, item.newRest);

    sessionStorage.setItem('cacheMyTerritory', null);
    sessionStorage.setItem('cachePricelist', null);
    $('#signinagain').removeClass('ui-disabled');
}

/*
 * add the sync required
 */
function syncAddSync(supplierid, userid, table, method, useNewRest){

    var syncTable= {};
    syncTable.supplierid = supplierid;
    syncTable.userid = userid;
    syncTable.table = table;
    syncTable.method = method;

    if (useNewRest)
        syncTable.newRest = useNewRest;

    g_syncTables.push(syncTable);
}

function syncGetLocalTableName(table, method) {

    return ('Orders' == table) && ('GetOrderItemsByType3' == method) ? 'OrderItems' : table;
}

/*
 * Fetch method to get each individual table from the server
 */
function syncFetchTable(supplierid, userid, table, method, skip, onSuccess, newRest) {

    // due the optional table sync, we always need to sync all data from Options table

    var version = ('Options' == table) ? 0 : syncFetchLastTableVersion(syncGetLocalTableName(table, method));

    var userParameter = '';

    if (userid)
        userParameter = '&UserID=' + userid;

    if ('Pricelists' == table)
        method = g_syncPricelistSyncMethod;

    var baseURLInfo = {

        Orders: (g_syncDownloadOrderURL || DaoOptions.getValue('DownloadOrderURL')) ? (g_syncDownloadOrderURL || DaoOptions.getValue('DownloadOrderURL')) + '/rest/' : g_restUrl,
        Tpm:  g_restPHPUrl, //'http://www.super-trade.co.za:8083/rest/index.php/',
        Default: g_restUrl
    };

    var isSpecialTable = ($.inArray(table, Object.keys(baseURLInfo)) !== -1);

    var url = '';
    if (table.toLowerCase() === 'tpm') {
        url = g_restPHPUrl + 'dynamodb.php/Sync?table=TPM&hashkey=SupplierID&hashvalue=' + supplierid + '&userID=' + userid + '&version=' + version;
    } else if (newRest) {

        url = g_restPHPUrl + 'GetStoredProc/Sync?StoredProc=usp_' +  table.toLowerCase() + '_' +
            method.toLowerCase() + '&table=' + table.toLowerCase() + '&params=(%27' + supplierid + '%27%7C' + ((table === 'Orders' || table === 'OrderItems') ? userid + '%7C' : '') + version + ')';

    } else {

        url = baseURLInfo[isSpecialTable ? table : 'Default']  + table + '/' + method +
                                                        '?SupplierID=' + supplierid +
                                                         userParameter +
                                                        '&version=' + version +
                                                        '&skip=' + skip +
                                                        ('Orders' === table ? '&orderType=' + (g_syncDownloadOrderType || DaoOptions.getValue('DownloadOrderType') || sessionStorage.getItem('lastRangeType')) : '') +
                                                        (('Orders' === table) && ($.mobile.activePage.attr('id') === 'companypage') ? '&accountID=' + g_currentCompany().AccountID.replace('&', '%26') : '') +
                                                        ('Orders' === table ? '&CallWeekNumber=' + g_currentCallCycleWeek() : '') +
                                                        ('Orders' === table ? '&CallDayOfWeek=' + todayGetCurrentDay() : '') +
                                                        '&top=' + g_syncNumRows + '&format=json';
    }

    console.log(url);
    var success = function (json) {
        g_syncRetryCount = 0;
        syncSaveToDB(json, supplierid, userid, version, table, method, skip, newRest, onSuccess);

        if (onSuccess)
            onSuccess(g_syncNumRows > json.length);
    };

    var error = function (e, a, b) {
        //if ((e.status === 503) || (a && a.indexOf('Access-Control-Allow-Origin') > 0) || (e.statusText && e.statusText.indexOf('Access-Control-Allow-Origin') > 0)) {
            if (g_syncRetryCount++ < 5 ) {
                setTimeout(function() {
                    syncFetchTable(supplierid, userid, table, method, skip, onSuccess, newRest);
                }, 2000);
            } else {
                g_alert('Error communicating with server. Please try again shortly.');
                $.mobile.hidePageLoadingMsg();
                console.log(e.statusText);
            }
        //} else {
        //    g_alert('You seem to have timed out, please check your connection and try again: ' + a);
        //    $.mobile.hidePageLoadingMsg();
        //    console.log(e.statusText);
        //}
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
function syncSaveToDB(json, supplierid, userid, version, table, method, skip, newRest, onSuccess) {

    if (('Companies' === table) && (0 === skip) && (0 === version) && (json._Items === null)) {

        $('#syncMenu').addClass('ui-disabled');
        $('#errorMessagePopup').popup('open');
        setTimeout(function() {
            $('#errorMessagePopup').popup('close');
        }, 2000);

        $.mobile.hidePageLoadingMsg();
        return;
    }

    if (g_syncStopSync==true)
        return;

    localStorage.setItem('lastSkip' + syncGetLocalTableName(table, method), skip);

    if ('Orders' === table && !json._Items)
        json._Items = json;

    if (json._Items == null) {

        //this table sync is finished, so check if we need more downloads of this table
        g_append('#results tbody', '<tr><td> ' + g_syncPageTranslation.translateText(table) + ' - ' + g_syncPageTranslation.translateText('up to date') + '</td></tr>');
		//$('#results tbody').append('<tr><td> ' + table + ' - up to date</td></tr>');
    	syncSetLastVersion(table, json._LastVersion);

    	if ((g_syncTables.length == (g_syncCount + 1))) { //completed the SYNC

		console.log('===== Sync completed OK =====');
	        $('#syncimg').attr('src', 'img/Tick-48.png');
	        $('#message').text(g_syncPageTranslation.translateText(SYNC_OK_MESSAGE));
	        $.mobile.hidePageLoadingMsg();

		} else {	// go on to the next table
			var item = syncNextItem();
			if (item) syncFetchTable(item.supplierid,item.userid,item.table,item.method,syncFetchLastTableSkip(syncGetLocalTableName(item.table, item.method)), undefined, item.newRest);
			return;
		}
	} else if (newRest || /*('Orders' === table) || */((json._Items.length ) < g_syncNumRows && (table != 'Pricelists'))) {

            try {
                //less than 250 records, so move on to the next sync, except pricelist, dont always get back 250
                if (table === 'Options') {
                    g_append('#results tbody', '<tr><td> ' + g_syncPageTranslation.translateText(syncGetLocalTableName(table, method)) + ' (' + (skip + json._Items.length) + ') ' + g_syncPageTranslation.translateText('downloaded'));
                } else {
                    $('#results tbody tr:last td').text(g_syncPageTranslation.translateText(syncGetLocalTableName(table, method)) + ' (' + (skip + json._Items.length) + ') ' + g_syncPageTranslation.translateText('downloaded'));
                }
            } catch(e) {
                console.log(e.message);
            }

	    syncSetLastVersion(syncGetLocalTableName(table, method), 'Orders' === table ? 0 : json._LastVersion);

	    if ((g_syncTables.length == (g_syncCount + 1))) {

		console.log('===== Sync completed OK =====');
                $('#syncimg').attr('src', 'img/Tick-48.png');
                $('#message').text(g_syncPageTranslation.translateText(SYNC_OK_MESSAGE));
                $.mobile.hidePageLoadingMsg();

	    } else {
	        //do the next table
	        var item = syncNextItem();
	        try {
                    g_append('#results tbody', '<tr><td>' + g_syncPageTranslation.translateText('Fetching') + ' ' + g_syncPageTranslation.translateText(syncGetLocalTableName(item.table, item.method)) + '...</td></tr>');
                    //$('#results tbody').append('<tr><td> Fetching new ' + item.table + '...</td></tr>');
                    syncFetchTable(item.supplierid, item.userid, item.table, item.method, syncFetchLastTableSkip(syncGetLocalTableName(item.table, item.method)), undefined, item.newRest);
	        } catch(err) {
                    console.log('Skipping');
	        }
	    }
	} else {
	        //get the next 250 records for the table
                try {
                    $('#results tbody tr:last td').text(g_syncPageTranslation.translateText(syncGetLocalTableName(table, method)) + ' (' + (skip + json._Items.length) + ') ' + g_syncPageTranslation.translateText('downloaded'));
                } catch (exErr) { console.log(exErr.message); }
	        syncFetchTable(supplierid, userid, table, method, skip + g_syncNumRows, onSuccess, newRest); //get next 250 records
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

                    if (item.Name == 'AllowHistoryDownload') {
                        if (g_syncDownloadOrderType && g_syncDownloadOrderType === 'Deliv') {
                            syncAddSync(g_syncSupplierID, g_syncUserID, 'Orders', 'ReadDeliveries2', true);
                            syncAddSync(g_syncSupplierID, g_syncUserID, 'OrderItems', 'DeliveriesCollection', true);
                        } else {
                            syncAddSync(g_syncSupplierID, g_syncUserID, 'Orders', 'GetCollectionByType3', 0);
                            syncAddSync(g_syncSupplierID, g_syncUserID, 'Orders', 'GetOrderItemsByType3', 0);
                        }
                    }

                    if ((item.Name == 'localTPM') && (item.Value == 'true')) {

                        syncAddSync(g_syncSupplierID, g_syncUserID, 'Tpm', 'Sync2', 0);
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
    	                        //objectStore.createIndex(g_pricelistSortField, g_pricelistSortField, { unique: false });
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

	    $('#message').text(g_syncPageTranslation.translateText('Please wait, sending your data'));
	    g_append('#results tbody', '<tr><td>' + g_syncPageTranslation.translateText('Reading...') + '</td></tr>');
	    syncFetchPostData();

	} else {

		syncAll();
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
            keyf = item.SupplierID + item.OrderID + item.ProductID;
            break;

        case 'Tpm':
            keyf = item.TPMID;
            break;

        case 'Route':
            keyf = item.routeID;
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
            g_alert(g_syncPageTranslation.translateText('User deleted, please sign in with a new user.'));
            $('#userid').removeClass('ui-disabled');
            $('#syncimg').attr('src', 'img/info-48.png');
            $('#message').text('Enter your password and click OK');
            if (localStorage.getItem('OldUserName')) {
                $('#userid').val(localStorage.getItem('OldUserName'));
            }
        });
    });
}
