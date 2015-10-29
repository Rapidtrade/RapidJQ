/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function companyOnPageBeforeCreate() {
    
    g_syncPageTranslation = translation('syncpage');
    
    activityFormLoadIntoDiv('#activitydetails', true);
    activityFormLoadIntoDiv('#activityPopup', true);
    overlayInit('companypage');   
}

function companyOnPageShow() {
    
    g_companyPageTranslation.safeExecute(function() {
        
        g_companyPageTranslation.translateButton('#backbtn', 'Back');
        
        g_companyPageTranslation.translateRadioButton('radio1', 'Details');
        g_companyPageTranslation.translateRadioButton('radio2', 'Contacts');
        g_companyPageTranslation.translateRadioButton('radio3', 'Map');  
        g_companyPageTranslation.translateButton('#savecompany', 'Save');
        
        g_companyPageTranslation.translateButton('#zoomOutButton', 'Zoom out');
        g_companyPageTranslation.translateButton('#zoomInButton', 'Zoom in');
        g_companyPageTranslation.translateButton('#quantity', 'Quantity');
    });
    
    $('#companyHistoryRefresh').addClass('invisible');
//    $('#companyHistoryRefresh').addClass('ui-disabled');
    $('#companyHistoryRefresh').off();
    
    companyHideFooter();
    overlaySetMenuItems();
    g_checkUsageMode();
    
    if (!DaoOptions.getValue('MobileThumbnails')) {
        $('#thumbnailModeDiv').hide();
    } else {
        g_checkThumbnailMode(); 
    }
    
    if (DaoOptions.getValue('AllowDeleteContact', 'false') === 'false') {
        $('#deletecontact').hide();
    }

    if (sessionStorage.getItem('companyBack') == 'today.html')
        $('#companyBackButton .ui-btn-text').text('Today');

    companyOnPageShowSmall();

    g_showCurrentCompanyName();

    var dao = new Dao();
    dao.openDB(function() {companyInit();});
    companyBind();

    if (DaoOptions.getValue('AllowHistoryDownload', 'false') == 'true') {
        
        field = DaoOptions.getValue('DownlOrderCallCycFieldIndic', ''); 

        if ((!field || g_currentCompany()[field] === 'Y')) {    

            var isSynced = false;

            var dao = new Dao();	
            dao.cursor('CallCycle', undefined, undefined,

                function(customerInfo) {

                    var status = customerInfo[todayGetCurrentDay()];

                    if ((customerInfo.Week == g_currentCallCycleWeek()) && status && customerInfo.AccountID == g_currentCompany().AccountID)
                        isSynced = true;
                }, 

                undefined,

                function() {

                    $('#syncHistoryButton').toggleClass('invisible', isSynced);
                    sessionStorage.setItem('MasterChartSynced', isSynced);
                }

            );

        } else {

            sessionStorage.setItem('MasterChartSynced', false);
        }
    }

    if (!$('#companyTabs input:checked').length) {

        $('#radio1').attr('checked', true);
        $('#companyTabs').controlgroup('refresh');
    }

    var lastPanelId = sessionStorage.getItem('lastPanelId');
    lastPanelId && (lastPanelId != 'companyPanel') ? companyLoadPanel(lastPanelId) : companySetNextButton('History');
}

function companyOnPageShowSmall() {

    if (g_isScreenSmall()) {
            $('.hideonphone').hide();
    }
}

function companyLoadPanel(panelId) {
	
    if (panelId != 'pricelistPanel') {

        var menuItemId = panelId.replace('Panel', 'Item');

        if (sessionStorage.getItem('lastMenuItemId') != menuItemId) 
            sessionStorage.setItem('lastMenuItemId', menuItemId);
    }

    if (panelId.indexOf('pricelist') != -1) 
        panelId = 'pricelistPanel';

    sessionStorage.setItem('lastPanelId', panelId);

    $('#' + panelId).siblings('div[data-role="content"]').hide().addClass('invisible');		
    $('#' + panelId).show().removeClass('invisible');

    if ('pricelistPanel' == panelId)
            $('#searchBarPanel').show().removeClass('invisible');

    $('#backbtn').hide();
    //$('#conpanyHistoryRefresh').hide();

    switch (panelId) {

        case 'companyPanel':			
                companyOnPageShow();
                break;

        case 'historyPanel':
                historyOnPageShow();
                companySetNextButton('Pricelist');
                break;

        case 'pricelistPanel':
                sessionStorage.removeItem('fromAdvanced');
                sessionStorage.removeItem('fromCategory');
                pricelistOnPageShow();
                companySetNextButton('Shopping Cart');
                pricelistCheckBasket();
                break;

        case 'activityPanel':			
                activityOnPageShow();
                companySetNextButton('Finished');
                break;	
    }
}

