/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

var g_shoppingCartTotalIncl = 0;
var g_shoppingCartTotalExcl = 0;
var g_shoppingCartVAT = 0;
var g_shoppingCartCredit = 0;
var g_basketHTML = '';
var g_shoppingcartCnt = 0;
var g_shoppingcartalpha = [];
var g_shoppingCartSummaryItems = {};
var g_shoppingCartItemKeys = [];

var g_shoppingCartPageTranslation = {};

function shoppingCartOnPageBeforeCreate() {
    
    g_shoppingCartPageTranslation = translation('shoppingCartpage');
}

function shoppingCartOnPageShow() {
    
    g_shoppingCartPageTranslation.safeExecute(function() {
        
        g_shoppingCartPageTranslation.translateButton('#shoppingCartBackButton', 'Pricelist');
        g_shoppingCartPageTranslation.translateButton('#saveShoppingCart', 'Checkout');
        g_shoppingCartPageTranslation.translateButton('#deleteShoppingCart', 'Delete All');
        
        g_showCurrentCompanyName();
        if (sessionStorage.getItem('ShoppingCartReturnPage') == 'orderdetails.html')
            g_shoppingCartPageTranslation.translateButton('#shoppingCartBackButton', 'Order Details');

        if (shoppingCartIsGRV())
            $('#deleteShoppingCart').hide();

        var viewType = sessionStorage.getItem('shoppingCartViewType');
        if (viewType)
            g_shoppingCartPageTranslation.translateButton('#summaryButton', viewType === 'Summary' ? 'Detail' : 'Summary');

        $('#shoppingCartFooter').toggle((sessionStorage.getItem('ShoppingCartNoFooter') == undefined) || (sessionStorage.getItem('ShoppingCartNoFooter') == 'false'));

        if (DaoOptions.getValue('AllowSummaryButt', 'false') === 'true') {

            $('#summaryButton').removeClass('invisible');
        }    

        g_shoppingCartTotalIncl = 0;
        g_shoppingCartTotalExcl = 0;
        g_shoppingCartVAT = 0;
        shoppingCartOnPageShowSmall();
        shoppingCartConfirmScanInit();

        var dao = new Dao();
        dao.openDB(function () {
            shoppingCartInit();
        });

        if (DaoOptions.getValue('DoubleTax') == 'true') {
            $('.shopcartHeader').css('height', '200px');
                var wetNode =  $('<li data-theme="d"><div id="divTotalWET"><label>' + (DaoOptions.getValue('DoubleTaxText') || 'WET') +  ':</label></div></li>');  
                wetNode.insertAfter($('#totallist li:first'));
                $('#totallist').listview('refresh');
        }

        if (DaoOptions.getValue('LiveCreditCheckURL')) {
            g_shoppingCartCredit = parseFloat(sessionStorage.getItem(g_currentCompany().AccountID + 'AvailableCredit'));
            if ($('#creditLimit').length) {
                    $('#creditLimit').text(g_addCommas(g_shoppingCartCredit.toFixed(2)));
            } else {
                    $('.shopcartHeader').css('height', '230px');
                        var creditNode =  $('<li data-theme="d"><div id="divAvailableCredit"><label>Available Credit' +  ':</label></div></li>');
                        creditNode.appendTo($('#totallist'));	  
                        $('#divAvailableCredit').append('<p id="creditLimit" class="ui-li-aside">' + g_addCommas(g_shoppingCartCredit.toFixed(2)) + '</p>');
                        $('#totallist').listview('refresh');
                        $('#divAvailableCredit p').removeClass('ui-li-desc');
            }
        }
        
        shoppingCartBind();        
    });
}

function shoppingCartOnPageShowSmall() {
    
    if (g_isScreenSmall()) {
            $('.hideonphone').hide();
    }
}

