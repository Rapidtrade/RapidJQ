var g_orderdetailsOrderItems = [];
var g_orderdetailsComplexItems = {};
var g_orderdetailsCurrentOrder = {};
var g_orderdetailsComplexQuantities = {};
var g_orderdetailsPageTranslation = {};
var g_orderdetailsSOHInfo = {};
var g_orderdetailsShowThumbNail = false;

/**
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */

function orderdetailsOnPageBeforeCreate() {

    g_orderdetailsPageTranslation = translation('orderdetailspage');
}

function orderdetailsOnPageShow() {

    orderdetailsResetFlags();

    var cnt = parseInt(sessionStorage.getItem('currentOrderCount'));
    var json = JSON.parse(sessionStorage.getItem('CacheHistoryOrders'));
    g_orderdetailsCurrentOrder = json[cnt];

    g_orderdetailsPageTranslation.safeExecute(function(){

        g_orderdetailsPageTranslation.translateButton('#shoppingcartButton', 'Shopping Cart');
        g_orderdetailsPageTranslation.translateButton('#sendToBasketButton', 'Send all to Cart');
        g_orderdetailsPageTranslation.translateButton('#orderDetailsBackButton', 'Back');
        g_orderdetailsPageTranslation.translateButton('#sendItemButton', 'Send');
        g_orderdetailsPageTranslation.translateButton('#cancel', 'Cancel');

        g_orderdetailsPageTranslation.translateRadioButton('radioOrder', orderdetailsOrderType());
    });

    if (!$('#sendToBasketButton').hasClass('ui-disabled'))
        $('#sendToBasketButton').addClass('ui-disabled');

    if (g_orderdetailsCurrentOrder.ERPOrderNumber === 'Declined') {
        if ($('#resendOrderButton').hasClass('invisible'))
            $('#resendOrderButton').removeClass('invisible');

        if ($('#rejectOrderButton').hasClass('invisible'))
            $('#rejectOrderButton').removeClass('invisible');
    } else {
        if (!$('#resendOrderButton').hasClass('invisible'))
            $('#resendOrderButton').addClass('invisible');

        if (!$('#rejectOrderButton').hasClass('invisible'))
            $('#rejectOrderButton').addClass('invisible');
    }

    orderdetailsInit();
    orderdetailsBind();
}

function orderdetailsOrderType() {

    var field = DaoOptions.getValue('HistUseOrderTyp');
    sessionStorage.setItem('currentordertype', field ? (g_orderdetailsCurrentOrder[field] || 'Order') : 'Order');
    return field ? (g_orderdetailsCurrentOrder[field] || 'Order') : 'Order';
}

/*
 * All binding to buttons etc. should happen in this <yyy>Bind function() method
 */