function companySetNextButton(title) {
	
    g_companyPageTranslation.translateButton('#companyNextButton', title);

    if ('Shopping Cart' != title)
        $('#companyNextButton').removeClass('ui-disabled');
    if (title !== 'Pricelist') {
        $('#companyHistoryRefresh').addClass('invisible');
//        $('#companyHistoryRefresh').addClass('ui-disabled');
        //$('#companyHistoryRefresh').off();
    }

    $('#companyNextButton').off();
    $('#companyNextButton').on('click', function() {

        switch(title) {

            case 'Shopping Cart':
                if (DaoOptions.getValue('ExclusiveOrderTypes')) {
                    var exclTypes = DaoOptions.getValue('ExclusiveOrderTypes').split(',');
                    var isInList = $.inArray(g_currentExclusiveOrderType, exclTypes) !== -1;
                    if (g_currentExclusiveOrderType && g_currentExclusiveOrderType !== sessionStorage.getItem('currentordertype')) {
                        g_alert(DaoOptions.getValue('ExclusiveOrderTypMsg') + '  Please complete the E2 first.');
                        return;
                    }
                }
                $.mobile.changePage('shoppingCart.html');
                break;

            case 'Finished':
//                    if (companyRequiredActivitiesSaved()) {
                //if we do have RequiredActivities then still activities to capture
                if (sessionStorage.getItem('RequiredActivities')) {
                    $('#activityErrorMessagePopup p').text('Please complete all activities marked with a * before leaving this customer.');
                    $('#activityErrorMessagePopup').popup('open');                        
                } else {
                    overlayRemoveStorage();
                    g_navigateBackFromCompanyView();
                    g_activitySavedActivities = {};                        
                }

                break;

            case 'Pricelist':
                overlayHighlightMenuItem('.orderItem');

            default:
                companyLoadPanel(title.toLowerCase() + 'Panel');
        }
    });
}

function companyHideFooter() {
	
    if (sessionStorage.getItem('CompanyNoFooter') == 'true') {

        sessionStorage.setItem('orderheaderNext', 'menu');
        $('#companyBackButton, #companyNextButton, #savecompany').hide();
    }
}

function companyRequiredActivitiesSaved() {
    
    var result = true;
    
    var requiredActivities = sessionStorage.getItem('requiredActivities').split(',');
    
    if ($.trim(requiredActivities[0])) {
    
        for (var i = 0; result && (i < requiredActivities.length); ++i) 
            result = result && (requiredActivities[i] in g_activitySavedActivities);
    }
    
    return result;
}

function companyShowContact(showAll) {
	
    $('#contacts').toggle(showAll);
    $('#contactdetails').toggle(!showAll);
}

/*
 * All binding to buttons etc. should happen in this <yyy>Bind function() method
 */