function shoppingCartBind() {

    $('#summaryButton').off().on('click', function() {
       
       var nextButtonCaption = {
           
           Summary: 'Detail',
           Detail: 'Summary'           
       }
       
       $buttonCaption = $(this).find('.ui-btn-text');
       
       sessionStorage.setItem('shoppingCartViewType', $buttonCaption.text());
       $buttonCaption.text(nextButtonCaption[$buttonCaption.text()]);
       
        g_shoppingCartTotalIncl = 0;
        g_shoppingCartTotalExcl = 0;
        g_shoppingCartVAT = 0;
       
        shoppingCartFetchBasket();
    });
            
    $('#saveShoppingCart').unbind();
    $('#saveShoppingCart').click(function() {
        
        if (shoppingCartIsTotalQuantityValid()) {
    	
            if (DaoOptions.getValue('LiveCreditCheckURL') && (sessionStorage.getItem('currentordertype').toLowerCase() === 'order') && (g_shoppingCartTotalExcl > g_shoppingCartCredit)) {

                $('#creditLimitPopup').popup('open');

            } else {

                var isTPMOrder = ($.inArray(sessionStorage.getItem('currentordertype'), DaoOptions.getValue('TPMOrderTypes') && DaoOptions.getValue('TPMOrderTypes').split(',') || []) !== -1);            
                $.mobile.changePage((isTPMOrder ? "tpm.html" : "orderHeader.html"), { transition: "none" });
            }
        }
    });

    $('#deleteShoppingCart').unbind();
    $('#deleteShoppingCart').click(function() {
    	
    	shoppingCartRemoveAllItems();
    });
    
    $('#barcode').unbind();
    $('#barcode').keypress(function (event) {
    	
        var keycode = (event.keyCode ? event.keyCode : event.which);
        
        if ('13' == keycode)
        	shoppingCartConfirmScanOnScan();
    });
    
    $( "#scanPopup" ).popup({
    	
        afteropen: function( event, ui ) {
        	
            shoppingCartConfirmScanResetBarcode();
        }
    });

}

function shoppingCartConfirmScanInit() {
	
    var mustScan = (DaoOptions.getValue(sessionStorage.getItem('currentordertype') + 'ConfirmCartWithScan') == 'true');

    $('#saveShoppingCart').toggleClass('ui-disabled', mustScan);
    $('#startScanning').toggle(mustScan);
}

function shoppingCartConfirmScanOnScan() {

    var dao = new Dao();
    dao.fetchPricelist(('b":"' +  $('#barcode').val()), shoppingCartConfirmScanOnScanSuccess, shoppingCartConfirmScanOnScanFailure, undefined);
}

function shoppingCartConfirmScanOnScanSuccess(product) {
	
	var isItemFound = false;
	
	var dao = new Dao();
	
    dao.cursor('BasketInfo', undefined, undefined,
    	      function (basketInfo) {

    	          if (basketInfo.ProductID == product.id) {
    	        	  
                    isItemFound = true;
                    $('#scanResult').html('Scanned OK');
                    shoppingCartConfirmScanAddText(product.id); 
                    shoppingCartConfirmScanResetBarcode();
    	          };
    	          
    	          if ($('.unconfirmed').length == 0) {
    	        	  
                    $('#scanPopup').popup('close');
                    $('#saveShoppingCart').removeClass('ui-disabled');
                    $('#startScanning').hide();
    	          }
    	      },
    	      undefined,
    	      function() {
    	    	  
    	    	if (!isItemFound)
                    $('#scanResult').html('ERROR:The product is not in the basket.');
    	      });
	
}

function shoppingCartConfirmScanOnScanFailure() {
	
	$('#scanResult').html('ERROR:The product is not found in the database.');
	shoppingCartConfirmScanResetBarcode();
}

function shoppingCartConfirmScanAddText(productId) {
	
    $('#' + productId + 'uc').removeClass('unconfirmed'); 
    $('#' + productId + 'uc').html('Confirmed');
}

function shoppingCartConfirmScanResetBarcode() {
	
	$('#barcode').val('').focus();
}

