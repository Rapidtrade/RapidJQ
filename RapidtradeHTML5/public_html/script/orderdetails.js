var g_orderdetailsOrderItems = [];
var g_orderdetailsCurrentOrder = {};

/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function orderdetailsOnPageShow() {
	
	orderdetailsInit();
	orderdetailsBind();
}

/*
 * All binding to buttons etc. should happen in this <yyy>Bind function() method
 */
function orderdetailsBind() {
	
	$('#radioOrder').click(function () {
    	sessionStorage.setItem('orderdetailsradio','radioOrder');
    	sessionStorage.setItem('currentordertype','Order');
    	$("#radioDelivery").attr("checked",false).checkboxradio("refresh");
    });
	
	$('#radioDelivery').click(function () {
    	sessionStorage.setItem('orderdetailsradio','radioDelivery');
    	sessionStorage.setItem('currentordertype','Delivery');
    	$("#radioOrder").attr("checked",false).checkboxradio("refresh");
    	$("#radioDelivery").attr("checked",true).checkboxradio("refresh");
    });
	
	$('#radioCredit').click(function () {
    	sessionStorage.setItem('orderdetailsradio','radioCredit');
    	sessionStorage.setItem('creatingCredit', orderdetailsIsCreditSelected());
    	$('#saveCreditButton').toggleClass('invisible', !orderdetailsIsCreditSelected()); 
    	$('#sendToBasketButton').toggleClass('invisible', orderdetailsIsCreditSelected());    	
    	sessionStorage.setItem('currentordertype', 'Credit');  
    	$("#creditDelivery").attr("checked",true).checkboxradio("refresh");
    	if (orderdetailsIsCreditSelected()) $('#creditInfoPopup').popup('open');
    });
	
	$('#shoppingcartButton').unbind();
    $('#shoppingcartButton').click(function () {
    	sessionStorage.setItem('ShoppingCartReturnPage', 'orderdetails.html');
		$.mobile.changePage("shoppingCart.html");
    });
	
	$('#sendToBasketButton').unbind();
    $('#sendToBasketButton').click(function () {
    	var orderItemsNumber = g_orderdetailsOrderItems.length;
    	g_grvCachedBasketItems = [];
    	for (var index = 0; index < orderItemsNumber; ++index) {
    		orderdetailsSendItemToBasket(
    				g_orderdetailsOrderItems[index].ProductID,
    				g_orderdetailsOrderItems[index].Quantity,
    				g_orderdetailsOrderItems[index].Nett,
    				g_orderdetailsOrderItems[index].Description,
    				g_orderdetailsOrderItems[index].Discount,
    				g_orderdetailsOrderItems[index].Gross,
    				undefined,
    				g_orderdetailsOrderItems[index].RepNett,
    				g_orderdetailsOrderItems[index].RepDiscount,
    				g_orderdetailsOrderItems[index].Unit,
    				undefined,
    				g_orderdetailsOrderItems[index].Warehouse,
    				g_orderdetailsOrderItems[index].VAT,
    				false);
    		var key = (g_orderdetailsOrderItems[index].ProductID + g_orderdetailsOrderItems[index].SupplierID + g_currentUser().UserID + g_orderdetailsOrderItems[index].AccountID).trim();
    		g_orderdetailsOrderItems[index].key = key;
    		g_grvCachedBasketItems[key] = g_orderdetailsOrderItems[index];
    	}
    	
    	g_clearCacheDependantOnBasket();
    	orderdetailsCheckBasket();

    	if (confirm('Items have been sent to your shopping cart. Would you like to go to the shopping cart now?')) {    		
    		sessionStorage.setItem('ShoppingCartReturnPage', 'orderdetails.html');
    		$.mobile.changePage("shoppingCart.html");
    	}
    });
    
    $('#reprintButton').unbind();
    $('#reprintButton').click(function() {    	
    	g_orderdetailsCurrentOrder.orderItems = g_orderdetailsOrderItems;
    	sessionStorage.setItem('currentOrder', JSON.stringify(g_orderdetailsCurrentOrder));
    	sessionStorage.setItem('invoiceContinue','orderdetails.html');
    	g_showInvoice('orderDetailsInvoicePopup');
    });
    
    $('#creditInfoOKButton').unbind();
    $('#creditInfoOKButton').click(function() {    	
    	sessionStorage.setItem('ShoppingCartReturnPage', undefined);
    	shoppingCartRemoveAllItems(false);
    });
    
    $('#saveCreditButton').unbind();
    $('#saveCreditButton').click(function() {    	
    	orderdetailsSaveCredit();
    });
    
    $('#orderDetailsBackButton').unbind();
    $('#orderDetailsBackButton').click(function() {
    	if (orderdetailsIsCreditSelected()) {    		
    		sessionStorage.setItem('creatingCredit', false);
    		$('#sendToBasketButton').removeClass('invisible');
	    	sessionStorage.setItem('ShoppingCartReturnPage', 'company.html');
	    	shoppingCartRemoveAllItems();
    	} else {
    		$.mobile.changePage('company.html', { transition: "none" });
    	}
    });
    
    $('#quantityPopup').unbind();
    $('#quantityPopup').bind({
    	'popupafteropen': function() {
    		$('#quantityEdit').focus();
    	}
    });
}