function companyBind(){
	
	sessionStorage.getItem('CompanyNoFooter') == 'true' ?  g_menuBind() : overlaySetMenuButton();
        
        $('#syncHistoryButton').off().on('click', companySyncHistory);
	
	//bind save company
 	$('#savecompany' ).button()
        		.click(function (event) {
                            if (!g_isOnline(true)) {
                                return;
                            }
        		    var dao = new Dao();
        			var companyObj = JSON.parse(sessionStorage.getItem('jsonCompany'));
        			companyObj.key = companyObj.SupplierID + companyObj.AccountID + companyObj.BranchID;
        		    // Dejan - now you can call save method to save the object locally
        			dao.put(companyObj, "Companies", companyObj.key,
        					function (event) {
        			    		var jsonForm = new JsonForm();
        			    		jsonForm.show(g_currentUser().SupplierID, '#companyform', companyObj, 'Company');
        					},
        					undefined, undefined);
                                $.mobile.showPageLoadingMsg();
        			var url = companyCreateSaveCompanyURL(companyObj);
                                g_ajaxget(url, function(response) {
                                    $.mobile.hidePageLoadingMsg();	
                                    var message = '';
                                    if (response && response.length) {
                                        if (response[0].Status) {
                                            message = 'Company data saved OK.';
                                        } else {
                                            g_saveObjectForSync(companyObj, companyObj.key, "Companies", "Modify", undefined);
                                            message = 'ERROR: ' + response[0].ErrorMessage;
                                        }
                                    }

                                    g_alert(message);
                                }, function(response) {
                                    $.mobile.hidePageLoadingMsg();	
                                    var message = '';
                                    
                                        g_saveObjectForSync(companyObj, companyObj.key, "Companies", "Modify", undefined);
                                        message = 'ERROR occurred while saving company data.';
                                    

                                    g_alert(message);
                                });
                                
        			//g_saveObjectForSync(companyObj, companyObj.key, "Companies", "Modify", undefined);
        		}); 	
 	
 	//bind save a contact
 	$('#savecontact').button()
	.click(function (event) {
		
		DaoOptions.getValue('LiveContactAddURL') ? companySaveLiveContact() : companySaveDB2Contact();
	});
        
        $('#deletecontact').button()
	.click(function (event) {
		
		//DaoOptions.getValue('LiveContactAddURL') ? companyDeleteLiveContact() : companyDeleteContact();
                if ('AllowDeleteContact') {
                    companyDeleteLiveContact();
                }
	});
 	
 	$('#cancelcontact').click(function() {
 		companyShowContact(true);
 	});
 	
 	//Bind create contact
 	$('#addcontact').click(function () {
 		
        companyCreateContact();
        companyShowContact(false);
     });
 	
 	// show company details
 	$('#radio1').click(function () {
        $('#details').show();
        $('#contacts').hide();
        $('#map').hide();
        $('#gps').hide();
        $('#iframeDiv').hide();
     });
 	// show contacts
 	$('#radio2').click(function () {
        $('#details').hide();
        $('#contacts').show();
        $('#map').hide();
        $('#gps').hide();
        $('#iframeDiv').hide();
     });
 	// show map
 	$('#radio3').click(function () {
        $('#details').hide();
        $('#contacts').hide();
        $('#iframeDiv').hide();
        g_currentCompany().Latitude ? companyShowLocation(g_currentCompany()) : $('#gps').show();
     });
 	
 	$('#tpmRadio').click(function () {
        $('#details').hide();
        $('#contacts').hide();
        $('#map').hide();
        $('#gps').hide();
        $('#iframeDiv').show();
        $('#iframeDiv iframe').attr('src', DaoOptions.getValue('CompanyIframeURL') + '?accountid=' + g_currentCompany().AccountID + 
        		'&userid=' + g_currentUser().UserID + '&supplierid=' + g_currentUser().SupplierID);
     });
     
    // back button
    $('#companyBackButton').click(function () {
            g_navigateBackFromCompanyView();
    });
    // capture GPS button
    $('#captureGPS').click(function() {
            companyFetchGPSPosition();
    });

    $('.scroll-to-top').click(function(event) {
            event.preventDefault();
            $('html,body').animate({scrollTop: 0},'fast');
            return false;
    });
}

/*
 * reads the company
 */