function shoppingCartRemoveAllItems() {
    
    if (confirm(g_shoppingCartPageTranslation.translateText('Are you sure you want to clear the shopping cart?'))) {
    
        $.mobile.showPageLoadingMsg();
        var dao = new Dao();
        dao.cursor('BasketInfo', undefined, undefined,
         function (basketInfo) {
             if ((basketInfo.AccountID == g_currentCompany().AccountID) /*&& (basketInfo.Type == sessionStorage.getItem("currentordertype"))*/)
                 shoppingCartDeleteItem(basketInfo.key, DaoOptions.getValue('LostSaleActivityID') != undefined);
         },
         undefined,
         function (event) {
             shoppingCartFetchBasket();
         });
    }
}

function shoppingCartOnBack() {
	
	$.mobile.showPageLoadingMsg();
	var page = sessionStorage.getItem('ShoppingCartReturnPage');
	
	if ('pricelist' == page) {
		
		sessionStorage.setItem('lastPanelId', 'pricelistPanel')
		page = 'company.html';
	}
	
	if ('undefined' != page)	
		$.mobile.changePage(page, { transition: "none" });
}

function shoppingCartInit() {

    if (sessionStorage.getItem("currentordertype") == "grv") {
        $('#shoppingCartLabel').html('GRV Cart');
    } else if (sessionStorage.getItem("currentordertype") == "repl") {
        $('#shoppingCartLabel').html('Replenishment Cart');
    } else if (sessionStorage.getItem("currentordertype") == "stock") {
        $('#shoppingCartLabel').html('Stocktake Cart');
    } else if (sessionStorage.getItem("currentordertype") == "pod") {
        $('#shoppingCartLabel').html('Proof of Delivery');    
    } else {
    	var orderType = sessionStorage.getItem('currentordertype');  //ordertypecaption');
    	$('#shoppingCartLabel').html(g_shoppingCartPageTranslation.translateText((orderType ? orderType : 'Shopping') + ' Cart'));
    }
    
    g_basketHTML = '';
    shoppingCartFetchBasket();
}

function shoppingCartIsGRV() {
	return sessionStorage.getItem("currentordertype") == "grv" || sessionStorage.getItem("currentordertype") == "pod";
}

function shoppingCartFetchBasket() {
    
    g_shoppingCartSummaryItems = {};
    
    $('#shoppingCartitemlist').empty();
    var option = DaoOptions.get('TaxText');
    $('#vatLabel').html(option && ('ONLINE' === option.Group) ? option.Value + ':' : g_shoppingCartPageTranslation.translateText('VAT:')); 
    
    var isArrayCached = false;
    for (var key in g_grvCachedBasketItems) {
        
        if (g_grvCachedBasketItems.hasOwnProperty(key)) {
            
            isArrayCached = true;
            shoppingCartAddItem(g_grvCachedBasketItems[key]);
        }
    }
    if (isArrayCached) {
        
        g_grvCachedBasketItems = [];
        shoppingCartOnAllItemsAdded();
        
    } else {
        
        alphaFilter.getInstance().init('#alphabet');
        
        g_shoppingCartItemKeys = [];
        var dao = new Dao();
        dao.indexsorted('BasketInfo',g_currentCompany().AccountID, 'index1', 'index4', shoppingCartAddItem, shoppingCartNoItems, shoppingCartOnAllItemsAdded);
    }
}

function shoppingCartNoItems(){
    shoppingCartOnBack();
}

function shoppingCartItemNett(item) {
    return item.RepChangedPrice ? item.RepNett : item.Nett;
}

