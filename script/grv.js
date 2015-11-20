/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */
function grvOnPageShow() {
    
    $('.headerLogo').attr('src', g_logo);
    	
    if (sessionStorage.getItem("currentordertype")==='POD') {
            $('#grvTitle').html('Deliveries');
            $('#grvInfo').hide();
            $('#message').html('<br>There are no deliveries.');
            if (grvDeliveriesFromCache()) {
                grvBind();
                return;
            }
    }
    
    if (g_isOnline()) {	
        var dao = new Dao();
        dao.openDB(function (user) { grvInit(); });
    }     
        
    grvBind();
}

/*
 * reload the page from cache
 */
function grvBind() {
	
    $('#grvToMenu').unbind();
    $('#grvToMenu').click(function () {
       g_loadMenu();
   });
    
    $('#grvRefresh').unbind();
    $('#grvRefresh').click(function() {
    	grvFetchOrders();
    });
}

function grvDeliveriesFromCache() {
	
    var cachedDeliveryArray = JSON.parse(localStorage.getItem('CacheDeliveryOrders')) || [];

    if (cachedDeliveryArray.length)
            grvOrderListView(cachedDeliveryArray);

    return cachedDeliveryArray.length;
}

function grvInit() {
	
    g_iPadBar('#grvpage');
    type = sessionStorage.getItem("currentordertype");
    $('#noorders').hide();
    
    $('#grvRefresh').toggle(DaoOptions.getValue('DeliveryOrderType') !== undefined);
    
    var dao = new Dao();
    dao.cursor('BasketInfo', undefined, undefined,
                   function (basketinfo) {
                       if (DaoOptions.getValue('DeliveryOrderType') || (basketinfo.AccountID == g_currentCompany().AccountID && basketinfo.Type == type)) {
                           var dao1 = new Dao();
                           dao1.deleteItem('BasketInfo', basketinfo.key, undefined, undefined, undefined, undefined);
                       }

                   }, undefined, function (event) {
                	   
                	   if (sessionStorage.getItem("currentordertype")=='grv')
                		   sessionStorage.setItem('LastGRVAccountID', g_currentCompany().AccountID);
                	   
                       grvFetchOrders();
                   });
}

/*
 * fetch orders for a company 
 */
function grvFetchOrders() {
	
	$.mobile.showPageLoadingMsg();
	
	var url = '';
	
	if (sessionStorage.getItem("currentordertype")=='POD')
		url = g_restUrl + 'Deliveries/GetCollection?supplierID=' + g_currentUser().SupplierID + '&userID=' + g_currentUser().UserID + '&skip=0&top=100&format=json';
	else	
		url = g_restUrl + 'orders/GetCollectionByType?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID + '&orderType=repl&skip=0&top=100&format=json';

	var success = function (json) {		
		if (sessionStorage.getItem('currentordertype')=='POD')
			localStorage.setItem('CacheDeliveryOrders', JSON.stringify(json)); //cache results
		
	    grvOrderListView(json);
	    $('#orderlist').listview('refresh');
	    $.mobile.hidePageLoadingMsg();

	};
	var error = function (e) {
		
	    console.log(e.message);
	};
	
	g_ajaxget(url, success, error);
}

function grvSendOrderItemsToBasket(orderID, accountID) {
    
	$.mobile.showPageLoadingMsg();
	//g_grv_replorderid = orderID;
	sessionStorage.setItem('referenceDocID', orderID);
	var url = g_restUrl + 'Orders/GetOrderItems?supplierID=' + g_currentUser().SupplierID + '&accountID=' + accountID+ '&orderID=' + orderID + '&skip=0&top=100&format=json';
	
	var success = function (items) {
            
            $.mobile.hidePageLoadingMsg();
            
            var validItems = [];
            
            for (var i = 0; i < items.length; ++i) {
                
                if (g_currentUser().SupplierID === 'DS')
                    items[i].Quantity = items[i].UserField01;
                
                if (isNaN(items[i].Quantity))
                    continue;
                
                if (sessionStorage.getItem('currentordertype') !== 'POD'){

                    items[i].SupplierID = g_currentCompany().SupplierID;
                    items[i].AccountID = g_currentCompany().AccountID;	        	
	        }
                
                if (DaoOptions.getValue('CalcTaxPerProduct') === 'true')
                    items[i].VAT = items[i].RepNett;
                
                validItems.push(items[i]);
            }
            
            basket.saveItems(validItems, function() {
                
	    	sessionStorage.setItem('ShoppingCartNoFooter', true);
	    	sessionStorage.setItem('ShoppingCartNoChangeAllowed', true); 
	    	sessionStorage.setItem('ShoppingCartReturnPage', 'grv.html'); 
	    	
	    	$.mobile.changePage("shoppingCart.html", { transition: "none" });                
            });            

	    if (!validItems.length) 	    		    	
	    	g_alert('No order items!');

	};

	var error = function (e) {
	    console.log(e.message);
	};
	
	
	if (sessionStorage.getItem("currentordertype")=='POD') {
	    var dao = new Dao();
	    dao.index ( 'Companies',
	        accountID,
	        'AccountID',
	         function (company) {
	             sessionStorage.setItem('currentCompany', JSON.stringify(company));
	             g_ajaxget(url, success, error);
	         },
	         function (error){
	        	 console.log('ERROR: AccountID ' + accountID + ' not found in database.');
	         } , 
	         undefined	 
	        );	
	    
	} else {
		
		g_ajaxget(url, success, error);	
	}
}

