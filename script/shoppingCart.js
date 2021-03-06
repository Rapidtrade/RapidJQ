/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

var ITEMS_PER_REFERENCE = 18;

var g_shoppingCartTotalIncl = 0;
var g_shoppingCartTotalExcl = 0;
var g_shoppingCartVAT = 0;
var g_shoppingCartCredit = 0;
var g_basketHTML = '';
var g_shoppingcartCnt = 0;
var g_shoppingcartalpha = [];
var g_shoppingCartSummaryItems = {};
var g_shoppingCartItemKeys = [];
var g_shoppingCartDetailItems = [];

var g_shoppingCartPageTranslation = {};

var g_shoppingCartMultilineDiscItems = {};
var g_shoppingCartMultilineDiscQty = {};
var g_shoppingCartMultilineItemPromoID = [];


/***
 * variables that onkeydown and onkeyup listeners are going to use
 */
var g_keyMap = [];
var g_keyMatchCount = 0;

function shoppingCartOnPageBeforeCreate() {

    g_shoppingCartPageTranslation = translation('shoppingCartpage');
}

function shoppingCartOnPageShow() {

    g_shoppingCartMultilineDiscItems = {};
    g_shoppingCartMultilineDiscQty = {};
    g_shoppingCartMultilineItemPromoID = [];
    g_shoppingCartDetailItems = [];

    g_enableMultiLineDiscount = DaoOptions.getValue('EnableMultiLineDiscount','false');
    g_multiLineDiscountID = DaoOptions.getValue('MultiLineDiscountID');
    g_promoExclAccountGroup = DaoOptions.getValue('PromoExclAccountGroup');
    g_promoExclDicounts = DaoOptions.getValue('PromoExclDiscounts') ? DaoOptions.getValue('PromoExclDiscounts').split(',') : [];

    g_shoppingCartPageTranslation.safeExecute(function() {

        g_shoppingCartPageTranslation.translateButton('#shoppingCartBackButton', 'Pricelist');
        g_shoppingCartPageTranslation.translateButton('#saveShoppingCart', 'Checkout');
        g_shoppingCartPageTranslation.translateButton('#deleteShoppingCart', 'Delete All');

        g_showCurrentCompanyName();
        if (sessionStorage.getItem('ShoppingCartReturnPage') === 'orderdetails.html')
            g_shoppingCartPageTranslation.translateButton('#shoppingCartBackButton', 'Order Details');
        if (sessionStorage.getItem('ShoppingCartReturnPage') === 'route.html')
            g_shoppingCartPageTranslation.translateButton('#shoppingCartBackButton', 'Deliveries');

        if (shoppingCartIsGRV() || DaoOptions.getValue('HideDeleteAllOn' + sessionStorage.getItem("currentordertype").toUpperCase() + 'Cart' , 'false') === 'true')
            $('#deleteShoppingCart').hide();

        var viewType = sessionStorage.getItem('shoppingCartViewType');
        if (viewType)
            g_shoppingCartPageTranslation.translateButton('#summaryButton', viewType === 'Summary' ? 'Detail' : 'Summary');

        $('#shoppingCartFooter').toggle((sessionStorage.getItem('ShoppingCartNoFooter') === undefined) || (sessionStorage.getItem('ShoppingCartNoFooter') === 'false'));

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
            ITEMS_PER_REFERENCE = DaoOptions.getValue('SummaryGroupByNumLines', 18);
            ITEMS_PER_REFERENCE = parseInt(ITEMS_PER_REFERENCE, 10);
            shoppingCartInit();
        });

        if (DaoOptions.getValue('DoubleTax') === 'true') {
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

    $('#summaryButton').off().on('click', shoppingCartChangeView);

    $('#saveShoppingCart').unbind();
    $('#saveShoppingCart').click(function() {

        if (shoppingCartIsGroupingEnabled()) {

            var isValid = true;

            if (sessionStorage.getItem('shoppingCartViewType') !== 'Summary') {

                g_alert('This order must be done from the summary view.');
                isValid = false;
                shoppingCartChangeView();
            }

            $('.summaryReference').each(function() {

                if (!$.trim($(this).val())) {

                    g_alert('Please fill in all reference fields.');
                    isValid = false;
                    return false;
                }
            });

            if (isValid) {

                g_busy(true);

                var dao = new Dao();
                $('.summaryReference').each(function() {

                    var range = this.id.replace('reference', '').split('-');

                    for (var i = range[0]; i <= range[1]; ++i) {

                        //var item = g_shoppingCartDetailItems[i];
                        g_shoppingCartDetailItems[i].UserField01 = $(this).val();

//                        dao.put(item, 'BasketInfo', item.key, function() {
//                            console.log('Item ' + item.key + ' added to basket');
//                        });
                    }
                });

                basket.saveItems(g_shoppingCartDetailItems, function() {

                    setTimeout(function() {
                        var finish = function() {
                            g_busy(false);
                            $.mobile.changePage('orderHeader.html', {transition:'none'});
                        };
                        if (DaoOptions.getValue('localTPM') === 'true') {
                            promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), finish);
                        } else {
                            finish();
                        }


                    }, 2000);

                    return;
                });

//                setTimeout(function() {
//
//                    g_busy(false);
//                    $.mobile.changePage('orderHeader.html', {transition:'none'});
//                }, 2000);
//
//                return;
            }

        } else if (shoppingCartIsTotalQuantityValid()) {

            if (DaoOptions.getValue('LiveCreditCheckURL') && (sessionStorage.getItem('currentordertype').toLowerCase() === 'order') && (g_shoppingCartTotalExcl > g_shoppingCartCredit)) {

                $('#creditLimitPopup').popup('open');

            } else {
                var finish = function() {
                    var isTPMOrder = ($.inArray(sessionStorage.getItem('currentordertype'), DaoOptions.getValue('TPMOrderTypes') && DaoOptions.getValue('TPMOrderTypes').split(',') || []) !== -1);
                    $.mobile.changePage((isTPMOrder ? "tpm.html" : "orderHeader.html"), { transition: "none" });
                };

                if (DaoOptions.getValue('localTPM') === 'true') {
                    promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), finish);
                } else {
                    finish();
                }

            }
        }
    });
    $('#saveShoppingCart').toggleClass('ui-disabled', true);

    $('#deleteShoppingCart').unbind();
    $('#deleteShoppingCart').click(function() {

    	shoppingCartRemoveAllItems();
    });

    $('#barcode').unbind();
    $('#barcode').keypress(function (event) {

        var keycode = (event.keyCode ? event.keyCode : event.which);

        if ('13' === keycode)
        	shoppingCartConfirmScanOnScan();
    });

    $( "#scanPopup" ).popup({

        afteropen: function( event, ui ) {

            shoppingCartConfirmScanResetBarcode();
        }
    });

    /***
     * on each initialization of the page we want our variables reset
     */
    g_keyMap = [];
    g_keyMatchCount = 0;
    onkeydown = function(e) {
        e = e || event; // to deal with IE
        g_keyMap[e.keyCode] = e.type === 'keydown';

        // we these listeners active only on shopping cart page
        if($.mobile.activePage.attr('id') === 'shoppingCartpage' && g_keyMap[17]) {
            if (g_keyMap[66]){ // CTRL+B
               g_keyMap = [];
                // avoid calling checkout more than once
                if (g_keyMatchCount++ === 0) {
                    setTimeout(function () {
                        sessionStorage.removeItem('shoppingCartViewType');
                        shoppingCartOnBack();
                    },500);
                    return false;
                }
            } else if (g_keyMap[83]){ // CTRL+S
                g_keyMap = [];
                // avoid calling checkout more than once
                if (g_keyMatchCount++ === 0) {
                    setTimeout(function () {
                       $('#saveShoppingCart').click();
                    },500);
                    return false;
                }
            }
        }
    };

    onkeyup = onkeydown;

}