function orderdetailsBind() {

// Unnecessary code, we are using just 1 radio button (!?)

//    $('#radioOrder').click(function () {
//    	sessionStorage.setItem('orderdetailsradio','radioOrder');
//    	sessionStorage.setItem('currentordertype', orderdetailsOrderType());
//    	$("#radioDelivery").attr("checked",false).checkboxradio("refresh");
//    });

//    $('#radioDelivery').click(function () {
//    	sessionStorage.setItem('orderdetailsradio','radioDelivery');
//    	sessionStorage.setItem('currentordertype','Delivery');
//    	$("#radioOrder").attr("checked",false).checkboxradio("refresh");
//    	$("#radioDelivery").attr("checked",true).checkboxradio("refresh");
//    });
//
//    $('#radioCredit').click(function () {
//    	sessionStorage.setItem('orderdetailsradio','radioCredit');
//    	sessionStorage.setItem('creatingCredit', orderdetailsIsCreditSelected());
//    	$('#saveCreditButton').toggleClass('invisible', !orderdetailsIsCreditSelected());
//    	$('#sendToBasketButton').toggleClass('invisible', orderdetailsIsCreditSelected());
//    	sessionStorage.setItem('currentordertype', 'Credit');
//    	$("#creditDelivery").attr("checked",true).checkboxradio("refresh");
//    	if (orderdetailsIsCreditSelected()) $('#creditInfoPopup').popup('open');
//    });

    $('#shoppingcartButton').unbind();
    $('#shoppingcartButton').click(function () {
        if (DaoOptions.getValue('ExclusiveOrderTypes')) {
            var exclTypes = DaoOptions.getValue('ExclusiveOrderTypes').split(',');
            var isInList = $.inArray(g_currentExclusiveOrderType, exclTypes) !== -1;
            if (g_currentExclusiveOrderType && g_currentExclusiveOrderType !== sessionStorage.getItem('currentordertype')) {
                g_alert(DaoOptions.getValue('ExclusiveOrderTypMsg') + '  Please complete the E2 first.');
                return;
            }
        }
    	sessionStorage.setItem('ShoppingCartReturnPage', 'orderdetails.html');
        $.mobile.changePage("shoppingCart.html");
    });

    if (!DaoOptions.getValue('MobileThumbnails')) {
        $('#thumbnailModeDiv').hide();
    } else {
        g_checkThumbnailMode();
    }


    $('#sendToBasketButton').unbind();
    var needToHideSendToBasket = DaoOptions.getValue('HideSendAllOrderType');
    var needToHideSendToBasketForAllTypes = DaoOptions.getValue('HideSendAllToCartAllTypes', 'false');
    if ((needToHideSendToBasketForAllTypes === 'true') || ((needToHideSendToBasket !== undefined) && g_orderdetailsCurrentOrder.Type === needToHideSendToBasket)) {
        $('#sendToBasketButton').addClass('hidden');
    } else {
        $('#sendToBasketButton').removeClass('hidden');
    }
    $('#sendToBasketButton').click(function () {

        var canDecideToEdit = DaoOptions.getValue('CanDecideToEditCart', false);
        var canDecideToEditType = DaoOptions.getValue('CanDecideToEditCartType');

        if (canDecideToEdit === 'true' && canDecideToEditType && $.inArray(g_orderdetailsCurrentOrder.Type, canDecideToEditType.split(',')) >= 0) {
            orderdetailsDecideOnEditOrder();
            return;
        }

        var removePromoItems = function(items) {
            var res = [];
            for (var i = 0; i < items.length; ++i) {
                if (!items[i].PromoID || !items[i].RepChangedPrice || (items[i].RepDiscount < 100)) {
                    if (items[i].PromoID && items[i].RepChangedPrice && (items[i].RepDiscount < 100)) {
                        delete items[i].PromoID;
                        delete items[i].RepChangedPrice;
                        delete items[i].RepDiscount;
                        delete items[i].RepNett;
                    }
                    res.push(items[i]);
                }
            }
            return res;
        };

        var checkStockOnItems = function(items) {
            var res = [];
            for (var i = 0; i < items.length; ++i) {
                if (!isNaN(items[i].Stock) && items[i].Stock > 0 && items[i].Stock >= items[i].Quantity) {
                    res.push(items[i]);
                }
            }
            return res;
        };

        if (DaoOptions.getValue('localTPM', 'false') === 'true') {
            g_orderdetailsOrderItems = removePromoItems(g_orderdetailsOrderItems);
        }

        if ((DaoOptions.getValue('AllowDecimalQuantity', 'true') !== 'true') || !(DaoOptions.getValue('AllowDecimalQuantityForBranches', '').length ? ($.inArray(g_currentCompany().BranchID, DaoOptions.getValue('AllowDecimalQuantityForBranches', '').split(',')) > -1) : true)) {
            for (var i = 0; i < g_orderdetailsOrderItems.length; ++i) {
                g_orderdetailsOrderItems[i].Quantity = Math.round(g_orderdetailsOrderItems[i].Quantity);
            }
        }

        var checkForOrderTypes = DaoOptions.getValue('OrderTypeMustHaveStock');
        if (checkForOrderTypes === undefined) {

            if (DaoOptions.getValue('musthavestock') == 'true') {
                g_orderdetailsOrderItems = checkStockOnItems(g_orderdetailsOrderItems);
            }
        } else {
            if (($.inArray(sessionStorage.getItem('currentordertype'), checkForOrderTypes.split(',')) !== -1) && (isNaN(stock) || stock <= 0 || stock < enteredQuantity())) {
                g_orderdetailsOrderItems = checkStockOnItems(g_orderdetailsOrderItems);
            }
        }

        basket.saveItems(orderdetailsIsComplexView() ? g_orderdetailsComplexItems : g_orderdetailsOrderItems, onItemsSaved);

        function onItemsSaved() {

            g_clearCacheDependantOnBasket();
            orderdetailsCheckBasket();

            if (confirm(g_orderdetailsPageTranslation.translateText('Items have been sent to your shopping cart. Would you like to go to the shopping cart now?'))) {
                sessionStorage.setItem('ShoppingCartReturnPage', 'orderdetails.html');
                $.mobile.changePage("shoppingCart.html");
            }
        }
    });

    $('#resendOrderButton').unbind();
    $('#resendOrderButton').click(function () {
        var conf = confirm('Are You sure you want to resend this ' + g_orderdetailsCurrentOrder.Type + '?');
        if (conf) {

            var onSuccess = function(json) {
                g_busy();
                if (json && json.length && json[0].status) {
                    if (!$('#resendOrderButton').hasClass('invisible'))
                        $('#resendOrderButton').addClass('invisible');
                    alert('Your ' + g_orderdetailsCurrentOrder.Type + ' has been resent successfully.');
                    sessionStorage.removeItem('HistoryCacheAccountID');
                    orderdetailsOnBackClicked();
                } else {
                    alert('An error occurred on resending Your order. Please try again later.');
                    console.log('resendOrderButton - onSuccess:');
                    console.log(json);
                }
            };

            var onFailure = function(err) {
                g_busy();
                alert('An error occurred on resending Your order. Please try again later.');
                console.log('resendOrderButton - onFailure:');
                console.log(err);
            };
            g_busy(true);
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orders_resubmit&params=(%27' + g_orderdetailsCurrentOrder.SupplierID + '%27|%27' + g_orderdetailsCurrentOrder.AccountID + '%27|%27' + g_orderdetailsCurrentOrder.OrderID + '%27)';
            console.log(url);
            g_ajaxget(url, onSuccess,onFailure);
        }
    });

    $('#rejectOrderButton').unbind();
    $('#rejectOrderButton').click(function () {
        var msg = prompt('Are You sure you want to reject this ' + g_orderdetailsCurrentOrder.Type + '?');
        if (msg !== null) {

            var onSuccess = function(json) {
                g_busy();
                if (json && json.length && json[0].status) {
                    if (!$('#rejectOrderButton').hasClass('invisible'))
                        $('#rejectOrderButton').addClass('invisible');
                    alert('Your ' + g_orderdetailsCurrentOrder.Type + ' has been rejected successfully.');
                    sessionStorage.removeItem('HistoryCacheAccountID');
                    orderdetailsOnBackClicked();
                } else {
                    alert('An error occurred on rejecting Your order. Please try again later.');
                    console.log('rejectOrderButton - onSuccess:');
                    console.log(json);
                }
            };

            var onFailure = function(err) {
                g_busy();
                alert('An error occurred on rejecting Your order. Please try again later.');
                console.log('rejectOrderButton - onFailure:');
                console.log(err);
            };
            g_busy(true);
            var url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orders_reject&params=(%27' + g_orderdetailsCurrentOrder.SupplierID + '%27|%27' + g_orderdetailsCurrentOrder.AccountID + '%27|%27' + g_orderdetailsCurrentOrder.OrderID + '%27|%27' + msg + '%27)';
            console.log(url);
            g_ajaxget(url, onSuccess,onFailure);
        }
    });

    $('#reprintButton').unbind();
    $('#reprintButton').click(function() {

        g_orderdetailsCurrentOrder.orderItems = g_orderdetailsOrderItems;
    	sessionStorage.setItem('currentOrder', JSON.stringify(g_orderdetailsCurrentOrder));
        sessionStorage.setItem('invoiceContinue','orderdetails.html');

        if ((g_orderdetailsCurrentOrder.Type === 'Quote') && (DaoOptions.getValue('PrintQuote') === 'true')) {

            $.mobile.changePage('catalogue.html');

        } else {

            g_showInvoice('orderDetailsInvoicePopup');
        }
    });

    $('#deleteButton').off().on('click', orderdetailsDeleteOrder);
    $('#csvButton').off().on('click', orderdetailsExportCSV);

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
    $('#orderDetailsBackButton').click(orderdetailsOnBackClicked);

    $('#quantityPopup').unbind();
    $('#quantityPopup').bind({
    	'popupafteropen': function() {
    		$('#quantityEdit').focus();
    	}
    });

    $('#quantityEdit').keypress(function(event) {
        var allowDecimals = (DaoOptions.getValue('AllowDecimalQuantity', 'true') === 'true') && (DaoOptions.getValue('AllowDecimalQuantityForBranches', '').length ? ($.inArray(g_currentCompany().BranchID, DaoOptions.getValue('AllowDecimalQuantityForBranches', '').split(',')) > -1) : true);
        return g_isValidQuantityCharPressed(event, allowDecimals);
    });
}

