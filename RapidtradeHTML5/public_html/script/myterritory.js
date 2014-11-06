/*
 * variables
 */

var g_myterritoryCustomerList;
var g_myterritoryItems = [];

var g_myterritoryPageTranslation = {};

function myterritoryOnPageBeforeCreate() {
    
    g_myterritoryPageTranslation = translation('myterritorypage');
}

/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function myterritoryOnPageShow() {
    
    g_myterritoryPageTranslation.safeExecute(function() {
        
        g_myterritoryPageTranslation.translateButton('#addcustomer', 'Add Customer');
        g_myterritoryPageTranslation.translateButton('#savecustomer', 'Save');
        g_myterritoryPageTranslation.translateButton('#cancelcustomer', 'Cancel');
    });
    
    myterritoryOnPageShowSmall();
	
    if (!myterritoryFromCache()) {
        
        var dao = new Dao();
        dao.openDB(function () { myterritoryInit(); });
    }
    
    sessionStorage.removeItem('lastRangeType');
    
    myterritoryBind();
}

function myterritoryOnPageShowSmall() {

	if (g_isScreenSmall()) {
		$('.rtTableLabel').hide();
	}
}

/*
 * All binding to buttons etc. should happen in this <yyy>Bind function() method
 */
function myterritoryBind() {
 	
    //bind add customer
    $('#addcustomer').click(function () {
        myterritoryCreateCompanyObject();
        myTerritoryShowCustomerForm(true);
    });

    // bind search controls
    $("#searchTerritory").keypress(function (event) {
        var keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            $('#searchTerritorybtn').click();
        }
    });

    $('#searchTerritorybtn').click(function () {
        g_myterritorySearchMyTerritoryText = $('#searchTerritory').attr('value');
        g_myterritoryItemsOnPage = 0;
        g_myterritoryCurrentMyterritoryPage = 1;
        g_myterritoryCustomerList = '';

        if (g_myterritorySearchMyTerritoryText != "" || g_myterritorySearchMyTerritoryText != null) {
            g_myterritorySearchMyTerritoryText = g_myterritorySearchMyTerritoryText.toLowerCase();
        }

        myterritoryFetchCompanies();
    });

    //
    if (g_vanSales){
    	$("input[type='radio']").bind( "change", function(event, ui) {
    	    sessionStorage.setItem('SGforBranch', this.id);
    	    if (!myterritoryFromCache()) {

    	        g_myterritoryCurrentMyterritoryPage = 1;
    	        g_myterritoryNumerOfIteminMyterritory = 0;
    	        g_myterritoryItemsHtml = '';
    	        g_myterritoryItemsOnPage = 0;
    	        myterritoryFetchCompanies();
    	    }
    	    });

    }

    $("#mtnext, #mtprev").click(function () {
        if ($(this).attr('id') == 'mtnext') {
            if (g_myterritoryNumerOfIteminMyterritory - (g_myterritoryCurrentMyterritoryPage * 50) > 0) {
                g_myterritoryCurrentMyterritoryPage++;
                g_myterritoryNumerOfIteminMyterritory = 0;
                g_myterritoryItemsOnPage = 0;
                g_myterritoryCustomerList = '';
                myterritoryFetchCompanies();
            }
        } else {
            if (g_myterritoryCurrentMyterritoryPage > 1) {
                g_myterritoryCurrentMyterritoryPage--;
                g_myterritoryNumerOfIteminMyterritory = 0;
                g_myterritoryItemsOnPage = 0;
                g_myterritoryCustomerList = '';
                myterritoryFetchCompanies();
            }
        }
    });

    $('#myTerritorytoMenu').click(function () {
    	
    if ($('#myTerritorytoMenu .ui-btn-text').text() == 'Back')
    	myTerritoryShowCustomerForm(false);
    else	
    	g_loadMenu();
   });
    
    $('#savecustomer, #cancelcustomer').click(function () {
    	
    	if ($(this).attr('id') == 'savecustomer') 
    		DaoOptions.getValue('LiveCompanyAddURL') ? myterritorySaveLiveCompany() : myterritorySaveCompany();
    	else
    		myTerritoryShowCustomerForm(false);
    });

}

/*
 * Look for our user, if it doesn't exist, call sync screen
 */
function myterritoryInit() {
	
    g_myterritoryCurrentMyterritoryPage = 1;
    g_myterritoryNumerOfIteminMyterritory = 0;
    g_myterritoryItemsHtml = '';
    g_myterritoryItemsOnPage = 0;
	//for supergroup
	if (g_vanSales) {
		$("#addcustomer").hide();
		$("#SGforBranch").show();
		sessionStorage.setItem('SGforBranch','sgradio1');
	} else {
		$("#SGforBranch").hide();
		$("#addcustomer").show();
	}	
	
	//--------------
	$('.hidden').removeClass('hidden');
	g_myterritoryCustomerList = '';
	myterritoryFetchCompanies();
}