/*
 * 
 */
function orderdetailsInit() {
	
	orderdetailsResetFlags();
	
	var cnt = parseInt(sessionStorage.getItem('currentOrderCount'));
	var json = JSON.parse(sessionStorage.getItem('CacheHistoryOrders'));
	g_orderdetailsCurrentOrder = json[cnt];  //JSON.parse(sessionStorage.getItem('currentOrder'));
	
	try {
		$('#headerlabel').text(g_orderdetailsCurrentOrder.Type + ' Details');
	} catch (err){
		
	}
	
	$('#reprintButton').toggle(g_vanSales && (g_currentUser().RepID.toUpperCase() == g_orderdetailsCurrentOrder.BranchID.toUpperCase()));
	orderdetailsInitOrderType();
	orderdetailsFetchOrderItems();
	
	orderdetailsCheckBasket();
}

function orderdetailsCheckBasket() {
    
    var dao = new Dao();
    dao.cursor('BasketInfo', undefined, undefined,
    function (basketinfo) {
    	
        if (basketinfo.AccountID == g_currentCompany().AccountID)        	
            $('#shoppingcartButton').removeClass('ui-disabled');
    },undefined, undefined);
}

/*
 * INitialise the to shopping cart buttons
 */
function orderdetailsInitOrderType(){
	
	if (DaoOptions.get('MobileToBasketOptions') == undefined) return;
	var orderType = sessionStorage.getItem('currentordertype');	
	
	//Only allowed to convert orders
	if (orderType != 'Order') {
		$('#orderTypeDiv').hide();
		return;
	} 
	
	var orderTypes = DaoOptions.getValue('MobileToBasketOptions');
	if (orderTypes) {
		if (orderTypes.indexOf('Credi') != -1) {
		    g_append('#buttondiv fieldset', '<input id="radioCredit" value="Credit" type="radio"><label for="radioCredit">Credit</label>');
		    $("#radioCredit").checkboxradio().checkboxradio("refresh");
		}
		if (orderTypes.indexOf('Deliv') != -1) {		    
			$("input#radioOrder").after ('<label for="radioDelivery">Delivery</label><input id="radioDelivery" value="Delivery" type="radio">');			
			//g_append('#buttondiv fieldset', '<input id="radioDelivery" value="Delivery" type="radio"><label for="radioDelivery">Delivery</label>');
		    $("#radioDelivery").checkboxradio().checkboxradio("refresh");
		    $("#radioDelivery").checkboxradio("refresh");
		}
	} else {
		$('#orderTypeDiv').hide();	
	}
	$('#buttondiv').trigger('create');
}

function orderdetailsIsCreditSelected() {
	
	return ($('#orderTypeDiv option:selected').val() == 'credit');
}

function orderdetailsResetFlags() {
	
	sessionStorage.removeItem('ShoppingCartNoFooter'); 
	sessionStorage.setItem('currentordertype', 'Order');
	sessionStorage.removeItem('CurrentOrderDetailOrder'); 
	sessionStorage.removeItem('ShoppingCartLessThan'); 
	sessionStorage.removeItem('OrderHeaderReturnPage');
}

function orderdetailsSaveCredit() {
	
	sessionStorage.setItem('ShoppingCartNoFooter', true); 
	sessionStorage.setItem('ShoppingCartReturnPage', 'orderdetails.html');
	sessionStorage.setItem('CurrentOrderDetailOrder', JSON.stringify(g_orderdetailsCurrentOrder));
	sessionStorage.setItem('ShoppingCartLessThan', true);
	sessionStorage.setItem('ordertypecaption','Credit');
	sessionStorage.setItem('OrderHeaderReturnPage', 'orderdetails.html');
	sessionStorage.setItem('referenceDocID', g_orderdetailsCurrentOrder.OrderID);
	sessionStorage.setItem('orderheaderNext', 'history');
	$.mobile.changePage('shoppingCart.html');
}