/*
 *
 */
function orderdetailsInit() {

    try {
        $('#headerlabel').text(g_orderdetailsCurrentOrder.Type + ' Details');
    } catch (err){

    }

    if (orderdetailsCanDeleteOrder()) {
        $('#deleteButton').removeClass('invisible');
    }

    if (g_orderdetailsCurrentOrder.Type === 'Quote') {

//        $('#csvButton, #deleteButton').removeClass('invisible');
        $('#csvButton').removeClass('invisible');

        if (DaoOptions.getValue('PrintQuote') === 'true') {

            $('#reprintButton').removeClass('invisible');
        }
    }

    if ((g_vanSales && (g_currentUser().RepID.toUpperCase() === g_orderdetailsCurrentOrder.BranchID.toUpperCase())) || (g_orderdetailsCurrentOrder.Type === 'Invoi')) {

        $('#reprintButton').removeClass('invisible');
    }

    if (DaoOptions.getValue('CanPrintOrderType', '') && ($.inArray(g_orderdetailsCurrentOrder.Type, DaoOptions.getValue('CanPrintOrderType', '').split(',')) > -1)) {
        try { $('#reprintButton').removeClass('invisible'); } catch (ex) { console.log(ex); }
    }

    orderdetailsInitOrderType();
    orderdetailsFetchOrderItems();
}

function orderdetailsOnBackClicked() {

    if (orderdetailsIsCreditSelected()) {

        sessionStorage.setItem('creatingCredit', false);
        $('#sendToBasketButton').removeClass('invisible');
        sessionStorage.setItem('ShoppingCartReturnPage', 'company.html');
        shoppingCartRemoveAllItems();

    } else {

        $.mobile.changePage('company.html', { transition: "none" });
    }
}

function orderdetailsIsComplexView() {

    var complexIndicator = DaoOptions.getValue('MasterChartComplexIndic','N');
    return complexIndicator && (g_orderdetailsCurrentOrder[complexIndicator] === 'Y');
}

function orderdetailsDeleteOrder_OLD() {

    var orderHeaderInfo = {};
    orderHeaderInfo.Table = "Orders";
    orderHeaderInfo.Method = "Modify2";

    g_orderdetailsCurrentOrder.Type = 'Delet';

    orderHeaderInfo.json = JSON.stringify(g_orderdetailsCurrentOrder);

    var url = DaoOptions.getValue(g_orderdetailsCurrentOrder.Type + 'LiveURL');

    if (!url)
        url = g_restUrl + 'post/post.aspx';

    g_ajaxpost(jQuery.param(orderHeaderInfo), url, onSuccess, onFailure);

    console.log(JSON.stringify(orderHeaderInfo));

    function onSuccess(json) {

        sessionStorage.setItem('HistoryCacheAccountID', '');
        orderdetailsOnBackClicked();
    }

    function onFailure() {

        g_alert('ERROR: The order is not deleted.');
    }
}

function orderdetailsDeleteOrder() {
    if (confirm('Are you sure you want to delete current ' + g_orderdetailsCurrentOrder.Type.toLowerCase() + '?')) {
        var url = g_restUrl + 'Orders/deleteorder?supplierID=' + g_orderdetailsCurrentOrder.SupplierID + '&orderid=' + g_orderdetailsCurrentOrder.OrderID + '&format=json';

        g_ajaxget(url, onSuccess, onFailure);

        function onSuccess(json) {
            if (json._Status) {
                sessionStorage.setItem('HistoryCacheAccountID', '');
                orderdetailsOnBackClicked();
            } else {
                onFailure();
            }
        }

        function onFailure() {

            g_alert('ERROR: The ' + g_orderdetailsCurrentOrder.Type.toLowerCase() + ' is not deleted.');
        }
    }
}