function shoppingCartAddItem(item, checkSummary) {
    
    if (checkSummary === undefined)
        checkSummary = true;
    
    var summaryField = DaoOptions.getValue('SummaryReportField');
    var orderByField = DaoOptions.getValue('SummaryReportOrderBy');
    
    if ((sessionStorage.getItem('shoppingCartViewType') === 'Summary') && checkSummary && (item[summaryField])) {                
        
        if (!g_shoppingCartSummaryItems[item[orderByField]])            
            g_shoppingCartSummaryItems[item[orderByField]] = [];                  
        
        if (!g_shoppingCartSummaryItems[item[orderByField]][item[summaryField]])
            g_shoppingCartSummaryItems[item[orderByField]][item[summaryField]] = [];        
        
        g_shoppingCartSummaryItems[item[orderByField]][item[summaryField]].push(item);
        return;
    }
    
    qty = shoppingCartIsGRV() && g_currentUser().SupplierID == 'DS' ? parseInt(item.UserField01, 10) : item.Quantity;   	
    nett = g_addCommas(parseFloat(shoppingCartItemNett(item)).toFixed(2));
    // deal with over 1,000
    if (isNaN(shoppingCartItemNett(item))) {
    	value = shoppingCartItemNett(item).replace(',','') / ((DaoOptions.getValue('DividePriceByUnit') === 'true') && g_isPackSizeUnitValid(item.Unit) ? item.Unit : 1) * item.Quantity;
    } else {
    	value = shoppingCartItemNett(item) / ((DaoOptions.getValue('DividePriceByUnit') === 'true') && g_isPackSizeUnitValid(item.Unit) ? item.Unit : 1) * item.Quantity;
    }
    var formattedValue = g_addCommas(parseFloat(value).toFixed(2));
	var maxValue = '';
	if (shoppingCartIsGRV()) maxValue = 'max="' + qty + '"';
	if (sessionStorage.getItem("currentordertype") == "Credit") maxValue = 'max="' +  item.UserField02 + '"';
	
        var itemIndex = g_shoppingCartItemKeys.length;
        g_shoppingCartItemKeys.push(item.key);
        
        var step = 1;
        
        if (orderdetailsIsComplexView()) {
            
//            step = g_orderdetailsCurrentOrder[DaoOptions.getValue('MasterChartComplexUnit')] || 1;
            
        } else if (g_isPackSizeUnitValid(item.Unit)) {
            
            step = item.Unit;
        }
        
        step = 'step=' + step;
	
	g_basketHTML +=
        '<li id="LI' + itemIndex + '"' + alphaFilter.getInstance().addClass(item.Description) + '>' +
        '<a href="#" onclick="pricelistOnItemClicked(\'' + g_pricelistItems.length + '\')">' +
        '  <table class="shopcartItems" >' +
        '    <tr>' +
        '       <td class="descr">' + item.Description + '</td>' +
        '       <td rowspan="2" align="right" class="quantity">' +
        '              <input id="' + itemIndex + '" style="width: 100px;" class="ui-input-text ui-body-c ui-corner-all ui-shadow-inset qtybox" type="number" ' + step +
        		     	' min="0" ' + maxValue + 
        '        		class="quantity" onchange ="shoppingCartOnQuantityChanged(\'' + itemIndex + '\', value' + (shoppingCartIsGRV() || (sessionStorage.getItem('currentordertype') == 'Credit') ? ', ' + qty  + ', \'' + item.Description + '\'': '') + ')"  value="' + qty + '" />' +
        '       </td>' +
        '       <td rowspan="2" align="right" class="nett" id="' + itemIndex + 'nett">' + nett + '</td>' +
        '       <td rowspan="2" align="right" class="total" id="' + itemIndex + 'total">' + formattedValue + '</td>' +
        '       <td rowspan="2" align="right" class="unconfirmed message" id="' + item.ProductID + 'uc"></td>' +
        '    </tr>' +
        '    <tr>'+
        '      <td colspan=3 class="productid ui-li-desc">' + item.ProductID + ((sessionStorage.getItem('shoppingCartViewType') === 'Summary') ? '(Case: ' + parseFloat(item.Quantity)/parseFloat(item.Unit) + ')': '') + '</td></tr>' +
        '  </table>' +
        '</a>' +
        (shoppingCartIsGRV() ? '' :
             ' <a href="#" onclick="shoppingCartDeleteItem(\'' + item.key + '\', ' +  (DaoOptions.getValue('LostSaleActivityID') != undefined) + ', true)" class="ui-li-link-alt ui-btn ui-btn-up-c" data-theme="c" >' +
             '<span class="ui-btn-inner ui-btn-corner-all">' +
             '<span class="ui-icon ui-icon-delete ui-icon-shadow">delete</span>' +
             '</span>' +
             '</a>') +
        '</li>';
	
    g_shoppingCartTotalExcl = g_shoppingCartTotalExcl + value;
    if (DaoOptions.getValue('DoubleTax') == 'true')
    	g_shoppingCartVAT += value * item.VAT / 100;
    else
    	g_shoppingCartVAT += value * (DaoOptions.getValue('CalcTaxPerProduct') == 'true' ? item.VAT / 100 : g_vat());
    g_shoppingCartTotalIncl = g_shoppingCartTotalExcl + g_shoppingCartVAT;
}