function shoppingCartChangeView() {

       var nextButtonCaption = {

           Summary: 'Detail',
           Detail: 'Summary'
       };

       $buttonCaption = $('#summaryButton').find('.ui-btn-text');

       sessionStorage.setItem('shoppingCartViewType', $buttonCaption.text());
       $buttonCaption.text(nextButtonCaption[$buttonCaption.text()]);

        g_shoppingCartTotalIncl = 0;
        g_shoppingCartTotalExcl = 0;
        g_shoppingCartVAT = 0;

        shoppingCartFetchBasket();
}

function shoppingCartConfirmScanInit() {

    var mustScan = (DaoOptions.getValue(sessionStorage.getItem('currentordertype') + 'ConfirmCartWithScan') === 'true');

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

    	          if (basketInfo.ProductID === product.id) {

                    isItemFound = true;
                    $('#scanResult').html('Scanned OK');
                    shoppingCartConfirmScanAddText(product.id);
                    shoppingCartConfirmScanResetBarcode();
    	          };

    	          if ($('.unconfirmed').length === 0) {

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
        g_currentExclusiveOrderType = undefined;
        var dao = new Dao();
        dao.cursor('BasketInfo', undefined, undefined,
         function (basketInfo) {
             if ((basketInfo.AccountID === g_currentCompany().AccountID) /*&& (basketInfo.Type == sessionStorage.getItem("currentordertype"))*/)
                 shoppingCartDeleteItem(basketInfo.key, DaoOptions.getValue('LostSaleActivityID') !== undefined);
         },
         undefined,
         function (event) {

            setTimeout(function() {

                sessionStorage.removeItem('shoppingCartViewType');
                shoppingCartOnBack();
            }, 1000);
         });
    }
}

function shoppingCartRemovePODsItems() {

    $.mobile.showPageLoadingMsg();
    var dao = new Dao();
    dao.cursor('BasketInfo', undefined, undefined,
     function (basketInfo) {
         if ((basketInfo.AccountID === g_currentCompany().AccountID) /*&& (basketInfo.Type == sessionStorage.getItem("currentordertype"))*/)
             shoppingCartDeleteItem(basketInfo.key, DaoOptions.getValue('LostSaleActivityID') != undefined);
     },
     undefined,
     function (event) {

        setTimeout(function() {

            sessionStorage.removeItem('shoppingCartViewType');
            $.mobile.changePage('route.html', { transition: "none" });
        }, 1000);
    });

}

function shoppingCartOnBack() {

    $.mobile.showPageLoadingMsg();
    var page = sessionStorage.getItem('ShoppingCartReturnPage');

    if ('pricelist' === page) {

        sessionStorage.setItem('lastPanelId', 'pricelistPanel');
        page = 'company.html';
    }

    if (page && page === 'route.html' && shoppingCartIsPOD())
        shoppingCartRemovePODsItems();
    else if (page)
        $.mobile.changePage(page, { transition: "none" });
}

function shoppingCartInit() {

    if (sessionStorage.getItem("currentordertype") === "grv") {
        $('#shoppingCartLabel').html('GRV Cart');
    } else if (sessionStorage.getItem("currentordertype") === "repl") {
        $('#shoppingCartLabel').html('Replenishment Cart');
    } else if (sessionStorage.getItem("currentordertype") === "stock") {
        $('#shoppingCartLabel').html('Stocktake Cart');
    } else if (sessionStorage.getItem("currentordertype") === "POD") {
        $('#shoppingCartLabel').html('Proof of Delivery');
        if (DaoOptions.getValue('ShowInvNumOnShopcart', 'false') === 'true' && localStorage.getItem('PODsInvNumber')) {
            $('#shopcartPODsInvNumber').text(localStorage.getItem('PODsInvNumber'));
        }
    } else if (sessionStorage.getItem('currentordertype').indexOf('Invoice') !== -1) {

        $('#shoppingCartLabel').html(sessionStorage.getItem('currentordertype').replace('Invoice', g_shoppingCartPageTranslation.translateText('Invoice')));
    }
    else {
    	var orderType = sessionStorage.getItem('currentordertype');  //ordertypecaption');
    	$('#shoppingCartLabel').html(g_shoppingCartPageTranslation.translateText((orderType ? orderType : 'Shopping') + ' Cart'));
    }

    g_basketHTML = '';

    //if (DaoOptions.getValue('localTPM') === 'true')
    //    promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), shoppingCartFetchBasket);
    //else
        shoppingCartFetchBasket();

//    shoppingCartFetchBasket();
}

function shoppingCartIsGRV() {
	return sessionStorage.getItem("currentordertype") === "grv" /*|| sessionStorage.getItem("currentordertype") == "pod"*/;
}

function shoppingCartIsPOD() {
	return sessionStorage.getItem("currentordertype") === "POD";
}