/*
 * create table of orders, on click, show pop up with order details and ordered items
 */
function grvOrderListView(orders) {
	
    $("#orderlist").empty();
    var prevMonth = -1;
    var orderList = '';
    
    if (orders == null) {
    	$('#noorders').show();
    	return;
    }
    if (orders.length == 0) {
    	$('#noorders').show();
    	return;
    } else 
    	$('#noorders').hide();
    
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (var i = 0; i < orders.length; i++) { 
        var order = orders[i];       
        if ('true' == order.DeliverAccepted) {       	
        	continue;
        } else if (sessionStorage.getItem('currentordertype')=='grv' && ((order.Type != 'REPL') || order.UserField01 || (order.PostedToERP == false))) {        	
        	continue;
        }
        
        var createDateString = "";       
        var createDate;
        
        if (order.CreateDate) {
            var substringedDate = order.CreateDate.substring(6);
            var parsedIntDate = parseInt(substringedDate);
            createDate = new Date(parsedIntDate);	
            createDateString = createDate.toLocaleDateString();
        }
        
        var month;
        
        if (createDateString != "")
        	month = createDate.getMonth();
        else
        	month = prevMonth;
        
        if (prevMonth != month) {
        	 orderList = orderList + '<li data-role="list-divider" role="heading" class="ui-li ui-li-divider ui-bar-d ui-li-has-count">' + monthNames[month] + '</li>';
        	 prevMonth = month;
        } 
        
        if (!order.Comments) 
        	order.Comments = "";
        
        if (!order.ERPStatus) 
        	order.ERPStatus = "";
        
        orderList = orderList + '<li data-theme="c">' +
                                '	<a onclick="grvSendOrderItemsToBasket(\'' + order.OrderID + '\', \'' + order.AccountID +'\')">' + 
                                '        <p class="ui-li-aside ui-li-desc"><strong>' + createDateString + '</strong>PM</p>' +
                                '        <h3 class="ui-li-heading">' + order.DeliveryName + '</h3>' +
                                '		 <p>' + order.Reference + '</p>' + 	
                                '   </a>' +     
                                '	<a onclick="grvShowCompanyInfo(\'' + order.AccountID + '\')" data-role="button" data-transition="pop" data-rel="popup" data-position-to="window" data-inline="true"' +
                                '	class="ui-li-link-alt ui-btn ui-btn-up-c" data-theme="c" >' +
                                '	<span class="ui-btn-inner ui-btn-corner-all">' +
                                '	<span class="ui-icon ui-icon-plus ui-icon-shadow">Company Info</span>' +
                                '	</span>' +
                                '	</a>' +                                
                                '</li>';   		
    }
    
    g_append('#orderlist', orderList);
   // $('#orderlist').append(orderList);
    $('#orderlist').listview('refresh');  
}

function grvShowCompanyInfo(accountId) { 
    
    g_busy(true);
    
    var dao = new Dao();
    dao.index('Companies',
        accountId,
        'AccountID',
         function (company) { 
             
            sessionStorage.setItem('currentCompany', JSON.stringify(company)); 
            
            var jsonForm = new JsonForm();
            jsonForm.oncomplete = function () {                
                
                g_popup('#companyInfoPopup').show();
                g_busy(false);
            };            
            jsonForm.show(g_currentUser().SupplierID, '#companyform', g_currentCompany(), 'Company');                        
         },
    undefined, undefined);       
}