/*
 * fetch companies for a myterritory and add to list. Onclick, go to company 
 */
function myterritoryFetchCompanies(){
	
	$.mobile.showPageLoadingMsg();
	$('#g_myterritoryCustomerList').empty();
	
    var dao = new Dao();
    dao.fetchCompanies(g_myterritorySearchMyTerritoryText, myterritoryOnSuccessRead, undefined, myterritoryOnComplete);
}
 
function myterritoryOnSuccessRead(company) {

    var companyKey = new String(company.key).toLowerCase();
    var companyDescription = new String(company.Name).toLowerCase();
    var companyBranchID = new String(company.BranchID).toLowerCase();
    
    try {
    	companyKey = companyKey + company.Userfield01 + + company.Userfield02 + company.Userfield03 + company.Userfield04 + company.Userfield05 + company.Userfield06 + company.Userfield07 + company.Userfield08;
    	companyKey = companyKey.toLowerCase();
    } catch (err){
    	
    }

    if (!g_myterritorySearchMyTerritoryText || g_myterritorySearchMyTerritoryText == "" || companyKey.indexOf(g_myterritorySearchMyTerritoryText) != -1 || companyDescription.indexOf(g_myterritorySearchMyTerritoryText) != -1 ||
    companyBranchID.indexOf(g_myterritorySearchMyTerritoryText) != -1) {

        currentItem = (g_myterritoryCurrentMyterritoryPage - 1) * 50;
        maxItemOnpage = g_myterritoryCurrentMyterritoryPage * 50;

        $('#mtpageNumber').html(g_myterritoryCurrentMyterritoryPage);

        if (g_vanSales) {
            if (sessionStorage.getItem('SGforBranch') == 'sgradio1') {

                if (g_currentUser().RepID.toUpperCase() == company.BranchID.toUpperCase()) {
                    if (g_myterritoryItemsOnPage >= currentItem && g_myterritoryItemsOnPage < maxItemOnpage) {
                        g_myterritoryCustomerList = g_myterritoryCustomerList + '<li data-theme="c"><a onclick="myterritoryOnCompanyClicked(\'' + company.key + '\')">' + company.Name + '[' + company.BranchID + ']</a></li>';
                        g_myterritoryItems.push(company);
                    }
                    g_myterritoryItemsOnPage++;
                    g_myterritoryNumerOfIteminMyterritory++;
                }
            } else {

                if (g_currentUser().RepID.toUpperCase() != company.BranchID.toUpperCase()) {
                    if (g_myterritoryItemsOnPage >= currentItem && g_myterritoryItemsOnPage < maxItemOnpage) {
                        g_myterritoryCustomerList = g_myterritoryCustomerList + '<li data-theme="c"><a onclick="myterritoryOnCompanyClicked(\'' + company.key + '\')">' + company.Name + '[' + company.BranchID + ']</a></li>';
                        g_myterritoryItems.push(company);
                    }
                    g_myterritoryItemsOnPage++;
                    g_myterritoryNumerOfIteminMyterritory++;
                }

            }
        } else {
            if (g_myterritoryItemsOnPage >= currentItem && g_myterritoryItemsOnPage < maxItemOnpage) {
                g_myterritoryCustomerList = g_myterritoryCustomerList + 
                							'<li data-theme="c"><a onclick="myterritoryOnCompanyClicked(\'' + company.key + '\',\'companyPanel\')">' + company.Name + '</a>' + 
                							'<a onclick="myterritoryOnCompanyClicked(\'' + company.key + '\',\'pricelistPanel\')">Pricelist</a>' +
                							'</li>';
                g_myterritoryItems.push(company);
            }
            g_myterritoryItemsOnPage++;
            g_myterritoryNumerOfIteminMyterritory++;
        }
    }    
}

function myterritoryOnComplete() {
	
    g_append('#g_myterritoryCustomerList', g_myterritoryCustomerList);
	//$('#g_myterritoryCustomerList').append(g_myterritoryCustomerList);
	$('#g_myterritoryCustomerList').listview('refresh');
	myterritoryToCache();
	g_myterritoryCustomerList = '';
	
	myterritoryShowNextPrev();
	$.mobile.hidePageLoadingMsg();	
}