function orderdetailsExportCSV() {

    var csvData = [',MNB Variety Imports Pty Ltd,,,,,',
                   ',"Showroom Address: 7c/7-11 Allen Street, Waterloo NSW ",,,,,',
                   ',Phone: 02 9690 1622,,,,,',
                   ',Email: info@mnb.com.au,,,,,',
                   ',,,,,,',
                   'Product,Description,Pack Size,Price,Bar Code,Quantity,*SOH*',
                   '-------,-----------,---------,-----,--------,--------,-------'].join('\n');

    $.each(g_orderdetailsOrderItems, function(index, item) {

        csvData += '\n' + [item.ProductID, item.Description, (item.UserField03 || '-')  + '/' + (item.UserField04 || '-'), item.Nett, item.Barcode || 'N/A', item.Quantity, item.ItemID].join(',');
    });

    var csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csvData);
    var fileName = 'Quote_' + g_currentCompany().AccountID + '_' + g_orderdetailsCurrentOrder.OrderID + '.csv';

    $('#csvButton').attr({'download':fileName, 'href': csvData, 'target': '_blank'});

}

function orderdetailsCheckBasket() {

    var totalItems = 0;
    g_orderdetailsComplexQuantities = {};

    var dao = new Dao();
    dao.indexsorted('BasketInfo', g_currentCompany().AccountID, 'index1', 'index4',
    function (item) {

        if (item.Quantity) {
            totalItems++;
        }

        if (orderdetailsIsComplexView()) {

            var complexProductId = item[DaoOptions.getValue('MasterChartComplexProd')];

            if (!g_orderdetailsComplexQuantities[complexProductId])
                g_orderdetailsComplexQuantities[complexProductId] = {};

            g_orderdetailsComplexQuantities[complexProductId][item.ProductID] = +item.Quantity;

        } else {

            $('#orderitemlist td.productId:contains("' + item.ProductID + '")').nextAll('.orderedQuantity').text(item.Quantity ? item.Quantity : '');
        }

    },
    undefined,
    function (event) {

        $('#shoppingcartButton').toggleClass('ui-disabled', totalItems === 0);

        if (totalItems) {

            $('#shoppingcartButton .ui-btn-text').text('(' + totalItems + ')' + ' ' + g_orderdetailsPageTranslation.translateText('Shopping Cart'));

            if (orderdetailsIsComplexView()) {

                $.each(g_orderdetailsComplexQuantities, function(complexProductId, item) {

                    var totalQuantity = 0;

                    $.each(item, function(productId, quantity) {

                        totalQuantity += +quantity;
                    });

                    //$('#orderitemlist td.productId:contains("' + complexProductId + '")').nextAll('.orderedQuantity').text(totalQuantity ? totalQuantity : '');
                    $('#orderitemlist td.productId').filter(function(index) { return $(this).text() === complexProductId;}).nextAll('.orderedQuantity').text(totalQuantity ? totalQuantity : '');
                });
            }
        }
    });
}

