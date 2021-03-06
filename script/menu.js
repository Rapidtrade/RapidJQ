function menuOnPageBeforeCreate() {

     // this must be done as a first thing due to a specific initialisation of the company page
    g_companyPageTranslation = translation('companypage');

    g_menuPageTranslation = translation('menupage');


    if (sessionStorage.getItem('currentActivity'))
        sessionStorage.removeItem('currentActivity');
}

function menuOnPageShow() {

    $('.menuLogo').attr('src', g_menuLogo);
    g_iPadBar('#menupage');
    if (window.MSApp) {
        WinJS.Application.onsettings = function (e) {
            e.detail.applicationcommands = {
                "About": { title: "About", href: "/about.html" }
            };
            WinJS.UI.SettingsFlyout.populateSettings(e);
        };
        WinJS.Application.start();
    }

    menuOnPageShowSmall();

    sessionStorage.setItem('orderheaderNext', 'menu');

    var dao = new Dao();
    dao.openDB(function (user) { menuInit(); menuFetchMandatoryActivities(); });
    $('#nosync').hide();

    //menuFetchMandatoryActivities();
    menuBind();
}

function menuBind() {

    $('.customerMenuItem a').off().on('click', function() {

        sessionStorage.setItem('lastPanelId', this.id + 'Panel');
        $.mobile.changePage('company.html', {transition:"none"});
    });

    $('#testDiv select').off().on('slidestop', function() {

        localStorage.setItem('Portuguese', $(this).val());
        g_alert(g_menuPageTranslation.translateText('Please restart the application for the language change to take effect.'));
    });
}

function menuOnPageShowSmall() {

    if (g_isScreenSmall()) {

            $('#syncImg').attr('src', 'img/sync32.png');
            $('#todayImg').attr('src', 'img/Calendar-32.png');
            $('#myTerritoryImg').attr('src', 'img/Client-Male-Light-32.png');
            $('#myKPIsImg').attr('src', 'img/Bar-Graph-32.png');
            $('#callCycleImg').attr('src', 'img/car-32.png');
            $('#replenishImg').attr('src', 'img/Truck-32.png');
            $('#grvImg').attr('src', 'img/receipt-32.png');
            $('#menuMainPanel').attr('class','greypanel menuMainPanelSml');

            var menuBtns = $('.menuIconLabel');
            menuBtns.removeClass('menuIconLabel');
            menuBtns.addClass('menuIconLabelSmall');
    }
}

function menuFetchMandatoryActivities() {

    var requiredActivities = [];

    var dao = new Dao();
    dao.cursor('ActivityTypes', undefined, undefined, function(item) {

        // fetch activities with 1 or 2 asterisks at the end of label
        if ($.trim(item.Label).match(/\*{1,2}$/))
            requiredActivities.push(item.EventID);
    }, undefined,

    function () {

        sessionStorage.setItem('requiredActivities', requiredActivities);
    }
    );
}

function menuOnReplenishClick() {

    var dao = new Dao();
    dao.index('Companies',
        g_currentUser().RepID.toUpperCase(),
        'AccountID',
         function (company) {
                 sessionStorage.setItem("currentordertype", "repl");
                 sessionStorage.setItem('ShoppingCartNoFooter','true');
                 //g_vanSales = true;
                 sessionStorage.setItem('currentCompany', JSON.stringify(company));
                 sessionStorage.setItem('lastPanelId', 'pricelistPanel');
                 $.mobile.changePage("company.html", { transition: "none" });
         },
         undefined, undefined);
}

function menuOnStocktakeClick() {

    var dao = new Dao();
    dao.index('Companies',
        g_currentUser().RepID.toUpperCase(),
        'AccountID',
         function (company) {
    		sessionStorage.setItem('ShoppingCartReturnPage', 'pricelist');
            sessionStorage.setItem("currentordertype", "stock");
            sessionStorage.setItem('ShoppingCartNoFooter','true');
            //g_vanSales = true;
            sessionStorage.setItem('currentCompany', JSON.stringify(company));
            sessionStorage.setItem('lastPanelId', 'pricelistPanel');
            $.mobile.changePage("company.html", { transition: "none" });
         },
         undefined, undefined);
}


function menuOnGRVClick() {

    var dao = new Dao();
    dao.index ( 'Companies',
        g_currentUser().RepID.toUpperCase(),
        'AccountID',
         function (company) {
             sessionStorage.setItem('currentCompany', JSON.stringify(company));
             sessionStorage.setItem("currentordertype", "grv");
             $.mobile.changePage("grv.html", { transition: "none" });
         },
         undefined ,
         undefined
         );
}