function myterritorySaveCompany(accountId) {
	
    var dao = new Dao();
    var companyObj = JSON.parse(sessionStorage.getItem('jsonCompany'));
    
    if (accountId)
    	companyObj.AccountID = accountId;
    
    companyObj.key = companyObj.SupplierID + companyObj.AccountID + companyObj.BranchID;

    dao.put(companyObj, 
    		"Companies", 
    		companyObj.key,
    		function (event) { 
    	
    			var sessionState = JSON.parse(sessionStorage.getItem('cacheMyTerritory'));
    			
    			g_myterritoryItems = sessionState.Items;
    			g_myterritoryCustomerList = sessionState.ItemsHtml;
    			
    			myterritoryOnSuccessRead(companyObj);
    			
    			g_html('#g_myterritoryCustomerList', g_myterritoryCustomerList);
				$('#g_myterritoryCustomerList').listview('refresh');
				
				myterritoryToCache();
				g_myterritoryCustomerList = '';
				
				myterritoryShowNextPrev();
    			
    			myterritoryOnCompanyClicked(companyObj.key);
    		},
    		undefined,
    		undefined);
    
    if (!accountId) {
    
	    g_saveObjectForSync(companyObj, companyObj.key, "Companies", "Modify", undefined);
	    
	    var userAccount = new Object();
	    
	    userAccount.UserID = g_currentUser().UserID;
	    userAccount.AccountID = companyObj.AccountID;
	    userAccount.BranchID = companyObj.BranchID;
	    userAccount.SupplierID = companyObj.SupplierID;
	    userAccount.Deleted = false;
	    
	    g_saveObjectForSync(userAccount, "UC" + userAccount.SupplierID + userAccount.AccountID + userAccount.BranchID, "UserCompany", "Modify", undefined);
	}
    
	myTerritoryShowCustomerForm(false);
    
}

function myterritorySaveLiveCompany() {
	
	var companyInfo = {};
	
	companyInfo.json = sessionStorage.getItem('jsonCompany');	
	companyInfo.Table = 'Companies';
	companyInfo.Method = 'Modify';
	
	$.mobile.showPageLoadingMsg();
	
	g_ajaxpost(companyInfo, DaoOptions.getValue('LiveCompanyAddURL'), myterritorySaveLiveCompanyOnResponse, myterritorySaveLiveCompanyOnResponse);
}

function myterritorySaveLiveCompanyOnResponse() {
	
	g_ajaxget(DaoOptions.getValue('LiveGetResultsURL'), myterritoryOnGetResultsSuccess, myterritoryOnGetResultsError);
}

function myterritoryOnGetResultsSuccess(result) {
	
	$.mobile.hidePageLoadingMsg();
	
	var message = '';
	
	if (result._getErrorMsg) {
		
		message = 'ERROR:' + result._getErrorMsg;
		
	} else if (result._getGuID == JSON.parse(sessionStorage.getItem('jsonCompany')).AccountID) {
		
		message = 'Customer created OK.';
		myterritorySaveCompany(result._getReturnID);
	
	} else {
		
		message = 'ERROR: Customer not created.';
	}
	
	g_alert(message);
}

function myterritoryOnGetResultsError() {
	
	$.mobile.hidePageLoadingMsg();
	g_alert('Error in retrieving operation result.');
}

function myTerritoryShowCustomerForm(show) {
	
	$('#newCustomerDiv').toggle(show);
	$('#customerListDiv').toggle(!show);
	$('#addcustomer').toggle(!show);
	
	if (show)
		$('#myTerritorytoMenu .ui-btn-text').text('Back');
	else
		$('#myTerritorytoMenu .ui-btn-text').text('Menu');
}

function myterritoryToCache() {

    var sessionState = {
        "Page": g_myterritoryCurrentMyterritoryPage,
        "SupplierID": g_currentUser().SupplierID,
        "ItemsHtml": g_myterritoryCustomerList,
        "Items": g_myterritoryItems,
        "TotalItems": g_myterritoryNumerOfIteminMyterritory,
        "SearchText": $('#searchTerritory').attr('value'),
        "ItemsOnPage": g_myterritoryItemsOnPage
    };
    if (sessionStorage.getItem('SGforBranch') == 'sgradio1') {
        sessionStorage.setItem('cacheExVan', JSON.stringify(sessionState));
    }
    else if (sessionStorage.getItem('SGforBranch') == 'sgradio2') {
        sessionStorage.setItem('cacheWH', JSON.stringify(sessionState));
    }
    else {
        sessionStorage.setItem('cacheMyTerritory', JSON.stringify(sessionState));
    }
}