function orderdetailsSendOrderItem(productId, quantity, nett, description, discount, gross, repNett, repDiscount, unit, warehouse, vat) {
	
	$('#stockValue').text('');
	$('#quantityPopup').popup('open');
	
	orderdetailsFetchStock(productId, gross, nett);
	
	$('#quantityEdit').val(quantity);
	
	if (unit) 
		$('#quantityEdit').attr('step', unit);	
	
	var creditReasons = DaoOptions.getValue('CreditReasons') ?  DaoOptions.getValue('CreditReasons').split(',') : undefined;
	
	if (creditReasons && creditReasons.length) {
		
		$('#creditReasonDiv select').empty();
		
		$.each(creditReasons, function(index, value) {             
			
            var option = '<option value="' + value + '">'+ value + '</option>';            
            $('#creditReasonDiv select').append(option);
        });
		
		$('select').selectmenu('refresh');
	}
	
	$('#creditReasonDiv').toggle(orderdetailsIsCreditSelected());
	
	var enteredQuantity = function() {
		
		return parseInt($('#quantityEdit').attr('value'), 10);
	};
	
	$('#sendItemButton').click(function(event) {
		
		var isValid = (enteredQuantity() > 0);
		
		if (isValid && orderdetailsIsCreditSelected())
			isValid = (enteredQuantity() <= parseInt(quantity, 10));
		
		if (!isValid)
			alert('Please enter a valid quantity');
		
		if (isValid && unit) {
			
			isValid = enteredQuantity() % unit > 0;
			
			if (!isValid) {
				
				alert('You are ordering in incorrect units. The pack size requires you to order in units of ' + g_pricelistSelectedProduct.Unit);
				isValid = false;
			}
		} 
		
		$(this).unbind(event);
		
		var userField01 = orderdetailsIsCreditSelected() ? $('#creditReasonDiv option:selected').val() : undefined;
		var userField02 = orderdetailsIsCreditSelected() ? quantity : undefined;
				
		if (isValid) {
			
			orderdetailsSendItemToBasket(productId, enteredQuantity(), nett, description, discount, gross, userField01, repNett, repDiscount, unit, userField02, warehouse, vat, true);
			
			if (orderdetailsIsCreditSelected())
				$('.historyOrderItems tr:contains("' + productId + '") .descr').text(quantity + ' [-' + enteredQuantity() + ']');
		}
	});
}

/*
 * 
 */
