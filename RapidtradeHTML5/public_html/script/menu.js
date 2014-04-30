function menuOnPageShow() {
	
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
	dao.openDB(function (user) { menuInit(); });
	$('#nosync').hide();
	
	menuBind();
}

function menuBind() {
	
	$('.customerMenuItem a').off();
	$('.customerMenuItem a').on('click', function() {
		
		sessionStorage.setItem('lastPanelId', this.id + 'Panel');
		$.mobile.changePage('company.html', {transition:"none"});
	});
}

function menuOnPageShowSmall() {
	
	if (g_isScreenSmall()) {
		
		$('#todayImg').attr('src', 'img/Calendar-32.png');
		$('#myTerritoryImg').attr('src', 'img/Client-Male-Light-32.png');
		$('#myKPIsImg').attr('src', 'img/Bar-Graph-32.png');
		$('#callCycleImg').attr('src', 'img/car-32.png');
		$('#replenishImg').attr('src', 'img/Truck-32.png');
		$('#grvImg').attr('src', 'img/receipt-32.png');
		$('#menuMainPanel').attr('class','greypanel menuMainPanelSml');
	}	
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
     sessionStorage.setItem("currentordertype", "pod");
     $.mobile.changePage("grv.html", { transition: "slide" });
}

function menuOnMyTerritoryClick() {	
	
	sessionStorage.setItem('currentordertype', 'Order');
	sessionStorage.setItem('ShoppingCartReturnPage', 'pricelist');
	sessionStorage.setItem('ShoppingCartNoFooter', false);
	sessionStorage.setItem('ShoppingCartNoChangeAllowed', false);
	sessionStorage.setItem('orderheaderNext', 'activity');	
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
				
				if (localStorage.getItem('lastSyncDate') != g_today()) { 					
					alert('You haven\'t synchronised today. You should do so now to keep up to date. After clicking OK, click on the Syncronise button');
				}
		
				sessionStorage.setItem('currentUser', JSON.stringify(user));
				g_callCycleCurrentUserID = user.UserID;
				g_syncIsFirstSync = false;
				
				$('#welcome').text(user.Name);
				menuFetchConfigData();

				$('#grvTitle').text('Deliveries');

				menuShowButtons();
				menuFetchDefaultCustomer();
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
	
	if (g_currentUser().Role) {
		
		if (g_currentUser().Role.toUpperCase().indexOf('CUST') != -1) {
			
			sessionStorage.setItem('PricelistNoFooter','true');
			sessionStorage.setItem('ShoppingCartNoFooter','true');
			sessionStorage.setItem('CompanyNoFooter','true');
			sessionStorage.setItem('HistoryNoFooter','true');
			
			$('.menuIconPanel').hide();
			$('#syncMenuItem').show();
			$('.customerMenuItem').show();
			
		} else {
			
			$('.menuIconPanel').show();
			$('.customerMenuItem').hide();
		
			$('#vansalesonlyreplenishstock').toggle(g_currentUser().Role.toUpperCase().indexOf('REPL') != -1);
			$('#vansalesonlyreceivestock').toggle(g_currentUser().Role.toUpperCase().indexOf('GRV') != -1);
			$('#vanonlydelivery').toggle(g_currentUser().Role.toUpperCase().indexOf('POD') != -1);
			$('#vansalesonlystocktake').toggle(g_currentUser().Role.toUpperCase().indexOf('STOCK') != -1);
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
	DaoOptions.fetchOptions();
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