function menuOnPODClick() {

	 sessionStorage.removeItem('currentCompany');
     sessionStorage.setItem("currentordertype", "POD");
     if ((DaoOptions.getValue('UseRoutesLastSelectedDate') === undefined || DaoOptions.getValue('UseRoutesLastSelectedDate') === 'false') && localStorage.getItem('routesLastSelectedDate'))
         localStorage.removeItem('routesLastSelectedDate');
//    $.mobile.changePage("grv.html", { transition: "slide" });
    $.mobile.changePage("route.html", { transition: "slide" });
}

function menuOnMyTerritoryClick() {

	sessionStorage.setItem('currentordertype', 'Order');
	sessionStorage.setItem('ShoppingCartReturnPage', 'pricelist');
	sessionStorage.setItem('ShoppingCartNoFooter', false);
	sessionStorage.setItem('ShoppingCartNoChangeAllowed', false);
        if (DaoOptions.getValue('OrderHeaderNextPage') && g_isUserIntSalse()) {
            sessionStorage.setItem('orderheaderNext', DaoOptions.getValue('OrderHeaderNextPage'));
        } else {
            sessionStorage.setItem('orderheaderNext', 'activity');
        }
}

function menuOnTodayClick() {

    sessionStorage.setItem('orderheaderNext', 'activity');
}

/*
 * Look for our user, it it doesn't exist, call sync screen
 */
function menuInit(){

	$.support.core = true;
	$.mobile.allowCrossDomainPages = true;
	$.mobile.pushState = false;

	menuReset();
	menuFetchUnsentObjects();

	if (!g_defaultDisplayFields.length) g_createDefaultDisplayFields();

	if (g_currentUser()) {
            if (g_forceUserToSyncOnNewMonth() || g_forceUserToSyncOnDate()) {
                return;
            } else {
                sessionStorage.setItem('disableMenuButton', 'false');
            }
            $('#welcome').text(g_currentUser().Name);
            menuFetchConfigData();
            menuShowButtons();
            menuFetchDefaultCustomer();
            return;
	}

	var dao = new Dao();
	dao.get('Users',
                'user',
                function(user) {
                    if (localStorage.getItem('tokenAD')) {
                        var now = Date.now();
                        var tokenExpiration = $.isNumeric(localStorage.getItem('tokenExpiration')) ? parseInt(localStorage.getItem('tokenExpiration'), 10) : Date.now();
                        if (now > tokenExpiration) {
                            g_alert(g_menuPageTranslation.translateText('You haven`t synchronised today. You should do so now to keep up to date.'));
                            var tablesToClear = DaoOptions.getValue('ADSyncClearTables', 'Companies,Pricelists,DiscountValues').split(',');
                            for(var i = 0; i < tablesToClear.length; ++i) {
                                localStorage.setItem('lastversion' + tablesToClear[i], 0);
                                dao.clear(tablesToClear[i]);
                            }

                            $.mobile.changePage('sync.html', { transition: "none"});
                            sessionStorage.setItem('disableMenuButton', 'true');

                            return;
                        } else {
                            sessionStorage.setItem('currentUser', JSON.stringify(user));
                            g_callCycleCurrentUserID = user.UserID;
                            g_syncIsFirstSync = false;

                            $('#welcome').text(user.Name);
                            menuFetchConfigData();

                            $('#grvTitle').text('Deliveries');

                            menuShowButtons();
                            menuFetchDefaultCustomer();
                        }

                    } else {
                        if (g_forceUserToSyncOnNewMonth() || g_forceUserToSyncOnDate()) {
                            return;
                        } else {
                            sessionStorage.setItem('disableMenuButton', 'false');
                        }
                        var mandatorySyncDay = Number(DaoOptions.getValue('ForceWeeklyUpdate'));
                        var isMandatorySyncDayDefined = (mandatorySyncDay > -1 && mandatorySyncDay < 7);

                        var todaysDay = (new Date()).getDay();
                        var lastSyncDay = Number(localStorage.getItem('lastSyncDay'));

                        if ((todaysDay !== lastSyncDay) && (!isMandatorySyncDayDefined || (todaysDay === mandatorySyncDay))) {

                            g_alert(g_menuPageTranslation.translateText('You haven`t synchronised today. You should do so now to keep up to date.'));

                            if (isMandatorySyncDayDefined) {

                                dao.clear('Orders');
                                dao.clear('OrderItems');

                                $.mobile.changePage('sync.html', { transition: "none"});
                                sessionStorage.setItem('disableMenuButton', 'true');

                                return;
                            }
                        }

                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                        g_callCycleCurrentUserID = user.UserID;
                        g_syncIsFirstSync = false;

                        $('#welcome').text(user.Name);
                        menuFetchConfigData();

                        $('#grvTitle').text('Deliveries');

                        menuShowButtons();
                        menuFetchDefaultCustomer();
                    }
                },
                function(user) {

                    $.mobile.changePage('sync.html', { transition: "none"} );
                },
                undefined
                );
}