function companyInit(){
	
	$("#contacts").hide();
	$("#map").hide();
	$('#gps').hide();
	$('#iframeDiv').hide();
	$('.hidden').removeClass('hidden');
	
	$('#tpmDiv').toggle(DaoOptions.getValue('CompanyIFrameLabel') != undefined);
	
	if (DaoOptions.getValue('CompanyIFrameLabel')) {		
		$('#tpmRadioLabelText').html(DaoOptions.getValue('CompanyIFrameLabel'));
		$('#tpmRadio').checkboxradio( 'refresh' );
	}
	
//	$('#iFrameDiv iframe').attr('height', window.innerHeight - 200);
	
	if (sessionStorage.getItem('companyBack') != undefined)
	    $('companyBackButton').attr('href', sessionStorage.getItem('companyBack'));
	
	// moved to pricelist.js
//    sessionStorage.setItem("currentordertype", "Order");
	
//    var dao = new Dao();
//    dao.cursor('BasketInfo', undefined, undefined,
//     function (basketinfo) {
//         if (basketinfo.AccountID == g_currentCompany().AccountID && basketinfo.Type == 'Order') {
//             $('#companyshoppingCartBtn').removeClass('ui-disabled');
//
//         }
//     }, undefined, undefined);

	var jsonForm = new JsonForm();
	jsonForm.oncomplete = function (event) {
	    companyFetchContacts();
	};
	jsonForm.show(g_currentUser().SupplierID, '#companyform', g_currentCompany(), 'Company');
	
	// initialize scroll to top
	var offset = 200;
	var duration = 500;
	$(window).scroll(function() {
		if (jQuery(this).scrollTop() > offset) {
			$('.scroll-to-top').fadeIn(duration);
		} else {
			$('.scroll-to-top').fadeOut(duration);
		};
	});
	
}

function companySyncHistory() {
    
    if (!g_syncDao)
        g_syncDao = new Dao();
        
    g_busy(true);
    g_syncRetryCount = 0;
    syncFetchTable(g_currentUser().SupplierID, g_currentUser().UserID, 'Orders', 'GetCollectionByType3', 0, function() {
        
        syncFetchTable(g_currentUser().SupplierID, g_currentUser().UserID, 'Orders', 'GetOrderItemsByType3', 0, function(res) {
            
            if (res)
            g_busy(false);
        });
    });    
}

function companySaveDB2Contact() {
    if (!g_isOnline(true)) {
        return;
    }
    var contactObj = JSON.parse(sessionStorage.getItem('jsonContact'));
    contactObj.Deleted = false;
    contactObj.PostedToErp = false;
    var url = companyCreateSaveContactURL(contactObj);
    $.mobile.showPageLoadingMsg();
    g_ajaxget(url, companySaveDB2ContactOnResponse, companySaveDB2ContactOnResponse);
}

function companySaveDB2ContactOnResponse(response) {
    $.mobile.hidePageLoadingMsg();
	
	var message = '';
	
	if (response && response.length) {
           if (response[0].Status) {
		message = 'Contact created OK.';
		companySaveContact(JSON.parse(sessionStorage.getItem('jsonContact')).Counter);
                
		
            } else {

                    message = 'ERROR: ' + response.ErrorMessage;
            }         
        } else {
            message = 'ERROR: An error occurred while saving contact\'s data.';
        }
		
	
	g_alert(message);
}

function companySaveLiveContact() {
	
	var contactInfo = {};
        
        var contactObj = JSON.parse(sessionStorage.getItem('jsonContact'));
        contactObj.PostedToErp = false;
        
	
	contactInfo.json = JSON.stringify(contactObj); //sessionStorage.getItem('jsonContact');	
	contactInfo.Table = 'Contacts';
	contactInfo.Method = 'Modify';
	
	$.mobile.showPageLoadingMsg();
	
	g_ajaxpost(contactInfo, DaoOptions.getValue('LiveContactAddURL'), companySaveLiveContactOnResponse, companySaveLiveContactOnResponse);
}

function companySaveLiveContactOnResponse() {
	
	g_ajaxget(DaoOptions.getValue('LiveGetResultsURL'), companyOnGetResultsSuccess, companyOnGetResultsError);
}

function companyOnGetResultsSuccess(result) {
	
	$.mobile.hidePageLoadingMsg();
	
	var message = '';
	
	if (result._getErrorMsg) {
		
		message = 'ERROR:' + result._getErrorMsg;
		
	} else if (result._getGuID == JSON.parse(sessionStorage.getItem('jsonContact')).Counter) {
		
		message = 'Contact created OK.';
		companySaveContact(result._getReturnID);
	
	} else {
		
		message = 'ERROR: Contact not created.';
	}
	
	g_alert(message);
}

function companyOnGetResultsError() {
	
	$.mobile.hidePageLoadingMsg();
	g_alert('Error in retrieving operation result.');
}