function shoppingCartOnAllItemsAdded() {
    
    if (sessionStorage.getItem('shoppingCartViewType') === 'Summary')
        shoppingCartAddSummaryItems();
    
    var totalItemsShown = ($('#divvat p').length != 0);
    if (!totalItemsShown) {
        $('#divvat').append('<p class="ui-li-aside" id="vat"></p>');
        $('#divtotalExcl').append('<p class="ui-li-aside" id="totalExcl"></p>');
        $('#divtotalIncl').append('<p class="ui-li-aside" id="totalIncl"></p>');
    }
    
    if (DaoOptions.getValue('DoubleTax') == 'true') {   	
    	var formattedVAT = g_addCommas(g_roundToTwoDecimals(g_shoppingCartVAT));
    	totalItemsShown ? $('#divTotalWET p').text(formattedVAT) : $('#divTotalWET').append('<p class="ui-li-aside">' + formattedVAT + '</p>');    		
    	g_shoppingCartVAT = (g_shoppingCartTotalExcl + g_shoppingCartVAT) * g_vat();
    	g_shoppingCartTotalIncl += g_shoppingCartVAT;
    }
    
    $('.quantity').keydown(function(event) {
        return g_isValidQuantityCharPressed(event);
    });
    
    $('#vat').html(g_addCommas(g_roundToTwoDecimals(g_shoppingCartVAT)));
    $('#totalExcl').html(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalExcl)));
    $('#totalIncl').html(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalIncl)));
    $('#shoppingCartitemlist').listview('refresh');
    $('.qtybox').textinput({ theme: "c" });
    g_append('#shoppingCartitemlist ', g_basketHTML);
    $('#shoppingCartitemlist').listview('refresh');
    shoppingCartCheckItemsCount();
    g_basketHTML = '';
    alphaFilter.getInstance().HTML('#alphabet', '#shoppingCartitemlist');
}

function shoppingCartAddSummaryItems() {
    
    var headings = Object.keys(g_shoppingCartSummaryItems).sort();
    
    for (var i = 0; i < headings.length; ++i) {
        
        g_basketHTML += '<li data-role="list-divider" role="heading">' + headings[i] + '</li>';
        
        var groups = Object.keys(g_shoppingCartSummaryItems[headings[i]]).sort();
        
        for (var j = 0; j < groups.length; ++j) {
            
            var summaryItem = {};
            summaryItem.Quantity = 0;

            var itemArray = g_shoppingCartSummaryItems[headings[i]][groups[j]];

            for (var k = 0; k < itemArray.length; ++k) {

                if (k === 0) {

                    summaryItem = itemArray[k];
                    summaryItem.ProductID = itemArray[k][DaoOptions.getValue('SummaryReportProdID')];
                    summaryItem.Description = itemArray[k][DaoOptions.getValue('SummaryReportProdDes')];

                } else {

                    summaryItem.Quantity = Number(summaryItem.Quantity) + Number(itemArray[k].Quantity);           
                }
            }

            shoppingCartAddItem(summaryItem, false);            
        }
    }
}

function shoppingCartCheckItemsCount() {
    if (($.mobile.activePage.attr('id') == 'shoppingCartpage') && $('#shoppingCartitemlist li').length == 0) {
        
        sessionStorage.removeItem('shoppingCartViewType');
    	shoppingCartOnBack();
    }
}