function shoppingCartAllowToChangeQty(item) {
    var field = DaoOptions.getValue('CanNotChangeBasketUF');
    var canNotChangeUFValue = DaoOptions.getValue('CanNotChangeBasketWD');

    // check if uf is set
    if (field === undefined || canNotChangeUFValue === undefined) {
        return true;
    }

    if (item[field] === canNotChangeUFValue) {

        if ($('#shoppingCartInfoPanel').hasClass('invisible')) {
            $('#shoppingCartInfoPanelMessage').html('<span>' + DaoOptions.getValue('CanNotChangeBasketMsg') + '</span>');
            $('#shoppingCartInfoPanel').removeClass('invisible');
        }

        if (shoppingCartIsAltAccGroup()) {
            sessionStorage.setItem('wasOnShoppingCart', true);
        }

        return false;
    }

    return true;

}

function shoppingCartCanNotDelSingleBask() {
    return DaoOptions.getValue('CanNotDelSingleBask', 'false') === 'true';
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
        if (DaoOptions.getValue('DoNotSortBasket', 'false') !== 'true')
            alphaFilter.getInstance().init('#alphabet');

        g_shoppingCartItemKeys = [];

        if (sessionStorage.getItem('shoppingCartViewType') === 'Detail')
            g_shoppingCartDetailItems = [];

        var dao = new Dao();
        if (DaoOptions.getValue('DoNotSortBasket', 'false') !== 'true')
            dao.indexsorted('BasketInfo',g_currentCompany().AccountID, 'index1', 'index4', shoppingCartAddItem, shoppingCartNoItems, shoppingCartOnAllItemsAdded);
        else
            dao.index('BasketInfo',g_currentCompany().AccountID, 'index1', shoppingCartAddItem, shoppingCartNoItems, shoppingCartOnAllItemsAdded);
    }
}

function shoppingCartNoItems(){
    shoppingCartOnBack();
}

function shoppingCartItemNett(item) {
    return item.RepChangedPrice ? item.RepNett : item.Nett;
}