function companySaveContact(counter) {
	
    var contactObj = JSON.parse(sessionStorage.getItem('jsonContact'));
    
    if (counter)
    	contactObj.Counter = counter;
	
    var dao = new Dao();
    var key = contactObj.SupplierID + contactObj.AccountID + contactObj.Counter;
   
    dao.put(contactObj, "Contacts", key,
    		function (event) {
        		companyFetchContacts();
    		},
    		undefined, undefined);
    
    if (!counter)
    	g_saveObjectForSync(contactObj, key, 'Contacts', 'Modify', undefined);
    
    companyShowContact(true);
}

function companyDeleteLiveContact() {
    if (!g_isOnline(true)) {
        return;
    }
    var contactObj = JSON.parse(sessionStorage.getItem('jsonContact'));
    contactObj.Deleted = true;
    contactObj.PostedToErp = false;
    var url = companyCreateSaveContactURL(contactObj);
    
    $.mobile.showPageLoadingMsg();
    
    g_ajaxget(url, companyDeleteLiveContactOnResponse, companyDeleteLiveContactOnResponse);

    
}

function companyDeleteLiveContactOnResponse(response) {
    
    $.mobile.hidePageLoadingMsg();
	
    var message = '';

    if (response && response.length) {
       if (response[0].Status) {
            message = 'Contact\'s data deleted OK.';
            var contactObj = JSON.parse(sessionStorage.getItem('jsonContact'));
            var dao = new Dao();
            dao.deleteItem("Contacts", syncGetKeyField(contactObj, "Contacts"),
            undefined, undefined, undefined,
            function (event) {
                $.mobile.hidePageLoadingMsg();
                g_alert('Contact has been deleted.');
                companyFetchContacts();
            });
            companyShowContact(true);
        } else {
            message = 'ERROR: ' + response.ErrorMessage;
            g_alert(message);
        }         
    } else {
        message = 'ERROR: An error occurred while deliting contact\'s data.';
        g_alert(message);
    }


    
        
}


/*
 * fetch contact for a company and add to list. Onclick, show popup
 */
function companyFetchContacts() {
    var dao = new Dao();
    $('#contactlist').empty();

    dao.cursor('Contacts', undefined, undefined,
    			function (contact) {
        			if (contact.AccountID == g_currentCompany().AccountID && contact.SupplierID.toLowerCase() == g_currentCompany().SupplierID.toLowerCase()) {
        			    
        				g_append('#contactlist', '<li data-theme="c"><a>' + contact.Name + '</a></li> ');
        			    
			            $( '#contactlist li:last' ).click(function( event ) {
			            	var jsonForm = new JsonForm();
			            	jsonForm.show(g_currentUser().SupplierID, '#contactdetailsContent', contact, 'Contact');
			            	companyShowContact(false);
						}); 
        			}
    			},
    			undefined,
    			function (event) {
    		        $('#contactlist').listview('refresh');
    		    });
}

/*
 * Creates a new contact and shows popup
 */
function companyCreateContact() {
	
     var newContact = new Object();
     
     newContact.SupplierID = g_currentUser().SupplierID;
     newContact.AccountID = g_currentCompany().AccountID;
     newContact.Counter = createId();
     newContact.Email = "";
     newContact.Mobile = "";
     newContact.Name = "";
     newContact.Position = "";
     newContact.TEL = "";
     newContact.Deleted = false;
     newContact.PostedToErp = false;
     var jsonForm = new JsonForm();
     $('#popupContent').empty();
     jsonForm.show(g_currentUser().SupplierID, '#contactdetailsContent', newContact, 'Contact');  
}

function companyFetchGPSPosition() {
	
	if (navigator.geolocation)
		navigator.geolocation.getCurrentPosition(companySaveGPSPosition, companyOnGPSError);
	else
		errorMessage="Geolocation is not supported by this browser.";
}

function companySaveGPSPosition(position) {
	
	var company = g_currentCompany();
	company.Latitude = position.coords.latitude;
	company.Longitude = position.coords.longitude;
	
	try {
		var dao = new Dao();
		dao.put(company, "Companies", company.key , undefined, undefined, undefined);
		g_saveObjectForSync(company, company.key, "Companies", "Modify", undefined);
		
		sessionStorage.setItem('currentCompany', JSON.stringify(company));
		
		companyShowLocation(company);
		
	} catch (err) {	
	    g_alert('Error saving GPS position:' + err.message);
		return;
	}
}