function shoppingCartDeleteItem(key, saveLostSale, removeNode, onSuccess, resetItemsOnPageNumber) {
    //g_shoppingCartTotalExcl = g_shoppingCartVAT = g_shoppingCartTotalIncl = 0;
    
    var dao = new Dao();
    g_clearCacheDependantOnBasket(resetItemsOnPageNumber);
    if (shoppingCartIsGRV()) {
    	delete g_grvCachedBasketItems[key];
    	shoppingCartFetchBasket();
    } else {
	    dao.deleteItem('BasketInfo', key, undefined, undefined, undefined, function (event) {
	    	
	    	if ($.mobile.activePage.attr('id') !== 'shoppingCartpage') {
	    		
	            g_clearCacheDependantOnBasket(resetItemsOnPageNumber);
	    		pricelistCheckBasket();
	    		
	    		if (onSuccess)
                            onSuccess();
	    		
	    	} else {
	    		
                    if (removeNode) { 
                        
                        var itemIndex = $.inArray(key, g_shoppingCartItemKeys);
                        
                        try {
                            
                            var val = parseFloat($('#' + itemIndex + 'total').text().replace(/[,]/g, '')); 
                            g_shoppingCartTotalExcl -= val;
                            shoppingCartRecalcTotals();
                            
                        } catch (err){
                            
                            console.log(err.message);
                        }
                        
                        $('#LI' + itemIndex).remove();
                        shoppingCartCheckItemsCount();		    		
                    } 
	    	}
                
	    	if (saveLostSale) shoppingCartSaveLostSales(key);
	    });
    };
}

function shoppingCartSaveLostSales(key){
    var dao = new Dao();
    dao.get('BasketInfo', key,
  	      function (basketInfo) {
  	          if (basketInfo.key === key) {
  	              g_saveLostSale(basketInfo.ProductID, basketInfo.Quantity, basketInfo.Stock);
  	          }
  	      });	
}

function shoppingCartIsTotalQuantityValid() {
    
   /** if (orderdetailsIsComplexView()) {        
        
        var totalQuantity = 0;
        var unit = (g_orderdetailsCurrentOrder[DaoOptions.getValue('MasterChartComplexUnit')] || 1);
        
        $.each($('.qtybox'), function() {
            totalQuantity += +$(this).val();
        });
        
        if (totalQuantity % unit > 0) {
            
            g_alert('Total quantity needs to be in unit of ' + unit);
            return false;
        }
    } **/   
    
    if (DaoOptions.getValue('CalcChange') === 'true') {
        
        sessionStorage.setItem('totalIncl', $('#totalIncl').text());
    }
    
    return true;
}