function shoppingCartIsAltAccGroup() {

    if (!DaoOptions.getValue('SummaryReportAltAccGroup')) {
        return false;
    }

    var accGrps = DaoOptions.getValue('SummaryReportAltAccGroup').replace(/'/g,'').split(',');

    return $.inArray(g_currentCompany().AccountGroup, accGrps) !== -1;

}

function shoppingCartAddItem(item, checkSummary) {

    if (checkSummary === undefined)
        checkSummary = true;

    var summaryField;// = DaoOptions.getValue('SummaryReportField');
    var orderByField;// = DaoOptions.getValue('SummaryReportOrderBy');

    if (shoppingCartIsAltAccGroup()) {
        summaryField = DaoOptions.getValue('SummaryReportAltField');
        orderByField = DaoOptions.getValue('SummaryReportAltOrderBy');
    } else {
        summaryField = DaoOptions.getValue('SummaryReportField');
        orderByField = DaoOptions.getValue('SummaryReportOrderBy');
    }

    if ((sessionStorage.getItem('shoppingCartViewType') === 'Summary') && checkSummary && (item[summaryField])) {

        if (!g_shoppingCartSummaryItems[item[orderByField]])
            g_shoppingCartSummaryItems[item[orderByField]] = [];

        if (!g_shoppingCartSummaryItems[item[orderByField]][item[summaryField]])
            g_shoppingCartSummaryItems[item[orderByField]][item[summaryField]] = [];

        g_shoppingCartSummaryItems[item[orderByField]][item[summaryField]].push(item);
        return;
    }

    qty = shoppingCartIsGRV() && g_currentUser().SupplierID === 'DS' ? parseInt(item.UserField01, 10) : item.Quantity;
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
	if (sessionStorage.getItem("currentordertype") === "Credit") maxValue = 'max="' +  item.UserField02 + '"';

        var itemIndex = g_shoppingCartItemKeys.length;
        g_shoppingCartItemKeys.push(item.key);



        if (shoppingCartIsMultilineItem(item) && shoppingCartApplyDiscounts()){
            if (!g_shoppingCartMultilineDiscItems.hasOwnProperty(item.UserField05))
                g_shoppingCartMultilineDiscItems[item.UserField05] = [];

            if (!g_shoppingCartMultilineDiscQty.hasOwnProperty(item.UserField05))
                g_shoppingCartMultilineDiscQty[item.UserField05] = 0;

            g_shoppingCartMultilineDiscItems[item.UserField05][itemIndex] = item;
            g_shoppingCartMultilineDiscQty[item.UserField05] += qty;

            g_shoppingCartMultilineItemPromoID[itemIndex] = item.UserField05;
        } else {
            g_shoppingCartMultilineItemPromoID[itemIndex] = null;
        }



        var view = sessionStorage.getItem('shoppingCartViewType');
        if (!view || view === 'Detail')
            g_shoppingCartDetailItems.push(item);

        var step = 1;

        if (orderdetailsIsComplexView()) {

//            step = g_orderdetailsCurrentOrder[DaoOptions.getValue('MasterChartComplexUnit')] || 1;

        } else if (g_isPackSizeUnitValid(item.Unit)) {

            step = item.Unit;
        }

        step = 'step=' + step;

        var isPromotionItem = (item.Type === 'PROMO');
        var quantityReadOnly = (isPromotionItem || shoppingCartIsPOD() || !shoppingCartAllowToChangeQty(item) ? 'readonly' : '');

        if (shoppingCartIsPOD() && DaoOptions.getValue('AllowPODQtyChange', 'false') === 'true')
            quantityReadOnly = '';

        var tableClass = 'shopcartItems' + (isPromotionItem ? ' promoItemTable' : '');

        if (!qty) return;

	g_basketHTML +=
        '<li id="LI' + itemIndex + '"' + ((DaoOptions.getValue('DoNotSortBasket', 'false') !== 'true') ? alphaFilter.getInstance().addClass(item.Description) : '') + '>' +
        '<a href="#" onclick="pricelistOnItemClicked(\'' + g_pricelistItems.length + '\')">' +
        '  <table class="' + tableClass + '" >' +
        '    <tr>' +
        '       <td class="descr">' + item.Description + '</td>' +
        '       <td rowspan="2" align="right" class="quantity">' +
        '              <input ' + quantityReadOnly + ' id="' + itemIndex + '" style="width: 60px;" class="ui-input-text ui-body-c ui-corner-all ui-shadow-inset qtybox" type="number" ' + step +
        		     	' min="0" ' + maxValue +
        '        		class="quantity" onchange ="shoppingCartOnQuantityChanged(\'' + itemIndex + '\', value' + (shoppingCartIsGRV() || (sessionStorage.getItem('currentordertype') === 'Credit') ? ', ' + qty  + ', \'' + item.Description + '\'': '') + ')"  value="' + qty + '" />' +
        '       </td>' +
        '       <td rowspan="2" align="right" class="nett" id="' + itemIndex + 'nett">' + nett + '</td>' +
        '       <td rowspan="2" align="right" class="total" id="' + itemIndex + 'total">' + formattedValue + '</td>' +
        '       <td rowspan="2" align="right" class="unconfirmed message" id="' + item.ProductID + 'uc"></td>' +
        '    </tr>' +
        '    <tr>'+
        '      <td colspan=3 class="productid ui-li-desc">' + item.ProductID + ((sessionStorage.getItem('shoppingCartViewType') === 'Summary') ? '(Case: ' + parseFloat(item.Quantity)/parseFloat(item.Unit) + ')': '') + '</td></tr>' +
        '  </table>' +
        '</a>' +
        (shoppingCartIsGRV() || shoppingCartIsPOD() || (shoppingCartCanNotDelSingleBask() && quantityReadOnly !== '') ? '' :
             ' <a href="#" onclick="shoppingCartDeleteItem(\'' + item.key + '\', ' +  (DaoOptions.getValue('LostSaleActivityID') !== undefined) + ', true)" class="ui-li-link-alt ui-btn ui-btn-up-c" data-theme="c" >' +
             '<span class="ui-btn-inner ui-btn-corner-all">' +
             '<span class="ui-icon ui-icon-delete ui-icon-shadow">delete</span>' +
             '</span>' +
             '</a>') +
        '</li>';

    if (!isPromotionItem) {
        g_shoppingCartTotalExcl = g_shoppingCartTotalExcl + value;
        if (DaoOptions.getValue('DoubleTax') === 'true')
            g_shoppingCartVAT += value * item.VAT / 100;
        else
            g_shoppingCartVAT += value * (DaoOptions.getValue('CalcTaxPerProduct') === 'true' ? (item.VAT || 0) / 100 : g_vat());
        g_shoppingCartTotalIncl = g_shoppingCartTotalExcl + g_shoppingCartVAT;
    }
}

function shoppingCartOnAllItemsAdded() {

    if (sessionStorage.getItem('shoppingCartViewType') === 'Summary')
        shoppingCartAddSummaryItems();

    var totalItemsShown = ($('#divvat p').length !== 0);
    if (!totalItemsShown) {
        $('#divvat').append('<p class="ui-li-aside" id="vat"></p>');
        $('#divtotalExcl').append('<p class="ui-li-aside" id="totalExcl"></p>');
        $('#divtotalIncl').append('<p class="ui-li-aside" id="totalIncl"></p>');
    }

    if (DaoOptions.getValue('DoubleTax') === 'true') {
    	var formattedVAT = g_addCommas(g_roundToTwoDecimals(g_shoppingCartVAT));
    	totalItemsShown ? $('#divTotalWET p').text(formattedVAT) : $('#divTotalWET').append('<p class="ui-li-aside">' + formattedVAT + '</p>');
    	g_shoppingCartVAT = (g_shoppingCartTotalExcl + g_shoppingCartVAT) * g_vat();
    	g_shoppingCartTotalIncl += g_shoppingCartVAT;
    }

    // $('.quantity').keydown(function(event) {
    //     var allowDecimals = (DaoOptions.getValue('AllowDecimalQuantity', 'true') === 'true') && (DaoOptions.getValue('AllowDecimalQuantityForBranches', '').length ? ($.inArray(g_currentCompany().BranchID, DaoOptions.getValue('AllowDecimalQuantityForBranches', '').split(',')) > -1) : true);
    //     return g_isValidQuantityCharPressed(event, allowDecimals);
    // });

    $('#vat').html(g_addCommas(g_roundToTwoDecimals(g_shoppingCartVAT)));
    $('#totalExcl').html(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalExcl)));
    $('#totalIncl').html(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalIncl)));
    $('#shoppingCartitemlist').listview('refresh');
    $('.qtybox').textinput({ theme: "c" });
    g_append('#shoppingCartitemlist ', g_basketHTML);
    $('#shoppingCartitemlist').listview('refresh');
    shoppingCartCheckItemsCount();
    g_basketHTML = '';
    if (DaoOptions.getValue('DoNotSortBasket', 'false') !== 'true')
        alphaFilter.getInstance().HTML('#alphabet', '#shoppingCartitemlist');

    $('.qtybox').keypress(function(event) {
        var allowDecimals = (DaoOptions.getValue('AllowDecimalQuantity', 'true') === 'true') && (DaoOptions.getValue('AllowDecimalQuantityForBranches', '').length ? ($.inArray(g_currentCompany().BranchID, DaoOptions.getValue('AllowDecimalQuantityForBranches', '').split(',')) > -1) : true);
        return g_isValidQuantityCharPressed(event, allowDecimals);
    });

    var hidePrice = ((DaoOptions.getValue(sessionStorage.getItem("currentordertype") + 'CartHidePrice', 'false') === 'true') || g_isNoPriceUser());
    if (hidePrice) {
        $('#shoppingCartitemlist .nett').addClass('invisible');
        $('#shoppingCartitemlist .total').addClass('invisible');
        $('#totallist').addClass('invisible');
    }

    if (DaoOptions.getValue('RecalcShoppingCart','false') === 'true' && shoppingCartApplyDiscounts()) {
        shoppingCartRecalcShoppingCart();
    } else if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true' && shoppingCartApplyDiscounts()) {
        shoppingCartRecalcMultilineDiscounts();
    }
}