/*
 * Initialise the to shopping cart buttons
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

function orderdetailsSendOrderItem(itemKey) {

    if (DaoOptions.getValue('ExcludeProdCatbyUser') === 'true') {

        if ($.inArray(g_pricelistSelectedProduct.CategoryName, g_currentCompany()[DaoOptions.getValue('ExcludeProdCatbyUserUF')].split(',')) !== -1) {

            $('#itemInfoPopup p').text(DaoOptions.getValue('ExcludeProdCatbyUserMess'));
            g_popup('#itemInfoPopup').show(2000);
            return;
        }
    }

    if (orderdetailsIsComplexView()) {

        $('#complexProductId').text(itemKey);
        var unit = g_orderdetailsCurrentOrder[DaoOptions.getValue('MasterChartComplexUnit')] || 1;
        //$('#complexProductUOM').text('UOM: ' + unit);

        g_orderdetailsShowThumbNail = (DaoOptions.getValue('ShowThumbNailsOnHistory','false') === 'true') &&
            (!localStorage.getItem('usageMode') || localStorage.getItem('usageMode') === 'Online') &&
            (!localStorage.getItem('thumbnailMode') || localStorage.getItem('thumbnailMode') === 'On_Thumbs');

        var tableRowsHTML = '';

        for (var i = 0; i < g_orderdetailsComplexItems[itemKey].length; ++i) {

            var item = g_orderdetailsComplexItems[itemKey][i];
            if (i === 0) {
		if  (!jQuery.isArray( item.Unit ) && (item.Unit - parseFloat( item.Unit ) + 1) >= 0) {
                    unit = item.Unit;
		}
		$('#complexProductUOM').text('UOM: ' + unit);
            }
            item.Unit = unit;

            var quantity = 0;

            if (g_orderdetailsComplexQuantities[itemKey]) {

                quantity = g_orderdetailsComplexQuantities[itemKey][item.ProductID] || 0;
            }

            tableRowsHTML += '<tr id="' + i +'"><td>' + item.ProductID + '</td><td>' + ((g_orderdetailsShowThumbNail && orderdetailsAddThumbnailChecker(item, true)) ? '<img style="vertical-align: middle;" src="' + productdetailGetImageUrl(item.ProductID, 80) + '" /> ' : '') +
                    item.Description + '</td><td><input type="number" min="0" value="' + quantity + '" onchange="orderdetailsOnComplexQuantityChange(this)"></td></tr>';
        }

        $('#complexProductTable tbody').html(tableRowsHTML);

        g_popup('#complexProductPopup').show(undefined, undefined, isComplexOrderValid);

        function isComplexOrderValid() {

            var isValid = true;
            var orderedItems = [];

            var totalQuantity = 0;

            $('#complexProductTable tbody tr').each(function() {

                var quantity = Number($(this).find('input').val());
                var productId = $(this).find('td:first').text();

                if (quantity) {

                    totalQuantity += quantity;

                    var item = g_orderdetailsComplexItems[itemKey][this.id];
                    item.Quantity = quantity;
                    orderedItems.push(item);

                } else if (quantity === 0 && sessionStorage.getItem('wasOnShoppingCart') === 'true') {
                    totalQuantity += 0;

                    if (g_orderdetailsComplexQuantities[itemKey] && (g_orderdetailsComplexQuantities[itemKey][productId] > 0)) {
                        var item = g_orderdetailsComplexItems[itemKey][this.id];
                        item.Quantity = 0;
                        orderedItems.push(item);
                    }
                } else {

                    var isProductInBasket = g_orderdetailsComplexQuantities[itemKey] && (g_orderdetailsComplexQuantities[itemKey][productId] > 0);

                    if (isProductInBasket) {

                        shoppingCartDeleteItem($.trim(productId) + g_currentUser().SupplierID + g_currentUser().UserID + $.trim(g_currentCompany().AccountID) + sessionStorage.getItem('currentordertype'),
                                DaoOptions.getValue('LostSaleActivityID') != undefined,
                                false,
                                function() {

                                    $('#orderitemlist td.productId:contains("' + itemKey + '")').nextAll('.orderedQuantity').empty();
                                    orderdetailsCheckBasket();
                                }
                                );
                    }
                }
            });

            if (totalQuantity % unit > 0) {

                g_alert('The total quantity must be in unit of ' + unit);
                isValid = false;
            }

            if (isValid) {

                for (var i = 0; i < orderedItems.length; ++i) {

                    orderdetailsSendItemToBasket(orderedItems[i], true);
                }
            }

            return isValid;
        };

        return;
    }

    var item = g_orderdetailsOrderItems[itemKey];

    $('#stockValue').text('');
    $('#quantityPopup').popup('open');

    orderdetailsFetchStock(item, function(stock) {
         $('#stockValue').text(stock);
    });

    $('#quantityEdit').val(item.Quantity);
    $('#quantityEdit').attr('step', item.Unit || 1);

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

    $('#deleteItemButton').off().on('click', function() {

        $('#quantityEdit').val('');
        $('#sendItemButton').trigger('click');
    });

    $('#sendItemButton').click(function(event) {

        $(this).unbind(event);

        if (!enteredQuantity()) {

            var deleteItemOnSuccess = function() {

                $itemRow = $('#orderitemlist td.productId:contains("' + item.ProductID + '")');

                $itemRow.nextAll('.orderedQuantity').empty();
                $itemRow.nextAll('.value').find('.captureQuantity').val('');
                orderdetailsCheckBasket();
            };

            shoppingCartDeleteItem($.trim(item.ProductID) + $.trim(item.SupplierID) + g_currentUser().UserID + $.trim(item.AccountID) + sessionStorage.getItem('currentordertype'),
                    DaoOptions.getValue('LostSaleActivityID') != undefined,
                    false,
                    deleteItemOnSuccess);


            return;
        }

        var isValid = (enteredQuantity() > 0);

        if (isValid && orderdetailsIsCreditSelected())
            isValid = (enteredQuantity() <= parseInt(item.Quantity, 10));

        if (!isValid)
                alert('Please enter a valid quantity');

        if (g_pricelistSelectedProduct.Unit == undefined)
            g_pricelistSelectedProduct.Unit == '1';
        if (item.Unit === null || item.Unit.trim() == 'EA')
            item.Unit='1';

        if (isValid && item.Unit) {

            if (item.Unit = '1') {
                isValid=true;
            }
            else {
            isValid = enteredQuantity() % item.Unit > 0;
            }

            if (!isValid) {

                alert('1. You are ordering in incorrect units. The pack size requires you to order in units of ' + g_pricelistSelectedProduct.Unit);
                isValid = false;
            }
        }

        if ($('#creditReasonDiv option:selected').val())
            item.UserField01 = $('#creditReasonDiv option:selected').val();

        if (orderdetailsIsCreditSelected())
            item.UserField02 = item.Quantity;

        var checkForOrderTypes = DaoOptions.getValue('OrderTypeMustHaveStock');
        var stock = item.Stock;
        if (checkForOrderTypes === undefined) {

            if ((DaoOptions.getValue('musthavestock') == 'true') && (isNaN(stock) || stock <= 0 || stock < enteredQuantity())) {
                if (sessionStorage.getItem('currentordertype').toLowerCase() === 'repl' && DaoOptions.getValue('ReplenishZeroStock', 'false') === 'true') {

                } else {
                    $('#quantityPopup').popup('close');
                    orderdetailsShowStockMessage(stock);
                    return;
                }
            }
        } else {
            if (($.inArray(sessionStorage.getItem('currentordertype'), checkForOrderTypes.split(',')) !== -1) && (isNaN(stock) || stock <= 0 || stock < enteredQuantity())) {
                $('#quantityPopup').popup('close');
                orderdetailsShowStockMessage(stock);
                return;
            }
        }

        if (isValid) {

            item.Quantity = enteredQuantity();

            orderdetailsSendItemToBasket(item, true);
            orderdetailsCheckBasket();
            $itemRow = $('#orderitemlist td.productId:contains("' + item.ProductID + '")');
            $itemRow.nextAll('.value').find('.captureQuantity').val(item.Quantity);

            if (orderdetailsIsCreditSelected())
                $('.historyOrderItems tr:contains("' + item.ProductID + '") .descr').text(item.Quantity + ' [-' + enteredQuantity() + ']');
        }
    });
}

var orderdetailsShowStockMessage = function(stock, message) {
    setTimeout(function() {
        $('#orderdetailsMessagePopup p').text(g_companyPageTranslation.translateText(message || 'No Stock Available'));
        $('#orderdetailsMessagePopup').popup('open');
        $('#orderdetailsMessagePopup #orderdetailsCancelButton').removeClass('invisible').toggle(-9998 === stock);
    }, 500);
}

function orderdetailsOnComplexQuantityChange(inputElement) {

    if (!inputElement.value)
        inputElement.value = 0;
}

function orderdetailsIsSpecialOrder() {

    return ($.inArray(g_orderdetailsCurrentOrder.Type, DaoOptions.getValue('DownloadOrderType', '').split(',')) !== -1);
}

/*
 *
 */