function shoppingCartOnQuantityChanged(itemIndex, value, maxValue, productName) {    
	
    if (sessionStorage.getItem('ShoppingCartNoChangeAllowed') == 'true') {
    	g_alert("You are not allowed to change the quantity");
    	$('#' + itemIndex).attr('value', maxValue);
    	return;
    }
    
    if (!shoppingCartIsTotalQuantityValid())
        return;
    
    var step = parseInt($('#' + itemIndex).attr('step'), 10);
	
    var quantity = parseInt(value, 10);
    if (!quantity) {
    	
//    	if (confirm('Are you sure you want to remove the item from basket?')) {
    		shoppingCartDeleteItem(g_shoppingCartItemKeys[itemIndex], DaoOptions.getValue('LostSaleActivityID') != undefined, true);
    		return;
//    	}
    	
//    	$('#' + key).attr('value', step);
//    	shoppingCartOnQuantityChanged(key, step, maxValue, productName);
//    	return;
    }
    
    if (!g_isQuantityValid(quantity, step)) {
    	
    	$('#' + itemIndex).attr('value', step);
    	shoppingCartOnQuantityChanged(itemIndex, step, maxValue, productName);
    	return;
    }
    
    if ((sessionStorage.getItem('ShoppingCartLessThan') == 'true') && (quantity > maxValue)) {
    	
    	g_alert("The quantity cannot be greater than " + maxValue);
    	$('#' + itemIndex).attr('value', maxValue);
    	return;
    }
    
    var dao = new Dao();
    dao.get("BasketInfo", g_shoppingCartItemKeys[itemIndex], function(basketInfo) {
    	
    	var volumePrice = g_pricelistVolumePrices[basketInfo.ProductID];
    	
    	if (volumePrice) {    
    		
        	var j = 1;
        	
    	    // increase index according to quantity
        	
        	while (j < 5) {
        		
        		if (qty < volumePrice['Qty' + j]) 
        			break;    			
        		
        		j++;
        	}
    	    	
        	var gross = parseFloat(volumePrice.Gross);
        	var nett  = parseFloat(volumePrice['Nett' + j]);
        	var discount = parseFloat(volumePrice['Discount' + j]);
        	
        	if (g_pricelistMobileLiveStockDiscount && (nett > gross)) gross = nett;
        	basketInfo.Discount = discount;
        	basketInfo.Nett = nett;
        	basketInfo.Gross = gross;
    	}
    	
        g_addProductToBasket(
                basketInfo.ProductID,
                basketInfo.SupplierID,
                basketInfo.AccountID,
                quantity,
                basketInfo.UserID,
                basketInfo.Nett,
                basketInfo.Description,
                basketInfo.Discount,
                basketInfo.Gross,
                basketInfo.Type,
                basketInfo.UserField01,
                basketInfo.RepNett,
                basketInfo.RepDiscount,
                basketInfo.Unit,
                basketInfo.UserField02,
                basketInfo.Warehouse,
                basketInfo.VAT,
                basketInfo.Stock,
                basketInfo.UserField03,
                basketInfo.UserField04,
                basketInfo.UserField05                 
                );
        
        $('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
        $('#' + itemIndex + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  == 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * quantity));
        g_shoppingCartTotalExcl = 0;
        $.each($(".total") ,function() {
            var value = $(this).text().replace(',','');
            g_shoppingCartTotalExcl += parseFloat(value);
        });
        shoppingCartRecalcTotals();
    }, 
    undefined,
    undefined   
    );
   
    g_clearCacheDependantOnBasket();
}

/*
 * set g_shoppingCartTotalExcl before calling
 */
function shoppingCartRecalcTotals(){
    $("#totalExcl").text(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalExcl)));
    if (DaoOptions.getValue('DoubleTax') == 'true') {
    	var currentTotalWET = parseFloat($('#divTotalWET p').text());
    	var difference = (quantity - basketInfo.Quantity) * basketInfo.VAT / 100 * (basketInfo.RepNett ?  basketInfo.RepNett :  basketInfo.Nett);
    	var newTotalWET = currentTotalWET + difference;        	
    	$('#divTotalWET p').text(g_addCommas(g_roundToTwoDecimals(newTotalWET)));
    	g_shoppingCartVAT = (g_shoppingCartTotalExcl + newTotalWET) * g_vat();   
    } else if (DaoOptions.getValue('CalcTaxPerProduct') == 'true') {
    	currentTotalVAT = parseFloat($("#vat").text());
    	difference = (quantity - basketInfo.Quantity) * basketInfo.VAT / 100 * (basketInfo.RepNett ?  basketInfo.RepNett :  basketInfo.Nett);
    	g_shoppingCartVAT = currentTotalVAT + difference;
    } else {
    	 g_shoppingCartVAT = g_vat() * g_shoppingCartTotalExcl;
    }
    $("#vat").text(g_addCommas(g_roundToTwoDecimals(g_shoppingCartVAT)));
    g_shoppingCartTotalIncl = g_shoppingCartTotalExcl + g_shoppingCartVAT;
    if (DaoOptions.getValue('DoubleTax') == 'true') g_shoppingCartTotalIncl += parseFloat($('#divTotalWET p').text());
    $("#totalIncl").text(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalIncl)));
}

function shoppingCartAlphaInit(descr){
	g_shoppingcartalpha = [];
	$('#alphabet').empty();
}