function companyOnGPSError(error) {

	var errorMessage = '';
	
	switch (error.code) {
    	case error.PERMISSION_DENIED:
    		errorMessage = "User denied the request for Geolocation.";
    		break;
    	case error.POSITION_UNAVAILABLE:
    		errorMessage = "Location information is unavailable.";
    		break;
    	case error.TIMEOUT:
    		errorMessage = "The request to get user location timed out.";
    		break;
    	case error.UNKNOWN_ERROR:
    		errorMessage = "An unknown error occurred.";
    		break;
	}
	
	g_alert(errorMessage);
}

function companyShowLocation(company) {
	
	var positionCoordinates = company.Latitude + ',' + company.Longitude;		
	$('#imgmap').attr('src', 'http://maps.googleapis.com/maps/api/staticmap?center=' + 
							positionCoordinates + '&zoom=14' + '&markers=' + positionCoordinates + '&size=600x500&sensor=false');
	$('#map').show();
	$('#gps').hide();
}

function companyCreateSaveCompanyURL(company) {
    var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_account_modifyFromApp&params=(%27' + 
            (company.SupplierID ? company.SupplierID : '') + '%27|%27' +
            (company.AccountID ? company.AccountID : '') + '%27|%27' +
            (company.BranchID ? company.BranchID : '') + '%27|%27' +
            (company.Name ? company.Name : '')+ '%27|' +
            ((company.VAT || company.VAT === 0) ? company.VAT : '') + '|%27' +
            (company.Pricelist ? company.Pricelist : '') + '%27|%27' +
            (company.AccountGroup ? company.AccountGroup : '') + '%27|%27' +
            (company.UserField01 ? company.UserField01 : '') + '%27|%27' +
            (company.UserField02 ? company.UserField02 : '') + '%27|%27' +
            (company.UserField03 ? company.UserField03 : '') + '%27|%27' +
            (company.UserField04 ? company.UserField04 : '') + '%27|%27' +
            (company.UserField05 ? company.UserField05 : '') + '%27|%27' +
            (company.UserField06 ? company.UserField06 : '') + '%27|%27' +
            (company.UserField07 ? company.UserField07 : '') + '%27|%27' +
            (company.UserField08 ? company.UserField08 : '') + '%27|%27' +
            (company.UserField09 ? company.UserField09 : '') + '%27|%27' +
            (company.UserField10 ? company.UserField10 : '') + '%27|%27' +
            (company.AccountType ? company.AccountType : '') + '%27|' +
            (company.SharedCompany ? '1' : '0') + '|' +
            (company.Deleted ? '1' : '0') + '|%27' +
            (company.Latitude ? company.Latitude : '') + '%27|%27' +
            (company.Longitude ? company.Longitude : '') + '%27|%27' +
            (company.NextVisitDate ? ((company.NextVisitDate.indexOf('Date') !== -1) ? '1900-01-01' : company.NextVisitDate) : '1900-01-01') + '%27|' +
            (company.PostedToErp ? '1' : '0') + ')';
    
    return url;
}

function companyCreateSaveContactURL(contact) {
    var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_contacts_modifyFromApp&params=(%27' + 
            (contact.SupplierID ? contact.SupplierID : '') + '%27|%27' +
            (contact.AccountID ? contact.AccountID : '') + '%27|%27' +
            (contact.Counter ? contact.Counter : '') + '%27|%27' +
            (contact.Name ? contact.Name : '') + '%27|%27' +
            (contact.Position ? contact.Position : '') + '%27|%27' +
            (contact.TEL ? contact.TEL : '') + '%27|%27' +
            (contact.Mobile ? contact.Mobile : '') + '%27|%27' +
            (contact.Email ? contact.Email : '') + '%27|%27' +
            (contact.UserField1 ? contact.UserField1 : '') + '%27|%27' +
            (contact.UserField2 ? contact.UserField2 : '') + '%27|%27' +
            (contact.UserField3 ? contact.UserField3 : '') + '%27|%27' +
            (contact.UserField4 ? contact.UserField4 : '') + '%27|%27' +
            (contact.UserField5 ? contact.UserField5 : '') + '%27|' +
            (contact.Deleted ? '1' : '0') + '|' + 
            (contact.PostedToErp ? '1' : '0') + ')';
    
    return url;
}