function shoppingCartAddSummaryItems() {

    var totalProductsAdded = 0;
    var nextReferenceIndex = 0;

    g_shoppingCartDetailItems = [];

    var headings = Object.keys(g_shoppingCartSummaryItems).sort();

    for (var i = 0; i < headings.length; ++i) {

        g_basketHTML += '<li data-role="list-divider" role="heading">' + headings[i] + '</li>';

        var groups = Object.keys(g_shoppingCartSummaryItems[headings[i]]).sort();

        for (var j = 0; j < groups.length; ++j) {

            var summaryItem = {};
            //summaryItem.Quantity = 0;

            var itemArray = g_shoppingCartSummaryItems[headings[i]][groups[j]];

            for (var k = 0; k < itemArray.length; ++k) {

                if (k === 0) {

                    summaryItem = jQuery.extend(true, {}, itemArray[k]);  //itemArray[k];
                    summaryItem.ProductID = itemArray[k][DaoOptions.getValue('SummaryReportProdID')];
                    summaryItem.Description = itemArray[k][DaoOptions.getValue('SummaryReportProdDes')];

                } else {

                    summaryItem.Quantity = Number(summaryItem.Quantity) + Number(itemArray[k].Quantity);
                }

                g_shoppingCartDetailItems.push(itemArray[k]);
            }

            totalProductsAdded += itemArray.length;
            if (summaryItem.Quantity) {
                shoppingCartAddItem(summaryItem, false);
            }
        }

        if (shoppingCartIsGroupingEnabled()) {

            if (((i + 1) % ITEMS_PER_REFERENCE === 0) || (i === headings.length - 1)) {

                 g_basketHTML += '<li>Reference <input id="reference' + nextReferenceIndex + '-' + (totalProductsAdded - 1) /*Math.ceil(((i + 1) / ITEMS_PER_REFERENCE))*/ + '" class="summaryReference ui-input-text ui-body-c ui-corner-all ui-shadow-inset" style="width: 99%;"></li>';
                 nextReferenceIndex = totalProductsAdded;
             }
        }
    }
}

function shoppingCartIsGroupingEnabled() {

    return g_orderdetailsCurrentOrder && (g_orderdetailsCurrentOrder[/*DaoOptions.getValue('SummaryReportRefIndic')*/'UserField03'] === 'Y');
}

function shoppingCartCheckItemsCount() {

    if (($.mobile.activePage.attr('id') === 'shoppingCartpage') && $('#shoppingCartitemlist li').length === 0) {

        g_currentExclusiveOrderType = undefined;
        sessionStorage.removeItem('shoppingCartViewType');
    	shoppingCartOnBack();
    }
}

function shoppingCartDeleteItem(key, saveLostSale, removeNode, onSuccess, resetItemsOnPageNumber, onError) {
    //g_shoppingCartTotalExcl = g_shoppingCartVAT = g_shoppingCartTotalIncl = 0;

    var dao = new Dao();
    dao.get('BasketInfo', key, function(json) {

        if ((removeNode && json.Type !== 'PROMO') || !removeNode) {

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

//                            if (DaoOptions.getValue('localTPM') === 'true') {
//
//                                $('#LI' + itemIndex).remove();
//                                if ($('#shoppingCartitemlist li').length)
//                                    promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), shoppingCartFetchBasket);
//                                else
//                                    shoppingCartCheckItemsCount();
//                                return;
//                            }

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
    }, onError)
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

var cartShowStockMessage = function(stock, message) {

    $('#cartMessagePopup p').text(g_companyPageTranslation.translateText(message || 'No Stock Available'));
    $('#cartMessagePopup').popup('open');
    $('#cartMessagePopup #cancelButton').removeClass('invisible').toggle(-9998 === stock);

}

function shoppingCartOnQuantityChanged(itemIndex, value, maxValue, productName) {

    if (sessionStorage.getItem('ShoppingCartNoChangeAllowed') === 'true') {
    	g_alert("You are not allowed to change the quantity");
    	$('#' + itemIndex).attr('value', maxValue);
    	return;
    }

    if (!shoppingCartIsTotalQuantityValid())
        return;

    var step = parseInt($('#' + itemIndex).attr('step'), 10);

    var quantity = Number(value);
    if (!quantity) {

//    	if (confirm('Are you sure you want to remove the item from basket?')) {
    		shoppingCartDeleteItem(g_shoppingCartItemKeys[itemIndex], DaoOptions.getValue('LostSaleActivityID') !== undefined, true);
                if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true') {
                    shoppingCartRecalcMultilineDiscounts();
                }
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

    if ((sessionStorage.getItem('ShoppingCartLessThan') === 'true') && (quantity > maxValue)) {

    	g_alert("The quantity cannot be greater than " + maxValue);
    	$('#' + itemIndex).attr('value', maxValue);
    	return;
    }

    var checkForOrderTypes = DaoOptions.getValue('OrderTypeMustHaveStock');
    var stock = g_shoppingCartDetailItems[itemIndex].Stock;
    if (checkForOrderTypes === undefined) {

        if ((DaoOptions.getValue('musthavestock') == 'true') && (isNaN(stock) || stock <= 0 || stock < quantity)) {
            if (sessionStorage.getItem('currentordertype').toLowerCase() === 'repl' && DaoOptions.getValue('ReplenishZeroStock', 'false') === 'true') {

            } else {
                cartShowStockMessage(stock);
                var previousQty = g_shoppingCartDetailItems[itemIndex].Quantity;
                $('#' + itemIndex).attr('value', previousQty);
                return;
            }
        }
    } else {
        if (($.inArray(sessionStorage.getItem('currentordertype'), checkForOrderTypes.split(',')) !== -1) && (isNaN(stock) || stock <= 0 )) {
            cartShowStockMessage(stock);
            var previousQty = g_shoppingCartDetailItems[itemIndex].Quantity;
            $('#' + itemIndex).attr('value', previousQty);
            return;
        }
    }

    var dao = new Dao();
    dao.get("BasketInfo", g_shoppingCartItemKeys[itemIndex], function(basketInfo) {

    	var volumePrice = g_pricelistVolumePrices[basketInfo.ProductID];

    	if (volumePrice && shoppingCartApplyDiscounts()) {

        	var j = 1;

    	    // increase index according to quantity

        	while (j < 5) {

        		if (quantity < volumePrice['Qty' + j])
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
            basketInfo.DiscountApplied = (volumePrice.ID != undefined && volumePrice.ID != null && volumePrice.ID != '');


                if (DaoOptions.getValue('SetRepBoolDiscountUF') && basketInfo[DaoOptions.getValue('SetRepBoolDiscountUF')]) {
                    basketInfo.RepNett = nett;
                    basketInfo.RepDiscount = discount;
        	}
    	}

        basket.saveItem(basketInfo, quantity);

        g_shoppingCartDetailItems[itemIndex].Quantity = quantity;
        $('#' + itemIndex + 'nett').text('' + g_roundToTwoDecimals(shoppingCartItemNett(basketInfo))); //$('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
        $('#' + itemIndex + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  === 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * quantity));
        g_shoppingCartTotalExcl = 0;
        $.each($(".total") ,function() {
            var value = $(this).text().replace(',','');
            g_shoppingCartTotalExcl += parseFloat(value);
        });
        shoppingCartRecalcTotals(basketInfo, quantity);

//        if (DaoOptions.getValue('localTPM') === 'true') {
//
//             promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), shoppingCartFetchBasket);
//             return;
//        }
    },
    undefined,
    undefined
    );

    g_clearCacheDependantOnBasket();
    if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true' && shoppingCartApplyDiscounts()) {
        shoppingCartRecalcMultilineDiscounts(itemIndex);
    }
}

/*
 * set g_shoppingCartTotalExcl before calling
 */
function shoppingCartRecalcTotals(basketInfo, quantity){
    $("#totalExcl").text(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalExcl)));
    if (DaoOptions.getValue('DoubleTax') === 'true') {
    	var currentTotalWET = parseFloat($('#divTotalWET p').text());
    	var difference = (quantity - basketInfo.Quantity) * basketInfo.VAT / 100 * (basketInfo.RepNett ?  basketInfo.RepNett :  basketInfo.Nett);
    	var newTotalWET = currentTotalWET + difference;
    	$('#divTotalWET p').text(g_addCommas(g_roundToTwoDecimals(newTotalWET)));
    	g_shoppingCartVAT = (g_shoppingCartTotalExcl + newTotalWET) * g_vat();
    } else if (DaoOptions.getValue('CalcTaxPerProduct') === 'true') {
    	currentTotalVAT = parseFloat($("#vat").text());
    	difference = (quantity - basketInfo.Quantity) * basketInfo.VAT / 100 * (basketInfo.RepNett ?  basketInfo.RepNett :  basketInfo.Nett);
    	g_shoppingCartVAT = currentTotalVAT + difference;
    } else {
    	 g_shoppingCartVAT = g_vat() * g_shoppingCartTotalExcl;
    }
    $("#vat").text(g_addCommas(g_roundToTwoDecimals(g_shoppingCartVAT)));
    g_shoppingCartTotalIncl = g_shoppingCartTotalExcl + g_shoppingCartVAT;
    if (DaoOptions.getValue('DoubleTax') === 'true') g_shoppingCartTotalIncl += parseFloat($('#divTotalWET p').text());
    $("#totalIncl").text(g_addCommas(g_roundToTwoDecimals(g_shoppingCartTotalIncl)));
}