// For customers, go get first customer and set as current customer
function menuFetchDefaultCustomer() {
	var isCreditChecked = false;
	if (g_currentUser().Role && (g_currentUser().Role.toUpperCase().indexOf('CUST') != -1)) {
		var dao = new Dao();
		dao.fetchCompanies('', function(company) {
			sessionStorage.setItem('currentCompany', JSON.stringify(company));
			 if (DaoOptions.getValue('LiveCreditCheckURL') && !isCreditChecked) {
				 g_fetchAvailableCredit();
				 isCreditChecked = true;
			 }

		});
	}
}


function menuReset() {

	try {

		sessionStorage.removeItem('referenceDocID');
		sessionStorage.removeItem('currentordertype');

	} catch (err){

	}
}

function menuShowButtons() {
    $('#myTerritoryButton .multiLanguage').text('My Territory');
	if (g_currentUser().Role) {

		if (g_currentUser().Role.toUpperCase().indexOf('CUST') != -1) {



			$('.menuIconPanel').hide();
			$('#syncMenuItem, .customerMenuItem').show();
            var manageButtons = function(cnt) {
                if (cnt > 1) {
                    sessionStorage.setItem('customerMoreThan1Company', 'true');
                    $('.customerMenuItem:has(#pricelist)').hide();
                    $('#myTerritoryButton .multiLanguage').text('My Accounts');
                    $('#myTerritoryButton.menuIconPanel').show();
                    $('.customerMenuItem:has(#company)').hide();
                } else {
                    $('#syncMenuItem, .customerMenuItem').show();
                    sessionStorage.setItem('PricelistNoFooter','true');
                    sessionStorage.setItem('ShoppingCartNoFooter','true');
                    sessionStorage.setItem('CompanyNoFooter','true');
                    sessionStorage.setItem('HistoryNoFooter','true');
                }
            };
            var dao = new Dao();
            dao.count('Companies', '', 'index4',
                function (cnt) {
                    manageButtons(cnt);
                }, function(cnt) {
                    manageButtons(cnt);
            });

		} else {

			$('.menuIconPanel').show();
			$('.customerMenuItem').hide();

                        var role = g_currentUser().Role.toUpperCase();

                        $('#vansalesonlyreplenishstock').hide();
                        $('#vansalesonlyreceivestock').hide();
                        $('#vanonlydelivery').hide();
                        $('#vansalesonlystocktake').hide();

                        $('#myTerritoryButton')[(role.indexOf('POD ONLY') != -1) ? 'hide' : 'show']();
                        $('#todayButton')[(role.indexOf('POD ONLY') != -1) ? 'hide' : 'show']();
                        $('#vansalesonlyreplenishstock')[(role.indexOf('REPL') != -1) ? 'show' : 'hide']();
			$('#vansalesonlyreceivestock')[(role.indexOf('GRV') != -1) ? 'show' : 'hide']();
			$('#vanonlydelivery')[(role.indexOf('POD') != -1) ? 'show' : 'hide']();
			$('#vansalesonlystocktake')[(role.indexOf('STOCK') != -1) ? 'show' : 'hide']();
		}

	} else {

		$('.menuIconPanel').show();
		$('.customerMenuItem').hide();

		$('#vansalesonlyreplenishstock').hide();
		$('#vansalesonlyreceivestock').hide();
		$('#vanonlydelivery').hide();
		$('#vansalesonlystocktake').hide();
	}

	$('#grvLabel').text(g_menuGRVLabelText);
}

function menuFetchConfigData(){

    menuFetchDiscounts();
    menuFetchDiscountConditions();
    DaoOptions.fetchOptions(menuShowTestButton);
}

function menuShowTestButton() {

    if (DaoOptions.getValue('TestPortuguese') === 'true') {

        $('#testDiv').removeClass('invisible');
        $('#testDiv select').val(localStorage.getItem('Portuguese')).slider('refresh');
    }
}

function menuFetchUnsentObjects() {

    var dao = new Dao();
    var unsent = false;
    dao.cursor('Unsent', undefined, undefined,
                   function (event) {
                       unsent = true;
                   },
                   undefined,
                   function (event) {
                         if (unsent) {
                             $('#nosync').removeClass('hidden');
                             $('#nosync').show();
                         }
                         else {
                             $('#nosync').addClass('hidden');
                         }
                   });
}

function menuFetchDiscounts() {

    var dao = new Dao();
    var i =0;
    dao.cursor('Discount', undefined, undefined,
         function (discount) {

                 g_discounts[i] = discount;
                 g_discountsDictionary[discount.DiscountID] = discount;
                 i++;

         }
         , undefined, undefined);
}


function menuFetchDiscountConditions() {

    var dao = new Dao();
    var i = 0;
    dao.cursor('DiscountCondition', undefined, undefined,
         function (discountCondition) {

             g_discountConditions[i] = discountCondition;
             i++;

         }
         , undefined, undefined);
}