function orderdetailsFetchOrderItems() {
	
	g_orderdetailsOrderItems = [];

	var testorder = new Object();
	testorder.SupplierID = "DS";
	testorder.Type = "DatePicker";
	testorder.Name = "display";
	testorder.Visible = true;
	
	$.mobile.showPageLoadingMsg(); 
	
	var url = DaoOptions.getValue('LiveHistoryItems') || g_restUrl + 'Orders/GetOrderItems';
	
	url += '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID + ' &orderID=' + g_orderdetailsCurrentOrder.OrderID + '&skip=0&top=100&format=json';
	
	var success = function (json) {
		
	    $('#orderitemlist').empty();

	    var jsonForm = new JsonForm();
	    jsonForm.show(g_currentUser().SupplierID, '#orderDetailspopup', g_orderdetailsCurrentOrder, 'StatusOrderHeader');
	    
	    for (var i = 0; i < json.length; i++) {
	    	
	        var orderItem = json[i];
	        
	        var nettValue = orderItem.RepNett ? orderItem.RepNett : orderItem.Nett;
	                
	        g_append('#orderitemlist', '<li data-theme="c" id="' + syncGetKeyField(orderItem, 'OrderItems') + '">' +
                    '   <a><p class="ui-li-heading"><strong>' + orderItem.Description + '</strong></p>' +
                    '   <table class="ui-li-desc historyOrderItems"><tr><td class="itemId">' + orderItem.ItemID + '</td><td class="productId">' + orderItem.ProductID + '</td><td class="descr">' + orderItem.Quantity + '</td><td class="value">' + g_roundToTwoDecimals(nettValue) + '</td><td class="value">' + g_roundToTwoDecimals(orderItem.Value) + '</td></tr></table></a>' +
                    '	<a onclick="orderdetailsSendOrderItem(\'' + 
		                  orderItem.ProductID + '\',\'' +
		                  orderItem.Quantity + '\',\'' +
		                  orderItem.Nett + '\',\'' +
		                  (orderItem.Description ? orderItem.Description.replace(/'/g, '&quot;') : '') + '\',\'' +
		                  orderItem.Discount + '\',\'' +
		                  orderItem.Gross + '\',\'' +
		                  (orderItem.RepNett ? orderItem.RepNett : '') + '\',\'' +
		                  (orderItem.RepDiscount ? orderItem.RepDiscount : '') + '\',\'' +
		                  (g_isPackSizeUnitValid(orderItem.Unit) ? orderItem.Unit : '') + '\',\'' +
		                  (orderItem.Warehouse ? orderItem.Warehouse : '') + '\',\'' +
		                  (orderItem.VAT != undefined ? orderItem.VAT : '')  + '\'' +
                    ')" data-role="button" data-transition="pop" data-rel="popup"  data-position-to="window" data-inline="true"' +
                    '	class="ui-li-link-alt ui-btn ui-btn-up-c" data-theme="c" >' +
                    '	<span class="ui-btn-inner ui-btn-corner-all">' +
                    '	<span class="ui-icon ui-icon-plus ui-icon-shadow">Send to Basket</span>' +
                    '	</span>' +
                    '	</a></a>' +
                    '	</li>');

	        g_orderdetailsOrderItems.push(orderItem);
	    }
	  
	    $.mobile.changePage("#orderdetails", { transition: "none" });
	    $('#orderitemlist').listview('refresh');
            
            if ((DaoOptions.getValue('AllowMasterChartDownload', 'false') == 'true')) {
            
                $('#orderitemlist li').each(function() {

                    var that = this;

                    orderdetailsFetchMasterChartBarcode(this.id, function(barcode) {

                       var $description = $(that).find('p.ui-li-heading strong');
                       $description.text($description.text() + ' (' + barcode + ' )');                    
                    });
                });
            }
            
	    $.mobile.hidePageLoadingMsg();
	};
	
	var error = function (e) {
		
	    console.log(e.message);
	    $.mobile.hidePageLoadingMsg();
	};
	
	g_ajaxget(url, success, error);
 };
 
 function orderdetailsFetchMasterChartBarcode(key, onSuccess) {
    
    var callback = function(item) {
                
        onSuccess(item[DaoOptions.getValue('MasterChrtBCodeField')]);
    };
    
    var dao = new Dao();    
    dao.get('OrderItems', key, callback);
}
 
 function orderdetailsSendItemToBasket(productID, quantity, nett, description, discount, gross, userField01,  repNett, repDiscount, unit, userField02, warehouse, vat, showInfoMessage) {

	g_addProductToBasket(
			productID, 
			g_currentCompany().SupplierID, 
			g_currentCompany().AccountID,
			quantity, 
			g_currentUser().UserID, 
			nett, 
			description, 
			discount,
			gross,
			sessionStorage.getItem("currentordertype"),
			userField01,
			repNett,
			repDiscount,
			unit,
			userField02,
			warehouse,
			vat
			);
	
	g_clearCacheDependantOnBasket();
	
	$('#shoppingcartButton').removeClass('ui-disabled');

	if (showInfoMessage) {
		
		$('#quantityPopup').popup('close');
		window.setTimeout( function(){ $('#itemSentPopup').popup('open'); }, 500 );
		window.setTimeout( function(){ $('#itemSentPopup').popup('close'); }, 2500 );
	}
 };
 
 function orderdetailsFetchStock(productId, gross, nett) {
	 
	 $('#stockValue').text('Busy...');
	 
	 var setStock = function(stock) {
		 
		 $('#stockValue').text((g_stockDescriptions[stock] || stock));
	 };
	 
	 var onFetchLocalSuccess = function(json) {
		 
		 setStock(json.Stock);
	 };
	 
	 var onFetchLiveSuccess = function(json) {
		 
			var stockDataArray = json.StockInf;	
			
		    if (stockDataArray) {    	 
		    	
		    	for (var i = 0; i < stockDataArray.length; ++i) {   		
		    		
		    		if  (!g_currentCompany().BranchID  || ($.trim(stockDataArray[i].Warehouse.split(':')[0]) == g_currentCompany().BranchID)) {
		    			
		    			setStock(json.StockInf[i].Stock);
		    			break;
		    		}
		    	}
		    } 
	 };
	 
	if (DaoOptions.getValue('MobileLiveStockDiscount') == 'true') {
		
		var livePriceUrl = DaoOptions.get('LivePriceURL') ? DaoOptions.getValue('LivePriceURL') : g_restUrl + 'prices/getprice3';
	    var url = livePriceUrl + '?supplierID=' + g_currentUser().SupplierID + '&productID=' + productId + '&accountid=' + g_currentCompany().AccountID + '&branchid=' + g_currentCompany().BranchID + 
	    			'&quantity=1&gross=' + gross + '&nett=' + nett + '&checkStock=true&checkPrice=true&format=json';
	 
	    g_ajaxget(url, onFetchLiveSuccess);
	    
	} else {
		
	    var key = g_currentUser().SupplierID + productId+ g_currentCompany().BranchID;
	    
	    var dao = new Dao();
	    
	    dao.get('Stock', key, onFetchLocalSuccess,
			    function (error) {
			    	
			    	console.log(error.message);
			    	$('#stockValue').text('No data available');
			    },
			    undefined);
	};
 };