function shoppingCartAlphaInit(descr){
	g_shoppingcartalpha = [];
	$('#alphabet').empty();
}

function shoppingCartIsMultilineItem(item) {
    return DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true' &&
            g_pricelistVolumePrices[item.ProductID] &&
            g_pricelistVolumePrices[item.ProductID].ID === DaoOptions.getValue('MultiLineDiscountID');
}

function shoppingCartRecalcMultilineDiscounts(changedItemIndex) {

    if (changedItemIndex !== undefined) {

        var promoID = g_shoppingCartMultilineItemPromoID[changedItemIndex];
        if (promoID !== null) {
            var itemIndexes = Object.keys(g_shoppingCartMultilineDiscItems[promoID]);
            g_shoppingCartMultilineDiscQty[promoID] = 0;
            $.each(itemIndexes, function(index, itemIndex) {
                g_shoppingCartMultilineDiscQty[promoID] += parseInt($('#' + itemIndex).val() ? $('#' + itemIndex).val() : '0',10) ;
            });

            if (!g_shoppingCartMultilineDiscQty[promoID]) return;
            itemIndexes = Object.keys(g_shoppingCartMultilineDiscItems[promoID]);
            $.each(itemIndexes, function(index, itemIndex) {
            //for (var itemIndex in g_shoppingCartMultilineDiscItems) {
                if (g_shoppingCartMultilineDiscItems[promoID].hasOwnProperty(itemIndex) && $('#' + itemIndex).val() && ($('#' + itemIndex).val() !== '0')) {
                    //var volPrice = g_pricelistVolumePrices[g_shoppingCartMultilineDiscItems[itemIndex].ProductID];

                    var dao = new Dao();
                    dao.get("BasketInfo", g_shoppingCartItemKeys[itemIndex], function(basketInfo) {
                        var qtyStr = $('#' + itemIndex).val();
                        var quantity = parseInt(qtyStr, 10);


                        var volumePrice = g_pricelistVolumePrices[basketInfo.ProductID];

                        if (volumePrice) {

                                var j = 1;

                            // increase index according to quantity

                                while (j < 5) {

                                        if (g_shoppingCartMultilineDiscQty[promoID] < volumePrice['Qty' + j])
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
                                basketInfo.DiscountApplied = (volumePrice[0].ID != undefined && volumePrice[0].ID != null && volumePrice[0].ID != '');

                                if (DaoOptions.getValue('SetRepBoolDiscountUF') && basketInfo[DaoOptions.getValue('SetRepBoolDiscountUF')]) {
                                    basketInfo.RepNett = nett;
                                    basketInfo.RepDiscount = discount;
                                }
                        }

                        basket.saveItem(basketInfo, quantity);

                        $('#' + itemIndex + 'nett').text('' + g_roundToTwoDecimals(shoppingCartItemNett(basketInfo))); //$('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
                        $('#' + itemIndex + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  === 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * quantity));
                        g_shoppingCartTotalExcl = 0;
                        $.each($(".total") ,function() {
                            var value = $(this).text().replace(',','');
                            g_shoppingCartTotalExcl += parseFloat(value);
                        });
                        shoppingCartRecalcTotals(basketInfo, quantity);

//                        if (DaoOptions.getValue('localTPM') === 'true') {
//
//                             promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), shoppingCartFetchBasket);
//                             return;
//                        }
                    },
                    undefined,
                    undefined
                    );

                    g_clearCacheDependantOnBasket();
                        }
            });
        }
    } else {
        var promoIDs = Object.keys(g_shoppingCartMultilineDiscItems);
        $.each(promoIDs, function(pIndex, promoID) {
            if (promoID !== null) {
                var itemIndexes = Object.keys(g_shoppingCartMultilineDiscItems[promoID]);
                g_shoppingCartMultilineDiscQty[promoID] = 0;
                $.each(itemIndexes, function(index, itemIndex) {
                    g_shoppingCartMultilineDiscQty[promoID] += parseInt($('#' + itemIndex).val() ? $('#' + itemIndex).val() : '0',10) ;
                });

                if (!g_shoppingCartMultilineDiscQty[promoID]) return;
                itemIndexes = Object.keys(g_shoppingCartMultilineDiscItems[promoID]);
                $.each(itemIndexes, function(index, itemIndex) {
                //for (var itemIndex in g_shoppingCartMultilineDiscItems) {
                    if (g_shoppingCartMultilineDiscItems[promoID].hasOwnProperty(itemIndex) && $('#' + itemIndex).val() && ($('#' + itemIndex).val() !== '0')) {
                        //var volPrice = g_pricelistVolumePrices[g_shoppingCartMultilineDiscItems[itemIndex].ProductID];

                        var dao = new Dao();
                        dao.get("BasketInfo", g_shoppingCartItemKeys[itemIndex], function(basketInfo) {
                            var qtyStr = $('#' + itemIndex).val();
                            var quantity = parseInt(qtyStr, 10);


                            var volumePrice = g_pricelistVolumePrices[basketInfo.ProductID];

                            if (volumePrice) {

                                    var j = 1;

                                // increase index according to quantity

                                    while (j < 5) {

                                            if (g_shoppingCartMultilineDiscQty[promoID] < volumePrice['Qty' + j])
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
                                    basketInfo.DiscountApplied = (volumePrice[0].ID != undefined && volumePrice[0].ID != null && volumePrice[0].ID != '');

                                    if (DaoOptions.getValue('SetRepBoolDiscountUF') && basketInfo[DaoOptions.getValue('SetRepBoolDiscountUF')]) {
                                        basketInfo.RepNett = nett;
                                        basketInfo.RepDiscount = discount;
                                    }
                            }

                            basket.saveItem(basketInfo, quantity);

                            $('#' + itemIndex + 'nett').text('' + g_roundToTwoDecimals(shoppingCartItemNett(basketInfo))); //$('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
                            $('#' + itemIndex + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  === 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * quantity));
                            g_shoppingCartTotalExcl = 0;
                            $.each($(".total") ,function() {
                                var value = $(this).text().replace(',','');
                                g_shoppingCartTotalExcl += parseFloat(value);
                            });
                            shoppingCartRecalcTotals(basketInfo, quantity);

//                            if (DaoOptions.getValue('localTPM') === 'true') {
//
//                                 promo.getInstance().checkMandatoryPromos(g_currentUser(), g_currentCompany(), shoppingCartFetchBasket);
//                                 return;
//                            }
                        },
                        undefined,
                        undefined
                        );

                        g_clearCacheDependantOnBasket();
                    }
                });
            }
        });
    }
}