function myterritoryFromCache() {
	var gotoPoint = 'a';
	try {
		gotoPoint = 'b';
        $('#NextPrevButtons').hide();
        g_myterritoryCustomerList = '';
        gotoPoint = 'c';
        if ($('#addcustomer').hasClass('hidden'))
        	$('#addcustomer').removeClass('hidden');
        gotoPoint = 'd';
        var sessionState = null;
        if (sessionStorage.getItem('SGforBranch') == 'sgradio1') {
        	gotoPoint = 'e';
            sessionState = JSON.parse(sessionStorage.getItem('cacheExVan'));
            $("#addcustomer").hide();
            $("#SGforBranch").removeClass('hidden');
            sessionStorage.setItem('SGforBranch', 'sgradio1');
            $("#sgradio1").attr("checked", true).checkboxradio("refresh");
            $("#sgradio2").attr("checked", false).checkboxradio("refresh");
        } else if (sessionStorage.getItem('SGforBranch') == 'sgradio2') {
        	gotoPoint = 'f';
            sessionState = JSON.parse(sessionStorage.getItem('cacheWH'));
            $("#addcustomer").hide();
            $("#SGforBranch").removeClass('hidden');
            sessionStorage.setItem('SGforBranch', 'sgradio2');
            $("#sgradio1").attr("checked", false).checkboxradio("refresh");
            $("#sgradio2").attr("checked", true).checkboxradio("refresh");
        } else {
        	gotoPoint = 'h';
        	if (sessionStorage.getItem('cacheMyTerritory') != null) 
        		sessionState = JSON.parse(sessionStorage.getItem('cacheMyTerritory'));
            $("#addcustomer").show();
            $("#SGforBranch").hide();
        }

        if (sessionState && sessionState != null && sessionState.SupplierID == g_currentUser().SupplierID) {
        	gotoPoint = 'I';
            $('#searchTerritory').attr('value', sessionState.SearchText);
            g_myterritorySearchMyTerritoryText = sessionState.SearchText;
            g_myterritoryItems = sessionState.Items;
            g_myterritoryCurrentMyterritoryPage = sessionState.Page;
            g_myterritoryNumerOfIteminMyterritory = sessionState.TotalItems;
            g_myterritoryCustomerList = sessionState.ItemsHtml;
            g_myterritoryItemsOnPage = sessionState.ItemsOnPage;

            myterritoryShowNextPrev();

            $('#mtpageNumber').html(sessionState.Page);
            $('#g_myterritoryCustomerList').empty();
            g_append('#g_myterritoryCustomerList', sessionState.ItemsHtml);
            $('#g_myterritoryCustomerList').listview('refresh');
            return true;
        }
        return false;
	} catch (err) {
		alert (gotoPoint + err.message);
		return false;
	}    
}


function myterritoryOnCompanyClicked(key, page){
    sessionStorage.removeItem('pricelistsearchtxt');
    sessionStorage.removeItem('cachePricelist');
    sessionStorage.setItem('lastPanelId', page);
    advancedSearchResetStorage();

    var dao = new Dao();	
    dao.get('Companies',
                    key,
                    function(company) {
                            $.mobile.showPageLoadingMsg();
                            sessionStorage.setItem('companyBack',"myterritory.html");
                            sessionStorage.setItem('currentCompany',JSON.stringify(company)); //store for other pages

                            if (DaoOptions.getValue('LiveCreditCheckURL'))
                                     g_fetchAvailableCredit();

                             $.mobile.changePage("company.html");

                    },
                    undefined,undefined);	
}
function myterritoryShowNextPrev() {

    if (g_myterritoryItemsOnPage < 50 && g_myterritoryCurrentMyterritoryPage == 1) {
        $('#mtNextPrevButtons').addClass('hidden');
        $('#mtprev').hide();
        $('#mtnext').hide();
    }
    else if (g_myterritoryCurrentMyterritoryPage == 1) {
        $('#mtNextPrevButtons').removeClass('hidden');
        $('#mtprev').hide();
        $('#mtnext').show();
    }
    else if (g_myterritoryItemsOnPage - (g_myterritoryCurrentMyterritoryPage * 50) <= 0) {
        $('#mtNextPrevButtons').removeClass('hidden');
        $('#mtprev').show();
        $('#mtnext').hide();
    }
    else {
        $('#mtNextPrevButtons').removeClass('hidden');
        $('#mtprev').show();
        $('#mtnext').show();
    }
    
    $.mobile.hidePageLoadingMsg();
}

/*
 * Creates a new customer and shows popup
 */
function myterritoryCreateCompanyObject() {

    var newCompany =  new Object();
    newCompany.AccountGroup = "";
    newCompany.AccountID = createId();
    newCompany.AccountType = "";
    newCompany.AddressID = 0;
    newCompany.BranchID = "";
    newCompany.Deleted = false;
    newCompany.Name = "";
    newCompany.Pricelist = "";
    newCompany.SharedCompany = false;
    newCompany.SupplierID = g_currentUser().SupplierID;
    newCompany.RepID = g_currentUser().RepID;
    newCompany.UserID = g_currentUser().UserID;
    newCompany.VAT = 0;
   
    var jsonForm = new JsonForm();
    $('#popupContent').empty();
    jsonForm.show(g_currentUser().SupplierID, '#newCustomerFields', newCompany, 'Company');  
}