function orderdetailsFetchOrderItems() {

    var orderItems = [];
    var itemsShown = false;

    var success = function (json) {

        var completeloadingitems = function(orderItems) {
            orderdetailsShowOrderItems(orderItems);

            orderdetailsCheckBasket();

            if ($('#sendToBasketButton').hasClass('ui-disabled'))
                $('#sendToBasketButton').removeClass('ui-disabled');

            $.mobile.hidePageLoadingMsg();
        };


        $.each(json, function(index, item) {

            orderdetailsFetchStock(item, function(stock) {
                item.Stock = stock;
                if (index === (json.length - 1)) {
                    completeloadingitems(json);
                }
            });
        });
    };

    var error = function (e) {

        console.log(e.message);
        $.mobile.hidePageLoadingMsg();
    };

    var showOrderItems = function() {

        if (orderItems.length === 0) {
            var url = '';
            if (DaoOptions.getValue('CalcTaxPerProduct') === 'true') {
                url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_' + (orderdetailsIsSpecialOrder() ? 'readbytype3' : 'readlist');

                url += '&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentCompany().AccountID.replace('&', '%26') + '%27|%27' + g_orderdetailsCurrentOrder.OrderID + '%27|0|300)';
            } else {
                url = (DaoOptions.getValue('DownloadOrderURL') ? DaoOptions.getValue('DownloadOrderURL') + '/rest/Orders/GetOrderItems' +  (orderdetailsIsSpecialOrder() ? 'ByType3' : '') : (DaoOptions.getValue('LiveHistoryItems', g_restUrl + 'Orders/GetOrderItems')));

                url += '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID.replace('&', '%26') + '&orderID=' + g_orderdetailsCurrentOrder.OrderID + '&skip=0&top=300&format=json';
            }

            console.log(url);

            g_ajaxget(url, success, error);
            return;
        }

        if (!itemsShown) {

            $.mobile.hidePageLoadingMsg();
            orderdetailsShowOrderItems(orderItems);
            itemsShown = true;
            orderdetailsCheckBasket();
        }
    };

    if (!g_isOnline(false) || orderdetailsIsSpecialOrder()) {

        itemsShown = false;

        $.mobile.showPageLoadingMsg();

        var dao = new Dao;
        dao.index('OrderItems', g_orderdetailsCurrentOrder.OrderID, 'index2', function(order) {

            orderItems.push(order);

        }, undefined, showOrderItems);

        return;
    }

    $.mobile.showPageLoadingMsg();

    var url = '';
    if (DaoOptions.getValue('CalcTaxPerProduct') === 'true') {
        url = g_restPHPUrl + 'GetStoredProc?StoredProc=usp_orderitems_' + (orderdetailsIsSpecialOrder() ? 'readbytype3' : 'readlist');

        url += '&params=(%27' + g_currentUser().SupplierID + '%27|%27' + g_currentCompany().AccountID.replace('&', '%26') + '%27|%27' + g_orderdetailsCurrentOrder.OrderID + '%27|0|300)';
    } else {
        url = (DaoOptions.getValue('DownloadOrderURL') ? DaoOptions.getValue('DownloadOrderURL') + '/rest/Orders/GetOrderItems' +  (orderdetailsIsSpecialOrder() ? 'ByType3' : '') : (DaoOptions.getValue('LiveHistoryItems', g_restUrl + 'Orders/GetOrderItems')));

        url += '?supplierID=' + g_currentUser().SupplierID + '&accountID=' + g_currentCompany().AccountID.replace('&', '%26') + '&orderID=' + g_orderdetailsCurrentOrder.OrderID + '&skip=0&top=300&format=json';
    }


    console.log(url);

    g_ajaxget(url, success, error);
 };

 function orderdetailsShowOrderItems(orderItems) {

    var isComplexView = orderdetailsIsComplexView();

    g_orderdetailsShowThumbNail = (DaoOptions.getValue('ShowThumbNailsOnHistory','false') === 'true') &&
            (!localStorage.getItem('usageMode') || localStorage.getItem('usageMode') === 'Online') &&
            (!localStorage.getItem('thumbnailMode') || localStorage.getItem('thumbnailMode') === 'On_Thumbs');

    g_orderdetailsOrderItems = [];
    g_orderdetailsComplexItems = {};

    $('#orderitemlist').empty();

    var jsonForm = new JsonForm();
    jsonForm.show(g_currentUser().SupplierID, '#orderDetailspopup', g_orderdetailsCurrentOrder, 'StatusOrderHeader');

    for (var i = 0; i < orderItems.length; i++) {

        var orderItem = orderItems[i];
        // orderItem.PromoID = undefined;
        // orderItem.PromoType = undefined;
        if (isComplexView) {

            var complexProductId = orderItem[DaoOptions.getValue('MasterChartComplexProd')];
            var isFirstComplexProduct = !g_orderdetailsComplexItems[complexProductId];

            if (isFirstComplexProduct) {

                g_orderdetailsComplexItems[complexProductId] = [];
            }

            g_orderdetailsComplexItems[complexProductId].push(orderItem);

            if (!isFirstComplexProduct) {

                continue;
            }
        }

        var nettValue = orderItem.RepNett ? orderItem.RepNett : orderItem.Nett;
        var itemKey = syncGetKeyField(orderItem, 'OrderItems');

        var quantityInputHtml = '';

        if (!isComplexView && orderdetailsIsSpecialOrder()) {

            var step = 'step=' + (g_isPackSizeUnitValid(pricelist.Unit) ? pricelist.Unit : 1) + ' min=0';

            quantityInputHtml = '<td class="value"><input type="number" style="width:85px;position:relative;top:0px;display:inline" ' + step +
                    ' class="captureQuantity ui-input-text ui-body-c ui-corner-all ui-shadow-inset" onblur="orderdetailsQuickCapture(this, \'' + itemKey + '\',' + g_orderdetailsOrderItems.length + ')"/></td>';
        }

        var barcode = (orderdetailsIsSpecialOrder() ? orderItem[DaoOptions.getValue('MasterChrtBCodeField')] : '');
        orderItem.Description = ((!orderItem.Description || orderItem.Description == null) ? '' : orderItem.Description.replace(/'/g, '&quot;')) + (barcode ? ' (' + barcode + ')' : '');
        var stockValue = (orderItem.Stock !== undefined && orderItem.Stock !== null)? g_stockDescriptions[orderItem.Stock] || orderItem.Stock.toString() : 'N/A';
        var stockText = g_indexedDB || (DaoOptions.getValue('HideStockBubble', 'false') == 'true') ? '' : '<td><span id="' + orderItem.ProductID + 'Stock" class="ui-li-count">' + stockValue + '</span></td>';
        var doNotShowItemID = DaoOptions.getValue('DoNotShowItemID', 'false') === 'true';

        g_append('#orderitemlist', '<li data-theme="c" id="' + itemKey + '">' +
            '   <a>' + ((g_orderdetailsShowThumbNail && orderdetailsAddThumbnailChecker(orderItem, false)) ? '<img src="' + productdetailGetImageUrl(orderItem.ProductID, 80) + '" />' : '') +
            '   <p class="ui-li-heading"><strong>' + (isComplexView ? orderItem[DaoOptions.getValue('MasterChartComplexDesc')] : orderItem.Description) + '</strong></p>' +
            '   <table class="ui-li-desc historyOrderItems"><tr>' + (doNotShowItemID ? '' : '<td class="itemId">' + orderItem.ItemID + '</td>') + '<td class="productId">' + (isComplexView ? complexProductId : orderItem.ProductID) +
            '</td><td class="quantity">' + orderItem.Quantity + '</td>' +
            (g_isNoPriceUser() ? '' : '<td class="value">' + g_roundToTwoDecimals(nettValue) + '</td><td class="value">' + g_roundToTwoDecimals(orderItem.Value) + '</td>') + '<td class="orderedQuantity"></td>' + quantityInputHtml +
            stockText + '</tr></table></a>' +
            '	<a onclick="orderdetailsSendOrderItem(' + (isComplexView ? '\'' + complexProductId + '\', true' : g_orderdetailsOrderItems.length) + ')" data-role="button" data-transition="pop" data-rel="popup"  data-position-to="window" data-inline="true"' +
            '	class="ui-li-link-alt ui-btn ui-btn-up-c" data-theme="c" >' +
            '	<span class="ui-btn-inner ui-btn-corner-all">' +
            '	<span class="ui-icon ui-icon-plus ui-icon-shadow">Send to Basket</span>' +
            '	</span>' +
            '	</a>' +
            '	</li>');

        g_orderdetailsOrderItems.push(orderItem);
    }

    console.log($('#orderitemlist li:first').html());

    $.mobile.changePage("#orderdetails", { transition: "none" });
    $('#orderitemlist').listview('refresh');

    g_orderdetailsSOHInfo = {};

    $.each(g_orderdetailsOrderItems, function(index, item) {

        orderdetailsFetchStock(item, function(stock) {
            g_orderdetailsSOHInfo[item.ItemID] = stock;
        });
    });
 }

 function orderdetailsQuickCapture(inputElement, itemKey, rowIndex) {

    if (inputElement.value) {

        //$('#' + itemKey).find('.orderedQuantity').text(inputElement.value);

        var item = g_orderdetailsOrderItems[rowIndex];
        item.Description = item.Description && item.Description.replace(/'/g, '&quot;') || '';
        item.Quantity = inputElement.value;

        orderdetailsSendItemToBasket(item);
        orderdetailsCheckBasket();
    }
 }

 function orderdetailsFetchMasterChartBarcode(key, onSuccess) {

    var callback = function(item) {

        onSuccess(item[DaoOptions.getValue('MasterChrtBCodeField')]);
    };

    var dao = new Dao();
    dao.get('OrderItems', key, callback);
}

 function orderdetailsSendItemToBasket(item, showInfoMessage) {

     if (DaoOptions.getValue('AllowHistoryDownbyAccGroup') === 'true')
        item.AccountID =  g_currentCompany().AccountID;

    if (DaoOptions.getValue('ExclusiveOrderTypes')) {
        var exclTypes = DaoOptions.getValue('ExclusiveOrderTypes').split(',');



        if (g_currentExclusiveOrderType !== undefined) {
            var isInList = $.inArray(g_currentExclusiveOrderType, exclTypes) !== -1;
            if (sessionStorage.getItem('currentordertype') !== g_currentExclusiveOrderType) {
                g_alert(DaoOptions.getValue('ExclusiveOrderTypMsg') + '  Please complete the E1 first.');
                return;
            }
        } else {
            g_currentExclusiveOrderType = sessionStorage.getItem('currentordertype');
        }
    }

    item.Type = orderdetailsOrderType();

    basket.saveItem(item, undefined, function() {

    g_clearCacheDependantOnBasket();

        if (showInfoMessage) {

                $('#quantityPopup').popup('close');
                orderdetailsCheckBasket();
                $('#itemInfoPopup p').text('Item sent successfully.');
                window.setTimeout( function(){ $('#itemSentPopup').popup('open'); }, 500 );
                window.setTimeout( function(){ $('#itemSentPopup').popup('close'); }, 2500 );
        }
    });
 };

 function orderdetailsFetchStock(item, onSuccess) {

	 $('#stockValue').text('Busy...');

	 var onFetchLocalSuccess = function(json) {

            onSuccess(g_stockDescriptions[json.Stock] || json.Stock);
	 };

	 var onFetchLiveSuccess = function(json) {

                var stockDataArray = json.StockInf;

                if (stockDataArray) {

                    for (var i = 0; i < stockDataArray.length; ++i) {

                            if  (!g_currentCompany().BranchID  || ($.trim(stockDataArray[i].Warehouse.split(':')[0]) == g_currentCompany().BranchID)) {

                                    onSuccess(g_stockDescriptions[json.StockInf[i].Stock] || json.StockInf[i].Stock);
                                    break;
                            }
                    }
                }
	 };

	if (DaoOptions.getValue('MobileLiveStockDiscount') == 'true') {

            var livePriceUrl = DaoOptions.get('LivePriceURL') ? DaoOptions.getValue('LivePriceURL') : g_restUrl + 'prices/getprice3';
	    var url = livePriceUrl + '?supplierID=' + g_currentUser().SupplierID + '&productID=' + item.ProductID + '&accountid=' + g_currentCompany().AccountID.replace('&', '%26') + '&branchid=' + g_currentCompany().BranchID +
	    			'&quantity=1&gross=' + item.Gross + '&nett=' + item.Nett + '&checkStock=true&checkPrice=true&format=json';

	    g_ajaxget(url, onFetchLiveSuccess);

	} else {

	    var key = g_currentUser().SupplierID + item.ProductID + g_currentCompany().BranchID;

	    var dao = new Dao();

	    dao.get('Stock', key, onFetchLocalSuccess,
			    function (error) {

			    	console.log(error.message);
			    	$('#stockValue').text('No data available');
                    onFetchLocalSuccess({Stock: ''});
			    },
			    undefined);
	};
 };

function orderdetailsAddThumbnailChecker(orderItem, isPopupShow) {
    var field = DaoOptions.getValue('ShowThumbNailsUserfield');
    var popUpOnlyValue = DaoOptions.getValue('ShowThumbNailsPopUpOnly');
    var normalThumb = DaoOptions.getValue('ShowNormalOrdHistThumb', 'false');
    var masterThumb = DaoOptions.getValue('ShowThumbNailsMaster');

    if (isPopupShow) {

        // if we were not set field to check we will not show thumbnail on popup
        if (field == undefined) {
            return false;
        }

        // we need to show thumbnail on popup
        if (orderItem[field] === popUpOnlyValue) {
            return true;
        } else {
            return false;
        }
    } else {

        // check if this is a master order
        if (popUpOnlyValue !== undefined && masterThumb !== undefined && orderItem[field] === masterThumb) {
            return true;
        } else if (orderItem[field] === popUpOnlyValue) {
            return false;
        } else if (normalThumb === 'true') {
            return true;
        }

        return false;
    }


}

function orderdetailsCanDeleteOrder() {
    var options = DaoOptions.getValue('AllowDeleteOrderType', '');

    if (options === '') return false;

    var optionValues = options.split(',');

    return ($.inArray(g_orderdetailsCurrentOrder.Type, optionValues) > -1);
}

function orderdetailsDecideOnEditOrder() {
    $('#orderdetailsCanEditOrderPopup').popup('open');
    $('#canEditYes').unbind();
    $('#canEditNo').unbind();

    $('#canEditYes').on('click', function(e) {
        sessionStorage.setItem('currentordertype', g_orderdetailsCurrentOrder.Type);
        basket.saveItems(orderdetailsIsComplexView() ? g_orderdetailsComplexItems : g_orderdetailsOrderItems, onItemsSaved);

        function onItemsSaved() {

            g_clearCacheDependantOnBasket();
            orderdetailsCheckBasket();

            //if (confirm(g_orderdetailsPageTranslation.translateText('Items have been sent to your shopping cart. Would you like to go to the shopping cart now?'))) {
                sessionStorage.setItem('lastPanelId', 'pricelistPanel');
                sessionStorage.setItem('lastMenuItemId', 'pricelist' + (g_orderdetailsCurrentOrder.Type || 'Order') + 'Item');
                sessionStorage.removeItem('pricelistsearchtxt');
                sessionStorage.removeItem('cachePricelist');
                sessionStorage.setItem('clearSearch', true);
                try {
                    localStorage.removeItem('overwriteDiscountCheckedOK');
                } catch (ex) {}
                $.mobile.changePage("company.html");
            //}
        }
    });

    $('#canEditNo').on('click', function(e) {
        basket.saveItems(orderdetailsIsComplexView() ? g_orderdetailsComplexItems : g_orderdetailsOrderItems, onItemsSaved);

        function onItemsSaved() {

            g_clearCacheDependantOnBasket();
            orderdetailsCheckBasket();

            //if (confirm(g_orderdetailsPageTranslation.translateText('Items have been sent to your shopping cart. Would you like to go to the shopping cart now?'))) {
                sessionStorage.setItem('ShoppingCartReturnPage', 'orderdetails.html');
                $.mobile.changePage("shoppingCart.html");
            //}
        }
    });
}