function shoppingCartRecalcShoppingCart() {

    if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true') {
        g_shoppingCartMultilineDiscItems = {};
        g_shoppingCartMultilineDiscQty = {};
        g_shoppingCartMultilineItemPromoID = [];
    }

    if (DaoOptions.getValue('LocalDiscounts') === 'true') {
        g_busy(true);
        if (g_indexedDB) {
            discountRecalcShoppingCart();
        } else {
            shoppingCartRecalcLocalPricing(0);
        }
    } else if ((DaoOptions.getValue('MobileLiveStockDiscount') === 'true') && g_isOnline(false)) {
        g_busy(true);
        shoppingCartRecalcLivePricing(0);
    }
}

function shoppingCartRecalcLocalPricing(itemIndex) {
    //console.log('RECALCULATE SHOPPING CART LOCAL SQL - itemIndex: ' + itemIndex);

    if (itemIndex === g_shoppingCartItemKeys.length) {
        g_busy(false);
        if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true') {
            shoppingCartRecalcMultilineDiscounts();
        }
        $('#saveShoppingCart').toggleClass('ui-disabled', false);
        return;
    }

    var shoppingCartLocalPriceOnSuccess = function(json) {
        if (json.volumePrice && json.volumePrice[0] && json.volumePrice[0].ID && discountApplyDiscounts(json.volumePrice[0].ID)) {
            g_pricelistVolumePrices[currentItem.ProductID] = json.volumePrice[json.volumePrice.length - 1];
            shoppingCartCalculateLocalDiscount(json.volumePrice, itemIndex);
        } else {
            shoppingCartRecalcLocalPricing(++itemIndex);
        }
    };

    var currentItem = g_shoppingCartDetailItems[itemIndex];
    Discounts.GetPrice(currentItem,
    		shoppingCartLocalPriceOnSuccess,
    		function (e) {
    			shoppingCartRecalcLocalPricing(++itemIndex);
    		});


}

function shoppingCartCalculateLocalDiscount(volumePrice, itemIndex) {

    var gross = 0;
    var nett = 0;
    var discount = 0;
    var type;
    var deal = '';
    var discID = '';

    var qty = Number($('#' + itemIndex).val() ? $('#' + itemIndex).val() : '0');

    //shaun - added loop for multipe
    for (var i = 0; i< volumePrice.length; i++) {

    	var j = 1;

	    // increase index according to quantity

    	while (j < 5) {

            if (qty < volumePrice[i]['Qty' + j])
                    break;

            j++;
    	}

        gross = parseFloat(volumePrice[i].Gross);
        nett  = parseFloat(volumePrice[i]['Nett' + j]);
        discount = parseFloat(volumePrice[i]['Discount' + j]);
        deal = volumePrice[i].Deal;
        discID = volumePrice[i].ID;

        type = volumePrice[i]['Type'];
    }

    if (nett > gross)
        gross = nett;

    var dao = new Dao();
    dao.get("BasketInfo", g_shoppingCartItemKeys[itemIndex], function(basketInfo) {

        basketInfo.Discount = discount;
        basketInfo.Nett = nett;
        basketInfo.Gross = gross;
        basketInfo.UserField15 = type;
        basketInfo.DiscountApplied = (volumePrice[0].ID != undefined && volumePrice[0].ID != null && volumePrice[0].ID != '');
        basketInfo.Deal = deal;
        basketInfo.DiscountID = discID;
        // basketInfo.DiscountApplied = true;

        if (g_enableMultiLineDiscount === 'true' &&
                volumePrice[volumePrice.length - 1].ID === g_multiLineDiscountID) {
            if (!g_shoppingCartMultilineDiscItems.hasOwnProperty(basketInfo.UserField05))
                g_shoppingCartMultilineDiscItems[basketInfo.UserField05] = [];

            if (!g_shoppingCartMultilineDiscQty.hasOwnProperty(basketInfo.UserField05))
                g_shoppingCartMultilineDiscQty[basketInfo.UserField05] = 0;

            g_shoppingCartMultilineDiscItems[basketInfo.UserField05][itemIndex] = basketInfo;
            g_shoppingCartMultilineDiscQty[basketInfo.UserField05] += basketInfo.Quantity;

            g_shoppingCartMultilineItemPromoID[itemIndex] = basketInfo.UserField05;
        }

        basket.saveItem(basketInfo, basketInfo.Quantity);

        $('#' + itemIndex + 'nett').text('' + g_roundToTwoDecimals(shoppingCartItemNett(basketInfo))); //$('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
        $('#' + itemIndex + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  === 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * basketInfo.Quantity));

        //if (itemIndex === g_shoppingCartItemKeys.length - 1) {
            g_shoppingCartTotalExcl = 0;
            $.each($(".total") ,function() {
                var value = $(this).text().replace(',','');
                g_shoppingCartTotalExcl += parseFloat(value);
            });
            shoppingCartRecalcTotals(basketInfo, basketInfo.Quantity);
        //}

        shoppingCartRecalcLocalPricing(++itemIndex);
    },undefined, undefined);

}

function shoppingCartRecalcLivePricing(itemIndex) {

    if (itemIndex === g_shoppingCartItemKeys.length) {
        g_busy(false);
        if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true') {
            shoppingCartRecalcMultilineDiscounts();
        }
        $('#saveShoppingCart').toggleClass('ui-disabled', true);
        return;
    }

    var livePriceUrl = DaoOptions.getValue('LivePriceURL') ? DaoOptions.getValue('LivePriceURL') : g_restUrl + 'prices/getprice3';

    var currentItem = g_shoppingCartDetailItems[itemIndex];

    var url = livePriceUrl + '?supplierID=' + g_currentUser().SupplierID + '&productID=' + currentItem.ProductID + '&accountid=' + g_currentCompany().AccountID.replace(/&/g, '%26') + '&branchid=' + g_currentCompany().BranchID + '&quantity=1&gross=' + currentItem.Gross + '&nett=' + currentItem.Nett +
            '&checkStock=false&checkPrice=' + ((DaoOptions.getValue('LocalDiscounts') != 'true') ? 'true' : 'false') + '&format=json';

    console.log(url);

    var shoppingCartLivePriceOnSuccess = function(json) {
        if (json.volumePrice && json.volumePrice[0]) {
            g_pricelistVolumePrices[currentItem.ProductID] = json.volumePrice[json.volumePrice.length - 1];
            shoppingCartCalculateDiscount(json.volumePrice, itemIndex);
        } else {
            shoppingCartRecalcLivePricing(++itemIndex);
        }
    };

    g_ajaxget(url,
    		shoppingCartLivePriceOnSuccess,
    		function (e) {
    			shoppingCartRecalcLivePricing(++itemIndex);
    		});
}

function shoppingCartCalculateDiscount(volumePrice, itemIndex) {

    var gross = 0;
    var nett = 0;
    var discount = 0;
    var type;

    var qty = Number($('#' + itemIndex).val() ? $('#' + itemIndex).val() : '0');

    //shaun - added loop for multipe
    for (var i = 0; i< volumePrice.length; i++) {

    	var j = 1;

	    // increase index according to quantity

    	while (j < 5) {

            if (qty < volumePrice[i]['Qty' + j])
                    break;

            j++;
    	}

        gross = parseFloat(volumePrice[i].Gross);
        nett  = parseFloat(volumePrice[i]['Nett' + j]);
        discount = parseFloat(volumePrice[i]['Discount' + j]);

        type = volumePrice[i]['Type'];
    }

    if (nett > gross)
        gross = nett;

    var dao = new Dao();
    dao.get("BasketInfo", g_shoppingCartItemKeys[itemIndex], function(basketInfo) {

        basketInfo.Discount = discount;
        basketInfo.Nett = nett;
        basketInfo.Gross = gross;
        basketInfo.UserField15 = type;
        // basketInfo.DiscountApplied = true;
        basketInfo.DiscountApplied = (volumePrice[0].ID != undefined && volumePrice[0].ID != null && volumePrice[0].ID != '');

        if (DaoOptions.getValue('EnableMultiLineDiscount','false') === 'true' &&
                volumePrice[volumePrice.length - 1].ID === DaoOptions.getValue('MultiLineDiscountID')) {
            if (!g_shoppingCartMultilineDiscItems.hasOwnProperty(basketInfo.UserField05))
                g_shoppingCartMultilineDiscItems[basketInfo.UserField05] = [];

            if (!g_shoppingCartMultilineDiscQty.hasOwnProperty(basketInfo.UserField05))
                g_shoppingCartMultilineDiscQty[basketInfo.UserField05] = 0;

            g_shoppingCartMultilineDiscItems[basketInfo.UserField05][itemIndex] = basketInfo;
            g_shoppingCartMultilineDiscQty[basketInfo.UserField05] += basketInfo.Quantity;

            g_shoppingCartMultilineItemPromoID[itemIndex] = basketInfo.UserField05;
        }

        basket.saveItem(basketInfo, basketInfo.Quantity);

        $('#' + itemIndex + 'nett').text('' + g_roundToTwoDecimals(shoppingCartItemNett(basketInfo))); //$('#' + itemIndex + 'nett').text('' + basketInfo.Nett);
        $('#' + itemIndex + 'total').text(g_roundToTwoDecimals(shoppingCartItemNett(basketInfo) / ((DaoOptions.getValue('DividePriceByUnit')  === 'true') && g_isPackSizeUnitValid(basketInfo.Unit) ? basketInfo.Unit : 1) * basketInfo.Quantity));

        g_shoppingCartTotalExcl = 0;
        $.each($(".total") ,function() {
            var value = $(this).text().replace(',','');
            g_shoppingCartTotalExcl += parseFloat(value);
        });
        shoppingCartRecalcTotals(basketInfo, basketInfo.Quantity);

        shoppingCartRecalcLivePricing(++itemIndex);
    },undefined, undefined);

}

function shoppingCartApplyDiscounts() {
    var promoExclAccountGroup = DaoOptions.getValue('PromoExclAccountGroup');
    if (!promoExclAccountGroup)
        return true;

    if ($.inArray(g_currentCompany().AccountGroup, promoExclAccountGroup.split(',')) >= 0) {
        return false;
    } else
        return true;
}
