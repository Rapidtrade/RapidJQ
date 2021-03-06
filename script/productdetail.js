//*********************************************************************************

var g_productdetailIsPriceChanged = false;
var g_productdetailEditingNettValue = false;
var g_productdetailStockValues = [];
var g_productdetailCurrentImageNumber = 0;
var g_productdetailComponentMultiWarehouses = {};
var g_productdetailRetryCount = 0;

function productdetailInit() {

    // close menu if needed
    overlayOnItemClick();

    $.mobile.showPageLoadingMsg();

    $('#quantity').attr('placeholder', g_companyPageTranslation.translateText('Quantity'));
    g_companyPageTranslation.translateButton('#okbtn', 'OK');

    //reset screen
    $('.pricelistBusyImg').show();
    g_productdetailIsPriceChanged = false;

    //if ($('#quantity').hasClass('ui-disabled'))
       // $('#quantity').removeClass('ui-disabled');

    g_pricelistView = 'detail';
    $('#pricelistPanel, #searchBarPanel').hide();
    $('#productDetailPanel').show();
    $('#productDetailsMenu').show();
    $('#productInfoMsgDiv').hide();
    $('#pricelistMenu').hide();
    $('#techicalInfoTextarea').hide();
    $('#backbtn').show();

    if (DaoOptions.getValue('CanMultiImages') == 'true')
        $('#prevImage, #nextImage').removeClass('invisible');

    overlaySetMenuItems();

    if (!g_productDetailInitialized) {

            $('#divgrossvalue').append('<p class="ui-li-aside" id="grossvalue"></p>');

            if (g_userCanChangeDiscount()) {
                if (!$('#discount-r').length)
                    $('#divdiscountvalue').append('<input id="discount-r" class="ui-li-aside ui-input-text ui-body-c ui-corner-all ui-shadow-inset" style="position:relative;top:-17px;width:90px;height:10px;" type="text" value="" tabindex="2"/>');
                $('#divnettvalue').append('<p class="ui-li-aside" style="position:relative;top:-18px;" id="nett-r"></p>');
            } else {
                $('#divdiscountvalue').append('<p class="ui-li-aside" id="discount-r"></p>');
                $('#divnettvalue').append('<p class="ui-li-aside" id="nett-r"></p>');
            }


            if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true' && ($('#mode').val() === 'Online') && g_isOnline(false))
                    $('#whChoiceDiv').append('<p class="ui-li-aside" id="stockvalue" style="position:relative; top:-32px;"></p>');
            else
                    $('#divstockvalue').append('<p class="ui-li-aside" id="stockvalue" ' + (g_userCanChangeDiscount() ? 'style="position:relative;top:-18px;"' : '') + '></p>');

            g_productDetailInitialized = true;
    }

    $('#stockvalue').replaceWith('');

    if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true' && ($('#mode').val() === 'Online') && g_isOnline(false))
        $('#whChoiceDiv').append('<p class="ui-li-aside" id="stockvalue" style="position:relative; top:-32px;"></p>');
    else
        $('#divstockvalue').append('<p class="ui-li-aside" id="stockvalue" ' + (g_userCanChangeDiscount() ? 'style="position:relative;top:-18px;"' : '') + '></p>');

    if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID))
            $('#nett-r').replaceWith('<input class="ui-li-aside ui-input-text ui-body-c ui-corner-all ui-shadow-inset" style="position:relative;top:-17px;width:90px" type="text" value="" onchange="productdetailOnNettChange()"/>');
    else
            $('#divnettvalue input').replaceWith('<p class="ui-li-aside" id="nett-r"></p>');

    $('#discount').toggle(DaoOptions.getValue('ProductDetHideDisc') != 'true');

    var forbiddenOrderTypes = DaoOptions.getValue('CannotChangeDiscOrdType', '').split(',');

    if (g_pricelistCanChangeDiscount && $.inArray(sessionStorage.getItem('currentordertype'), forbiddenOrderTypes) === -1) {

        sessionStorage.removeItem('maxdiscount');
        var changeid = '.pricelistvalue';
        if (DaoOptions.getValue('changediscountonly','false') == 'true' || productdetailsAdminCanAddPromo()) changeid = '.changediscountonly'; //check if can only change discount

        $(changeid).append('<a data-role="button"  data-transition="pop" data-rel="popup"  data-inline="true" href="#valuePopup"><img class="pricelistChangePriceImg" src="img/Money-Dollar-32.png"/></a>');
        $(changeid).each(function() {
                $(this).click(function() {
                        var valueType = $(this).attr('id').replace('div', '').replace('value', '');
                        productdetailEditValue(valueType);
                });
        });
        if (g_userCanChangeDiscount()) {
            $('#divdiscountvalue a img.pricelistChangePriceImg').hide();
        }
        $('p').css('margin-right', '10px');
        $('img').attr('title', 'Change');

        $( "#valuePopup" ).on(
            'popupafteropen', function(e) {
                //$('.ui-mobile-viewport-transitioning, .ui-mobile-viewport-transitioning .ui-page').css('overflow','hidden');
            }).on(
            'popupafterclose', function(e) {
                if ($('body').hasClass('viewport-fade')) {
                    $('body').removeClass('viewport-fade');
                }
                if ($('body').hasClass('ui-mobile-viewport-transitioning')) {
                    $('body').removeClass('ui-mobile-viewport-transitioning');
                }
            }
        );

    } else {

        $('.pricelistChangePriceImg').hide();
    }

    $('.hidden').removeClass('hidden');

    if (!g_pricelistSelectedProduct.Nett)
            g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross * (1 - g_pricelistSelectedProduct.Discount / 100);

    $('#stockvalue').text('');

    // TEST CODE
//	productdetailSetStock(-9998);
    // TEST CODE END

    if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true' && ($('#mode').val() === 'Online') && g_isOnline(false)) {
        if (!$('#divstockvalue').hasClass('invisible')) {
            $('#divstockvalue').addClass('invisible');
        }
        if ($('#whChoiceDiv').hasClass('invisible')) {
            $('#whChoiceDiv').removeClass('invisible');
        }
    } else {
        if ($('#divstockvalue').hasClass('invisible')) {
            $('#divstockvalue').removeClass('invisible');
        }
        if (!$('#whChoiceDiv').hasClass('invisible')) {
            $('#whChoiceDiv').addClass('invisible');
        }
    }

    var dao = new Dao();
    dao.get('BasketInfo',
            (g_pricelistSelectedProduct.ProductID + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID).trim() + (g_pricelistSelectedProduct.Type || sessionStorage.getItem('currentordertype')),
            function(basketInfo) {

                    g_productdetailIsPriceChanged = basketInfo.RepChangedPrice ? basketInfo.RepChangedPrice : false;

                    g_pricelistSelectedProduct.Discount = basketInfo.Discount;
                    g_pricelistSelectedProduct.Nett = basketInfo.Nett;
                    g_pricelistSelectedProduct.Gross = (typeof g_pricelistSelectedProduct.Nett !== 'number') ? parseFloat(basketInfo.Gross.replace(/,/g,'')) : basketInfo.Gross;

                    if (g_productdetailIsPriceChanged) {
                        g_pricelistSelectedProduct.RepNett = basketInfo.RepNett;
                        g_pricelistSelectedProduct.RepDiscount = basketInfo.RepDiscount;
                        g_pricelistSelectedProduct.RepChangedPrice = basketInfo.RepChangedPrice;
                    }

                    if (basketInfo.Warehouse) {
                        g_pricelistSelectedProduct.Warehouse = basketInfo.Warehouse;
                    }

                    productdetailValue('nett', g_addCommas(parseFloat(g_productdetailIsPriceChanged ? basketInfo.RepNett : basketInfo.Nett).toFixed(2)));
                    productdetailValue('discount', g_addCommas(parseFloat(g_productdetailIsPriceChanged ? basketInfo.RepDiscount : basketInfo.Discount).toFixed(2)) + '%');

                    $('#quantity').val(basketInfo.Quantity);
                    //productdetailSetFocus();


            },
            function() {
                    if (sessionStorage.getItem('currentordertype')=='repl') {
                            $('#gross').hide();
                            $('#discount').hide();
                            $('#nettlabel').text('Cost');
                            $('#pricelistview').listview('refresh');
                            productdetailValue('nett', g_addCommas(parseFloat(g_pricelistSelectedProduct.Cost).toFixed(2)));
                            productdetailValue('discount', '');
                    } else {
                            productdetailValue('nett', g_addCommas(parseFloat(g_pricelistSelectedProduct.Nett).toFixed(2)));
                            productdetailValue('discount', g_addCommas(parseFloat(g_pricelistSelectedProduct.Discount).toFixed(2)) + '%');
                    }
                    if (DaoOptions.getValue('DefaultOrderQuantity')) {
                        $('#quantity').val(DaoOptions.getValue('DefaultOrderQuantity'));
                    } else {
                        $('#quantity').val('');
                    }
                    //productdetailSetFocus();



            },
            undefined
            );

    $('#grossvalue').html(g_addCommas(parseFloat(g_pricelistSelectedProduct.Gross).toFixed(2)));
    $('.hproductId').text(g_pricelistSelectedProduct.ProductID);

    var descriptionComment = false;
    if (DaoOptions.getValue('ProductDetailsAddFieldDesc') && g_pricelistSelectedProduct[DaoOptions.getValue('ProductDetailsAddFieldDesc')]) {
        descriptionComment = true;
    }

    if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID)) {

    	$('.hdescription').replaceWith('<input class="hdescription ui-input-text ui-body-c ui-corner-all ui-shadow-inset" type="text" value="' + g_pricelistSelectedProduct.Description + '"/>');

    } else {

    	$('.hdescription').replaceWith('<h3 class="hdescription">' + g_pricelistSelectedProduct.Description + (descriptionComment ? ' (' + g_pricelistSelectedProduct[DaoOptions.getValue('ProductDetailsAddFieldDesc')] + ')' : '') + '</h3>');
    }

    type = sessionStorage.getItem("currentordertype");
    $('#reasonDiv').toggleClass('invisible', type != 'Credit');
    productdetailFetchLocalStock();
    g_pricelistMobileLiveStockDiscount = (DaoOptions.getValue('MobileLiveStockDiscount') === 'true');

    if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID)) {

        $('.pricelistBusyImg').hide();
        $.mobile.hidePageLoadingMsg();

        var price = g_roundToTwoDecimals($('#li' + g_pricelistSelectedProduct.ItemIndex + ' .price').text().replace(/,/g, ''));

        g_pricelistSelectedProduct.Nett = g_pricelistSelectedProduct.Gross = parseFloat(price);
        $('.hdescription').val($('#li' + g_pricelistSelectedProduct.ItemIndex + ' .ui-li-desc').text());

        $('#grossvalue').text(g_addCommas(price));
        $('#divnettvalue input').val(price);
        if ($('#quantity').hasClass('ui-disabled')) {
        	$('#quantity').removeClass('ui-disabled');
        }

    } else {

        if (((DaoOptions.getValue('LocalDiscounts') === 'true') || ($('#mode').val() === 'Offline') || !g_isOnline(false)) && productdetailsApplyDiscounts()) {

            $('.pricelistBusyImg').hide();
            $.mobile.hidePageLoadingMsg();
            Discounts.GetPrice(g_pricelistSelectedProduct,function (vp) {
                if (!g_productdetailIsPriceChanged || (DaoOptions.getValue('SetRepBoolDiscountUF') && g_pricelistSelectedProduct[DaoOptions.getValue('SetRepBoolDiscountUF')])) {
                    if (vp.volumePrice && vp.volumePrice[0]) {
                        productdetailCalculateDiscount(vp.volumePrice);
                        sessionStorage.setItem('volumePrice' + g_currentCompany().AccountID, JSON.stringify(vp.volumePrice));
                        g_pricelistVolumePrices[g_pricelistSelectedProduct.ProductID] = vp.volumePrice[vp.volumePrice.length - 1];
                    } else {
                        sessionStorage.setItem('volumePrice'+ g_currentCompany().AccountID, JSON.stringify(""));
                        productdetailValue('discount', '0.00%');
                        $('#grossvalue').html(g_addCommas(parseFloat(g_pricelistSelectedProduct.Gross).toFixed(2)));
                        productdetailValue('nett', g_addCommas(parseFloat(g_pricelistSelectedProduct.Nett).toFixed(2)));
                    }
                }
            }, function (vp) {
                if (!g_productdetailIsPriceChanged || (DaoOptions.getValue('SetRepBoolDiscountUF') && g_pricelistSelectedProduct[DaoOptions.getValue('SetRepBoolDiscountUF')])) {
                    if (vp.volumePrice && vp.volumePrice[0]) {
                        productdetailCalculateDiscount(vp.volumePrice);
                        sessionStorage.setItem('volumePrice' + g_currentCompany().AccountID, JSON.stringify(vp.volumePrice));
                        g_pricelistVolumePrices[g_pricelistSelectedProduct.ProductID] = vp.volumePrice[vp.volumePrice.length - 1];
                    } else {
                        sessionStorage.setItem('volumePrice'+ g_currentCompany().AccountID, JSON.stringify(""));
                        productdetailValue('discount', '0.00%');
                        $('#grossvalue').html(g_addCommas(parseFloat(g_pricelistSelectedProduct.Gross).toFixed(2)));
                        productdetailValue('nett', g_addCommas(parseFloat(g_pricelistSelectedProduct.Nett).toFixed(2)));
                    }
                }
            });
//            productdetailFetchLocalDiscount();
        }

        if (g_pricelistMobileLiveStockDiscount && ($('#mode').val() === 'Online') && g_isOnline(false)) {

            g_productdetailRetryCount = 0;
            productdetailFetchLiveStockDiscount();

        } else {

            $('.pricelistBusyImg').hide();
            if ($('#quantity').hasClass('ui-disabled'))
                $('#quantity').removeClass('ui-disabled');
            $.mobile.hidePageLoadingMsg();
        }
    }

    productdetailFetchImage();
    if ($('#pricePanel').is(":visible")) {
    	$('#zoomOutButton').hide();
    	$('#zoomedin').hide();
    }

    var tabId = parseInt(DaoOptions.getValue('productmsgtabid'), 10);
    if (tabId) productdetailFetchLongText(tabId, '#productInfoMsgDiv');

    if (productdetailIsPackPrice())	$('#quantity').attr('step', g_pricelistSelectedProduct.Unit);
    productdetailBind();
    productdetailSetFocus();

    tabId = parseInt(DaoOptions.getValue('productpopupmsgtabid'), 10)

    if (tabId) {

        var onSuccess = function() {

            if ($('#productMessagePopup p').text())
                $('#productMessagePopup').popup('open');
        };

        productdetailFetchLongText(tabId, '#productMessagePopup p', onSuccess);
        $('#cancelButton').addClass('invisible');
    }
}

function productdetailBind() {

    $('#productDetailsMenuPanel li').unbind();
    $('#productDetailsMenuPanel li').click(function() {
            productdetailShowPanel($(this).text());
    });

    $('#prevImage, #nextImage').off();
    $('#prevImage, #nextImage').on('click', function() {

        'prevImage' == this.id ? g_productdetailCurrentImageNumber-- : g_productdetailCurrentImageNumber++;
        productdetailFetchImage();

        $('#prevImage').toggleClass('ui-disabled', 0 == g_productdetailCurrentImageNumber);
        $('#nextImage').toggleClass('ui-disabled', DaoOptions.getValue('MaxImages') == g_productdetailCurrentImageNumber);
    });

    $( "#valuePopup" ).popup({
        afterclose: function( event, ui ) {
        	productdetailSetFocus();
        }
    });

    $('#productMessagePopup a').unbind();
    $('#productMessagePopup a').click(function() {
    	if ((this.id == 'okButton') && (productdetailGetStock() == -9998))
    		productdetailOkClicked(false);
    });

    $('input').keyup(function(event) {
    	productdetailCheckGPMargin();
    });

    $('#gpmargintoggle').change(function() {
    	$('#marginValue').toggle('on' == $(this).val());
    	productdetailCheckGPMargin();
    });

    $('#whChoiceDiv select').change(function() {
    	productdetailWarehouseOnClick($(this).val());
    });

    $('#deleteItemButton').off();
    $('#deleteItemButton').on('click', productdetailDeleteItem);

     if (g_userCanChangeDiscount()) {
        $("#discount-r").keypress(function (event) {
            var keycode = (event.keyCode ? event.keyCode : event.which);

            if (keycode == '13') {
                productdetailOkClicked();
            }
        });
     }

     if (g_isNoPriceUser()) {
         $('#productdetailPriceLabel').hide();
         $('#gross').hide();
         $('#discount').hide();
         $('#productdetailNettVal').hide();
     }
}

function productdetailCanChangeNett(productId) {

    return (DaoOptions.getValue('CanDoNonStock') == 'true') && (productId.toLowerCase().indexOf('nonstock') != -1);
}

function productdetailSetStock(stock) {

    $('#stockvalue').text((g_stockDescriptions[stock] || ('' + stock)));
}

function productdetailGetStock() {

    var stockValue = parseInt($('#stockvalue').text(), 10);

    if (isNaN(stock)) {

        for (var stock in g_stockDescriptions) {

                if ($('#stockvalue').text() == g_stockDescriptions[stock]) {

                        stockValue = stock;
                        break;
                }
        }
    }

    return stockValue;
}

function productdetailGetWarehouse() {

    if (DaoOptions.getValue('MobileSelectWhOnDetail') === 'true') {

        if (DaoOptions.getValue('MobileSelWhOnDetailUseOrig') === 'true')
            return g_currentCompany().BranchID;
        else
            return $('#whChoiceDiv select option:selected').val() && $.trim($('#whChoiceDiv select option:selected').val().split(':')[0]);
    }

    return '';
}

function productdetailOnNettChange() {

	var nett = Number($('#divnettvalue input').val());
	$('#grossvalue').text(isNaN(nett) ? 'Undefined' : g_addCommas(g_roundToTwoDecimals(nett)));

	g_pricelistSelectedProduct.Gross = nett;
	g_pricelistSelectedProduct.Nett = nett;
}

function productdetailShowPanel(selectedPanel) {

	var panelSelectors = [];

	panelSelectors['Price'] = '#productDetailPanel';
	panelSelectors['Product Info'] = '#productInfoPanel';
	panelSelectors['Components'] = '#componentsPanel';
	panelSelectors['Alternative Products'] = '#componentsPanel';
        panelSelectors['Where Used'] = '#componentsPanel';
	panelSelectors['Technical Info'] = '#technicalInfoPanel';
	panelSelectors['Large Image'] = '#largeImagePanel';

        $('#componentsPanel').toggle(panelSelectors[selectedPanel] == '#componentsPanel');

	for (var panel in panelSelectors) {

            if (panelSelectors[panel] != '#componentsPanel')
                $(panelSelectors[panel]).toggle(selectedPanel == panel);
        }

	switch (selectedPanel) {

		case 'Components':
		case 'Alternative Products':
                case 'Where Used':
                    productdetailFetchComponents(selectedPanel);
                    break;

		case 'Product Info':
                    productdetailFetchProductInfo();
                    break;

		case 'Technical Info':

                    var onSuccess = function () {

                        if (!$('#technicalInfoDiv').html()) {

                            $('#technicalInfoDiv').html('No technical info is available.');
                            $('#technicalInfoDiv').show();
                         }

                    }

                    productdetailFetchLongText(2, '#technicalInfoDiv', onSuccess);
                    break;

		case 'Large Image':
                    productdetailFetchLargeImage();
                    break;

		default:
                    break;
	}
}

function productdetailFetchProductInfo() {

	$.mobile.showPageLoadingMsg();
	g_ajaxget(g_restUrl + 'Products/Get?supplierID=' + g_currentUser().SupplierID + '&productID=' + g_pricelistSelectedProduct.ProductID,
			productdetailFetchProductInfoOnSuccess, productdetailFetchProductInfoOnError);
	console.log(g_restUrl + 'Products/Get?supplierID=' + g_currentUser().SupplierID + '&productID=' + g_pricelistSelectedProduct.ProductID);
}

function productdetailFetchProductInfoOnSuccess(json) {

	$.mobile.hidePageLoadingMsg();

	var jsonForm = new JsonForm();
	jsonForm.show(g_currentUser().SupplierID, '#productInfoForm', json, 'ProductDetail');
}

function productdetailFetchProductInfoOnError() {

	$.mobile.hidePageLoadingMsg();
	g_alert('ERROR: Cannot fetch the product info.');
}

/*
 *
 * @param {type} componentsType
 * @returns {undefined}
 */

function productdetailFetchComponents(componentsType) {

	$('#componentsTableDiv table tbody').empty();
        sessionStorage.setItem('showAllColumns', true);

        var from = '';

        switch (componentsType) {

            case 'Components':
                url += g_restUrl + 'Products/GetChildren';
                from = 'Component';
                break;

            case 'Alternative Products':
                from = 'Alternate';
                break;

            case 'Where Used':
                from = 'WhereUsed';
                sessionStorage.setItem('showAllColumns', false);
                break;

            default:
                break;
        }

	var url = DaoOptions.getValue('LiveAltProductURL') + '?supplierID=' + g_currentUser().SupplierID + '&accountid=' + g_currentCompany().AccountID.replace('&', '%26') +
                '&branchid=' + g_currentCompany().BranchID + '&productID=' + g_pricelistSelectedProduct.ProductID + '&from=' + from + '&skip=0&top=100&format=json';

        console.log(url);

	$.mobile.showPageLoadingMsg();

	g_ajaxget(url, productdetailFetchComponentsOnSuccess, productdetailFetchComponentsOnError);
}

function productdetailFetchComponentsOnSuccess(json) {

    if (!json.length) {

        var infoText = 'No ';

        switch (sessionStorage.getItem('lastMenuItemId')) {

            case 'components':
                infoText += 'components';
                break;

            case 'altProducts':
                infoText += 'alternative products';
                break;

            case 'whereUsed':
                infoText += 'where used';
                break;
        }

        infoText += ' found.';

        $('#componentsInfoPanel .infoPanelText').text(infoText);
    }

    $('#componentsInfoPanel').toggleClass('invisible', json && (json.length > 0));
    $('#componentsTableDiv').toggleClass('invisible', !json || (json.length === 0));

    var showAllColumns = (sessionStorage.getItem('showAllColumns') === 'true');
    $('#componentsTableDiv th.optional').toggle(showAllColumns);

    $.each(json, function(index, component) {

            var canOrderComponent = true;

            var stockValue = component.Stock !== undefined ? g_stockDescriptions[component.Stock] || component.Stock.toString() : 'N/A';

            if ((component.Stock !== undefined) && isNaN(stockValue))
                canOrderComponent = false;

            //var stockValue = g_stockDescriptions[component.Stock] || component.Stock;

            var rowHtml = '<tr id="' + component.ProductID + '"><td>' + component.ProductID + '</td><td>' + component.Description + '</td>';

            if (showAllColumns) {

                var multiWhHtml = '';
                if (!canOrderComponent && DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') {
                    var whsStocksData = component.Stock; //'2B;-9999,10;50,50;0';
                    var whsStocksDataSplited = whsStocksData.split(',');


                    if (whsStocksDataSplited.length === 1) {
                        multiWhHtml += '<span id="whChoiceDivAltComponent' + component.ProductID + '" class="altComponentChoiceDiv ui-li-count ui-btn-up-c ui-btn-corner-all"  style="font-size:12.5px;">' +
                                whsStocksDataSplited[0].split(';')[1] + '</span>';
                    } else {
                        multiWhHtml += '<span id="whChoiceDivAltComponent' + component.ProductID + '" class="altComponentChoiceDiv ui-li-count"  >';
                        multiWhHtml += '<select data-productID="' + component.ProductID + '" data-mini="true" data-native-menu="true" data-inline="true">';
                        for (var i = 0; i < whsStocksDataSplited.length; ++i) {
                            var whsData = whsStocksDataSplited[i].split(';');

                            multiWhHtml += '<option value="' + whsData[0] + '" >' + whsData[0] + ': ' + (whsData[1] !== undefined ? g_stockDescriptions[whsData[1]] || whsData[1] : 'N/A')  +  '</option>';
                        }
                        multiWhHtml += '</select></span>';
                    }


                    g_productdetailComponentMultiWarehouses[component.ProductID] = whsStocksDataSplited;

                }
                var buttonDisabled = ((!canOrderComponent && DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') ? g_productdetailComponentMultiWarehouses[component.ProductID][0].split(';')[1] === '-9999' : isNaN(stockValue) )
                rowHtml += '<td>' + component.Nett + '</td><td>' + ((!canOrderComponent && DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') ? multiWhHtml : stockValue) + '</td><td>' + component.UOM + '</td><td class="quantity"></td>' +
                           '<td class="order"><a data-role="button" data-inline="true" data-mini="true" ' + (buttonDisabled ? 'class="ui-disabled"' : '') + '>Order Now</a></td>';
            }

            rowHtml += '</tr>';

            $('#componentsTableDiv tbody').append(rowHtml);

            $('td.order:last a').button().click(function() {

                    $('#componentDataDiv').html(component.ProductID + ' ' + component.Description + '<br/><br/>Nett:' + component.Nett);
                    $('#componentQuantity').val($('tr#' + component.ProductID + ' td.quantity').text());
                    $('#componentQuantityPopup').popup('open');

                    $('#componentQuantityOKButton').unbind();
                    $('#componentQuantityOKButton').click(function() {

                            var quantity = $('#componentQuantity').val();

                            if (g_isQuantityValid(parseInt(quantity, 10), parseInt(component.UOM, 10))) {

                                    $('tr#' + component.ProductID + ' td.quantity').text(quantity);
                                    if (DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') {
                                        var multivasehouses = g_productdetailComponentMultiWarehouses[component.ProductID];
                                        if (multivasehouses.length === 1) {
                                            component.UserField06 = component.Stock;
                                            component.Stock = parseInt(multivasehouses[0].split(';')[1], 10);
                                        } else {
                                            component.Warehouse = $('#componentsTableDiv #whChoiceDivAltComponent' + component.ProductID + ' select').val();
                                            var sv = '-9999';
                                            //var multivasehouses = g_productdetailComponentMultiWarehouses[component.ProductID];
                                            for (var i = 0; i < multivasehouses.length; ++i) {
                                                var whData = multivasehouses[i].split(';');
                                                if (whData[0] === component.Warehouse) {
                                                    sv = parseInt(whData[1], 10);
                                                    break;
                                                }
                                            }
                                            component.UserField06 = component.Stock;
                                            component.Stock = sv;
                                        }
                                    }
                                    basket.saveItem(component, quantity);

                                    pricelistCheckBasket(false);
                            }
                    });
            });
    });

    if (DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true') {
            $('#componentsTableDiv select').selectmenu();
            $('#componentsTableDiv').on('change', '.altComponentChoiceDiv select', function() {
                //g_alert('changed value to: ' + $(this).val());
                productdetailAltComponentOnMultWhsChange($(this).data('productid').toString(), $(this).val());
            });

        }

    $.mobile.hidePageLoadingMsg();

    var dao = new Dao();

    dao.cursor('BasketInfo', undefined, undefined,

      function (basketInfo) {

          if (basketInfo.AccountID == g_currentCompany().AccountID && basketInfo.Type == sessionStorage.getItem("currentordertype")) {

        	  $('tr#' + basketInfo.ProductID + ' td.quantity').text(basketInfo.Quantity);
                  if (DaoOptions.getValue('MobileSelectWhOnPricelist') === 'true') {
                      $('#componentsTableDiv #whChoiceDivAltComponent' + basketInfo.ProductID + ' select').val(basketInfo.Warehouse);
                      $('#componentsTableDiv #whChoiceDivAltComponent' + basketInfo.ProductID + ' select').trigger('change');
                  }
          };
      });
}

function productdetailFetchComponentsOnError(error) {

	$.mobile.hidePageLoadingMsg();
	console.log('Error in retrieving components: ' + error);
}

function productdetailAltComponentOnMultWhsChange(productID, warehouse) {
    var multivasehouses = g_productdetailComponentMultiWarehouses[productID];
    var whStock = -9999;
    for (var i = 0; i < multivasehouses.length; ++i) {
        var whData = multivasehouses[i].split(';');
        if (whData[0] === warehouse) {
            whStock = parseInt(whData[1], 10);
            break;
        }
    }
    var stockValue = whStock !== undefined ? g_stockDescriptions[whStock] || whStock.toString() : 'N/A';

    var button = $('#whChoiceDivAltComponent' + productID).parent().parent().find('td.order:last a');

    if (isNaN(stockValue)) {
        //disable order button
        if (!button.hasClass('ui-disabled'))
            button.addClass('ui-disabled');

        // delete item from basket
        $('tr#' + productID + ' td.quantity').text('');
        shoppingCartDeleteItem(productID + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID + sessionStorage.getItem('currentordertype'),
                                    DaoOptions.getValue('LostSaleActivityID') != undefined,
                                    undefined,
                                    undefined, '', undefined);

    } else {
        //enable order button
        if (button.hasClass('ui-disabled'))
            button.removeClass('ui-disabled');
    }
}

function productdetailFetchLongText(tabId, selector, onSuccess) {

    var url = g_restUrl + 'ProductLongText/Get?supplierID=' + g_currentUser().SupplierID + '&productID=' + g_pricelistSelectedProduct.ProductID + '&tabID=' + tabId + '&format=json';

    console.log(url);

    $.mobile.showPageLoadingMsg();

    var success = function (json) {

    	$.mobile.hidePageLoadingMsg();

        if (json.LongText.search(/^http/) != -1)
            json.LongText = '<a href="' + json.LongText + '" target="_blank">' + json.LongText + '</a>';

        $(selector).html(json.LongText);

        if ($(selector).parent().data('role') !== 'popup') {

            $(selector).toggle($.trim(json.LongText) != '');
        }

        if (onSuccess)
            onSuccess();
    };

    var error = function (e) {

    	$.mobile.hidePageLoadingMsg();
        console.log(e.message);
    };

    g_ajaxget(url, success, error);
}

function productdetailFetchLargeImage() {

	$('#largeImage').on('load', function() {
		$.mobile.hidePageLoadingMsg();
	});

	$.mobile.showPageLoadingMsg();
	$('#largeImage').attr('src', productdetailGetImageUrl(g_pricelistSelectedProduct.ProductID, 500));

        console.log(productdetailGetImageUrl(g_pricelistSelectedProduct.ProductID, 500));
}

function productdetailGetImageUrl(productId, size, checkImageNumber) {

    if (checkImageNumber === undefined)
        checkImageNumber = true;

    if (checkImageNumber && g_productdetailCurrentImageNumber)
        productId = productId + '_' + g_productdetailCurrentImageNumber;

    return g_url.replace('app.r', 'app1.r').replace('https','http') + 'getimage.aspx?imagename=' + productId + '&subfolder=' + g_currentUser().SupplierID + '&width=' + size + '&height=' + size;
}

function productdetailFillWarehouses(stockArray) {

    g_productdetailStockValues = [];
    $('#whChoiceDiv select').empty();

    for ( var i = 0; i < stockArray.length; i++) {

        g_productdetailStockValues[stockArray[i].Warehouse] = stockArray[i].Stock;
        $('#whChoiceDiv select').append($("<option></option>").attr("value", stockArray[i].Warehouse).text(stockArray[i].Warehouse));
    }

    $("#whChoiceDiv select option").filter(function() {
        return $(this).attr('value') == g_currentCompany().BranchID;
    }).attr('selected', true);

    $('#whChoiceDiv select').selectmenu('refresh');
}


function productdetailWarehouseOnClick(warehouse) {

	productdetailSetStock(g_productdetailStockValues[warehouse]);
}

function productdetailCheckGPMargin() {

	if ('on' == $('#gpmargintoggle').val()) {

		var currentNett = g_productdetailEditingNettValue ? parseFloat($('#nett-w').val()) : productdetailNettFromCurrentDiscount();

		$('#marginValue').text(isNaN(currentNett) ? '' : g_roundToTwoDecimals((currentNett - g_pricelistSelectedProduct.Cost) / currentNett * 100) + '%');
	}
}

function productdetailNettFromCurrentDiscount() {
	return (1 - parseFloat($('#discount-w').val(), 10) / 100) * g_pricelistSelectedProduct.Gross;
}

function productdetailSetFocus() {
	//if (g_phonegap) return;

	//if (!($('#quantity').val()))
		$('#quantity').focus();
	//else
	//	$('#okbtn').button().focus();
}

function productdetailValue(valueType, value) {

	var selector = '#' + valueType + '-r';
	var method = 'html';

        if (valueType === 'discount' && g_userCanChangeDiscount()) {
            method = 'val';
            if (value)
                value = value.replace('%', '');
        }

	if (value)
		$(selector)[method](value);
	else
		return $(selector)[method]();
}

function productdetailEditValue(valueType) {

	g_productdetailEditingNettValue = ('nett' == valueType);

	$('#nettedit').toggle(g_productdetailEditingNettValue);
	$('#discountedit').toggle(!g_productdetailEditingNettValue);

	$('.productdetailValueDescription').text('Change ' +  (g_productdetailEditingNettValue ? 'nett' : 'discount') + ' (' + productdetailValue(valueType) + ')');

	$('#' + valueType +'-w').val('');

	$('#gpmarginDiv').toggle(g_pricelistSelectedProduct.Cost != 0);
}

function productdetailSaveValue() {
	//save
	var valueType = $('#nettedit').is(':visible') ? 'nett' : 'discount';
	var valueId = valueType + '-w';

	//check for max disocunt
	if (sessionStorage.getItem('maxdiscount') && valueType === 'discount') {

            var value = parseFloat($('#' + valueId).val());
            var gross = parseFloat($('#grossvalue').text().replace(/,/g,''));
            var discount = (valueType === 'nett') ? g_roundToTwoDecimals(100 - value * 100 / gross) : value;

            try {
                var maxdiscount = parseFloat(sessionStorage.getItem('maxdiscount'));
                if ((maxdiscount > 0) && (discount > maxdiscount)){
                    g_alert('Maximum discount is ' + maxdiscount + '%');
                    return;
                }
            } catch (err){
                g_alert(err.message);
                return;
            }
	}

	//process
	productdetailValue(valueType, g_addCommas(parseFloat($('#' + valueId).val()).toFixed(2)) + ('discount' == valueType ? '%' : ''));
	if (valueType === 'discount')
		productdetailOnValueChanged(valueId);
	else
		productdetailValue('discount', g_addCommas(parseFloat(0).toFixed(2)) + '%');
	g_productdetailIsPriceChanged = true;
}

function productdetailOnValueChanged(changedValueId) {

	g_productdetailIsPriceChanged = true;

	var isNettChanged = ('nett-w' == changedValueId);
	var gross = parseFloat($('#grossvalue').text().replace(/,/g,''));
	var changedValue = parseFloat($('#' + changedValueId).val());

	var newValue = g_roundToTwoDecimals(isNettChanged ? 100 - changedValue * 100 / gross : productdetailNettFromCurrentDiscount());

	if (isNettChanged)
            newValue += '%';

	productdetailValue(isNettChanged ? 'discount' : 'nett', newValue);
}

function productdetailFetchImage() {

    var size = 300;

    if ($('#pricePanel').is(":hidden")) {

            var occupiedPageHeight = 230;
            size = (innerHeight - occupiedPageHeight < innerWidth ? innerHeight - occupiedPageHeight : innerWidth);
    }

    if ($('#pricePanel').is(":hidden")) {

        $('#loadImage').show();
        $('#loadImage').hide();
        $('#productimagebig').attr('src', productdetailGetImageUrl(g_pricelistSelectedProduct.ProductID, size));
        $('#productimagebig').show();

    } else {

        $('.productimage').show();
    	$('.productimage').attr('src', productdetailGetImageUrl(g_pricelistSelectedProduct.ProductID, size));
    }
}

//function productdetailFetchTextArea() {
//
//    var url = g_restUrl + 'ProductLongText/Get?supplierID=' + g_currentUser().SupplierID + '&productID=' + g_pricelistSelectedProduct.ProductID + '&format=json';
//    var success = function (json) {
//        if (json.LongText != "") {
//            $('#techicalInfoTextarea').show();
//            $('#techicalInfoTextarea').html(json.LongText);
//        } else
//            $('#techicalInfoTextarea').hide();
//    }
//    var error = function (e) {
//        console.log(e.message);
//    }
//    g_ajaxget(url, success, error);
//}

function productdetailFetchPrice() {

	if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID))
		return;

    var qty = parseInt($('#quantity').attr('value'));
    volumePrice = JSON.parse(sessionStorage.getItem('volumePrice' + g_currentCompany().AccountID));
    sessionStorage.setItem('CachePricelistQty',JSON.stringify(qty));
	if (g_pricelistSelectedProduct.Discount !== parseFloat($('#discount-r').val().replace('%','').replace(/,/g,''))) return;
    if ((!g_productdetailIsPriceChanged || (DaoOptions.getValue('SetRepBoolDiscountUF') && g_pricelistSelectedProduct[DaoOptions.getValue('SetRepBoolDiscountUF')])) &&
            qty && volumePrice && volumePrice !="" && productdetailIsVolumePriceCorrect(volumePrice)) {
        productdetailCalculateDiscount(volumePrice);
    }

}

function productdetailFetchLocalStock() {

	if (g_pricelistSelectedProduct.Stock) {
		productdetailSetStock(g_pricelistSelectedProduct.Stock);
	} else {
	    var key = g_currentUser().SupplierID + g_pricelistSelectedProduct.ProductID + g_currentBranch();
	    var dao = new Dao();
	    dao.get('Stock', key,
			    function (json) {
			        productdetailSetStock(json.Stock);
			    },
			    function (error) {
			    	console.log(error.message);
			    },
			    undefined);
	}
}

function productdetailFetchLiveStockDiscount(livePriceUrl, checkUrl) {

    $('#quantity').addClass('ui-disabled');

    if (checkUrl === undefined)
            checkUrl = true;

    if (checkUrl)
            livePriceUrl = DaoOptions.getValue('LivePriceURL') ? DaoOptions.getValue('LivePriceURL') : g_restUrl + 'prices/getprice3';

    var url = livePriceUrl + '?supplierID=' + g_currentUser().SupplierID + '&productID=' + g_pricelistSelectedProduct.ProductID + '&accountid=' + g_currentCompany().AccountID.replace('&', '%26') + '&branchid=' + g_currentCompany().BranchID + '&quantity=1&gross=' + g_pricelistSelectedProduct.Gross + '&nett=' + g_pricelistSelectedProduct.Nett +
            '&checkStock=true&checkPrice=' + ((DaoOptions.getValue('LocalDiscounts', 'false') !== 'true') ? 'true' : 'false') + '&format=json';

    console.log(url);

    g_ajaxget(url,
    		productdetailPriceOnSuccess,
    		function (e) {
//    			if (e.status == 200 || e.status == 0) {
//    				productdetailPriceOnSuccess;
//    			}
                        if (g_productdetailRetryCount++ < 3 ) {
                            setTimeout(function() {
                                productdetailFetchLiveStockDiscount();
                            }, 2000);
                        } else {
                            console.log(e.message);
                            $.mobile.hidePageLoadingMsg();
                            $('.pricelistBusyImg').hide();
                            $('#quantity').removeClass('ui-disabled');
                        }
    		});
}


function productdetailPriceOnSuccess (json) {

    g_productdetailRetryCount = 0;

    if (json.Errormsg) {

        $('#productMessagePopup p').text(json.Errormsg)
        $('#productMessagePopup a').hide();

        g_popup('#productMessagePopup').show(2000, function() {

            $('#productMessagePopup a').show();
        });
    }

    if (json.Message)
        $('#pricePanel h2').html('Price<span style="color:red; padding-left:20px; font-size:0.8em">' + json.Message + '</span>');

    if (json.MaxDiscount){
            if (json.MaxDiscount.MaxDiscount){
                    sessionStorage.setItem('maxdiscount', json.MaxDiscount.MaxDiscount);
            } else {
                    sessionStorage.setItem('maxdiscount', 0);
            }
    }

    if (DaoOptions.getValue('LocalDiscounts') !== 'true' && productdetailsApplyDiscounts((json.volumePrice && json.volumePrice[0]) ? json.volumePrice[0] : null)) {

        //show previous changed price
        if (!g_productdetailIsPriceChanged || (DaoOptions.getValue('SetRepBoolDiscountUF') && g_pricelistSelectedProduct[DaoOptions.getValue('SetRepBoolDiscountUF')])) {
            if (json.volumePrice && json.volumePrice[0]) {
                productdetailCalculateDiscount(json.volumePrice);
                sessionStorage.setItem('volumePrice' + g_currentCompany().AccountID, JSON.stringify(json.volumePrice));
                g_pricelistVolumePrices[g_pricelistSelectedProduct.ProductID] = json.volumePrice[json.volumePrice.length - 1];
            } else {
                sessionStorage.setItem('volumePrice'+ g_currentCompany().AccountID, JSON.stringify(""));
                productdetailValue('discount', '0.00%');
                $('#grossvalue').html(g_addCommas(parseFloat(g_pricelistSelectedProduct.Gross).toFixed(2)));
                productdetailValue('nett', g_addCommas(parseFloat(g_pricelistSelectedProduct.Nett).toFixed(2)));
            }
        }
    } else {
        sessionStorage.setItem('volumePrice'+ g_currentCompany().AccountID, JSON.stringify(""));
    }

    var setStockUnit = function (stockIndex) {

        productdetailSetStock(json.StockInf[stockIndex].Stock);

        if ((DaoOptions.getValue('LivePackSizeCheck') == 'true') && json.StockInf[stockIndex].Unit)
                g_pricelistSelectedProduct.Unit = parseInt(json.StockInf[stockIndex].Unit, 10);
    };

    //show live stock

    if (DaoOptions.getValue('LiveStock') === 'true') {

        var stockDataArray = json.StockInf;

        if (stockDataArray) {

            if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true')
                productdetailFillWarehouses(stockDataArray);

            for (var i = 0; i < stockDataArray.length; ++i) {

                if (DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true' && g_pricelistSelectedProduct.Warehouse) {
                    if ($.trim(stockDataArray[i].Warehouse.split(':')[0]) == g_pricelistSelectedProduct.Warehouse) {

                        if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true') {

                            $('#whChoiceDiv select').val(stockDataArray[i].Warehouse);
                            $('#whChoiceDiv select').trigger('change');

                        } else {

                            setStockUnit(i);
                        }

                        break;
                    }
                } else {
                    if ($.trim(stockDataArray[i].Warehouse.split(':')[0]) == g_currentCompany().BranchID) {

                        if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true') {

                            $('#whChoiceDiv select').val(stockDataArray[i].Warehouse);
                            $('#whChoiceDiv select').trigger('change');

                        } else {

                            setStockUnit(i);
                        }

                        break;
                    }

                    if (g_currentCompany().BranchID == '') {

                        setStockUnit(i);

                        break;
                    }


                }
            }

            if (DaoOptions.getValue('MobileSelectWhOnDetail') == 'true' && stockDataArray.length > 0 && $("#whChoiceDiv select option:selected").length == 1) {
                try {
                    setStockUnit($('#whChoiceDiv select')[0].selectedIndex);
                } catch (selectErr) {}
            }
        }
    }
    if (DaoOptions.getValue('LocalDiscounts') !== 'true') {
        $.mobile.hidePageLoadingMsg();
    }
    $('.pricelistBusyImg').hide();
    $('#quantity').removeClass('ui-disabled');
}

function productdetailCalculateDiscount(volumePrice) {

    var gross = 0;
    var nett = 0;
    var discount = 0;
    var type;
    var deal = '';
    var discID = '';

    var qty = parseInt($('#quantity').attr('value')) || 0;

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

    if (g_pricelistMobileLiveStockDiscount && (nett > gross))
        gross = nett;

    g_pricelistSelectedProduct.Discount = discount;
    g_pricelistSelectedProduct.Nett = nett;
    g_pricelistSelectedProduct.Gross = gross;
    g_pricelistSelectedProduct.UserField15 = type;
    g_pricelistSelectedProduct.DiscountApplied = (volumePrice[0].ID != undefined && volumePrice[0].ID != null && volumePrice[0].ID != '');
    g_pricelistSelectedProduct.Deal = deal;
    g_pricelistSelectedProduct.DiscountID = discID;

    productdetailValue('discount', g_addCommas(discount.toFixed(2)) + '%');
    $('#grossvalue').html(g_addCommas(gross.toFixed(2)));
    productdetailValue('nett', g_addCommas(nett.toFixed(2)));

}

function productdetailDeleteItem() {

    var deleteItemOnSuccess = function() {

            if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID)) {

                pricelistShowExpandCategory(true);
                pricelistBasicSearch();

            } else {

                $('#' + g_pricelistSelectedProduct.ItemIndex).text('');
            }

            pricelistOnBackButtonClick();
    };

    shoppingCartDeleteItem(g_pricelistSelectedProduct.ProductID + g_currentUser().SupplierID + g_currentUser().UserID + g_currentCompany().AccountID + (g_pricelistSelectedProduct.Type || sessionStorage.getItem('currentordertype')),
                            DaoOptions.getValue('LostSaleActivityID') != undefined,
                            undefined,
                            deleteItemOnSuccess, '', pricelistOnBackButtonClick);
}

function productdetailOkClicked(checkStock) {

    if (g_userCanChangeDiscount()) {
        var tmpGross = parseFloat($('#grossvalue').html().replace(/,/g, ''));
        var tmpNett = parseFloat(productdetailValue('nett').replace(/,/g, ''));
        var tmpDiscount = productdetailValue('discount').replace(/,/g, '');
        try {
            tmpDiscount = parseFloat(tmpDiscount);
        } catch (ex ) {
            tmpDiscount = 0.00;
        }

        tmpNett = tmpGross - (tmpGross * (tmpDiscount/100.00));
        productdetailValue('nett', g_addCommas(g_roundToTwoDecimals(tmpNett)));
    }

    productdetailFetchPrice();

    if ($('#quantity').hasClass('ui-disabled')) {
        return;
    }



    var showMessage = function(message) {

        $('#productMessagePopup p').text(g_companyPageTranslation.translateText(message || 'Not available to purchase'));
        $('#productMessagePopup').popup('open');
        $('#productMessagePopup #cancelButton').removeClass('invisible').toggle(-9998 === stock);
        $('#quantity').toggleClass('ui-disabled', -9999 === stock);
    }

    if (DaoOptions.getValue('ExcludeProdCatbyUser') === 'true') {

//        var categories;
//
//        if (DaoOptions.get('ExcludeProdCatbyUserProdUF'))
//            categories = g_pricelistSelectedProduct[DaoOptions.getValue('ExcludeProdCatbyUserProdUF')];
//        else
//            categories = g_currentCompany()[DaoOptions.getValue('ExcludeProdCatbyUserUF')];
//
//        if ($.inArray(g_pricelistSelectedProduct.CategoryName, (categories || '').split(',')) !== -1) {
//
//            showMessage(DaoOptions.getValue('ExcludeProdCatbyUserMess'));
//            return;
//        }

        var category = DaoOptions.get('ExcludeProdCatbyUserProdUF') ? g_pricelistSelectedProduct[DaoOptions.getValue('ExcludeProdCatbyUserProdUF')] : g_pricelistSelectedProduct.CategoryName;

        if ($.inArray(category, (g_currentCompany()[DaoOptions.getValue('ExcludeProdCatbyUserUF')] || '').split(',')) !== -1) {

            showMessage(DaoOptions.getValue('ExcludeProdCatbyUserMess'));
            return;
        }
    }

    if (DaoOptions.getValue('ExclusiveOrderTypes')) {
        var exclTypes = DaoOptions.getValue('ExclusiveOrderTypes').split(',');



        if (g_currentExclusiveOrderType !== undefined) {
            var isInList = $.inArray(g_currentExclusiveOrderType, exclTypes) !== -1;
            if (sessionStorage.getItem('currentordertype') !== g_currentExclusiveOrderType) {
                g_alert(DaoOptions.getValue('ExclusiveOrderTypMsg') + '  Please complete the E2 first.');
                return;
            }
        } else {
            g_currentExclusiveOrderType = sessionStorage.getItem('currentordertype');
        }
    }

    checkStock = (checkStock !== undefined) ? checkStock : true;

    var stock = productdetailGetStock();

    $('#quantity').blur();

    if (checkStock && ((-9999 == stock) || (-9998 == stock))) {

        showMessage(DaoOptions.getValue(stock));
        return;
    }

    if (($('#grossvalue').text() == 'Undefined') || (Number($('#grossvalue').text()) == 0) && (DaoOptions.getValue('CanOrderZeroPrice') !== 'true')) {

        showMessage();
        return;
    }

    if (productdetailCanChangeNett(g_pricelistSelectedProduct.ProductID)) {

        if (!$.trim($('.hdescription').val()))
                return;

        $('#li' + g_pricelistSelectedProduct.ItemIndex + ' .ui-li-desc').text($('.hdescription').val());
    }

    $('#li' + g_pricelistSelectedProduct.ItemIndex + ' .price').text(g_addCommas(parseFloat(g_pricelistSelectedProduct.Nett).toFixed(2)));

    var quantity = Number($('#quantity').attr('value'));
    if (!quantity /*&& confirm('Are you sure you want to remove the item from basket?')*/) {

        productdetailDeleteItem();
        return;
    }

    if (checkStock && g_isOnline(false)) {

        var checkForOrderTypes = DaoOptions.getValue('OrderTypeMustHaveStock');

        if (checkForOrderTypes === undefined) {

            if ((DaoOptions.getValue('musthavestock') == 'true') && (isNaN(stock) || stock <= 0 || (-1 == parseInt($('#nett-r').text(), 10)))) {
                if (sessionStorage.getItem('currentordertype').toLowerCase() === 'repl' && DaoOptions.getValue('ReplenishZeroStock', 'false') === 'true') {

                } else {
                    showMessage();
                    return;
                }
            }
        } else {
            if (($.inArray(sessionStorage.getItem('currentordertype'), checkForOrderTypes.split(',')) !== -1) && (isNaN(stock) || stock <= 0 )) {
                showMessage();
                return;
            }
        }



    }

    type = $.trim(sessionStorage.getItem("currentordertype"));
    if (('Credit' == type) && !$('#reason').attr('value').trim()) {
        g_alert('You need to enter a reason.');
    	return;
    }

    if (g_isQuantityValid($('#quantity').attr('value'), g_pricelistSelectedProduct.Unit)) {
    	var qty = Number($('#quantity').attr('value'));
        var stock = productdetailGetStock();
        if (g_vanSales && g_currentUser().RepID.toUpperCase() == g_currentCompany().BranchID.toUpperCase() && type == 'Order' && (stock < qty || isNaN(stock))) {
            g_alert('You can\'t order more than you have in stock.');
        } else if (type.substring(0,7) == DaoOptions.getValue('VanOrderType','') && (stock < qty || isNaN(stock))) {
            g_alert('You can\'t order more than you have in stock.');
        } else {
            $('.productimage').hide();

            if (typeof g_pricelistSelectedProduct.Nett !== 'number')
                g_pricelistSelectedProduct.Nett = Number(g_pricelistSelectedProduct.Nett);

            g_pricelistSelectedProduct.RepChangedPrice = (productdetailValue('nett') !== g_addCommas(g_pricelistSelectedProduct.Nett.toFixed(2)));

            if (g_pricelistSelectedProduct.RepChangedPrice) {

                var minDiscount = 0, maxDiscount = 100;

                if (DaoOptions.get('MaxDiscountChangePerc')) {

                    minDiscount = g_pricelistSelectedProduct.Discount - Number(DaoOptions.getValue('MaxDiscountChangePerc'));
                    maxDiscount = g_pricelistSelectedProduct.Discount + Number(DaoOptions.getValue('MaxDiscountChangePerc'));

                    if (minDiscount < 0)
                        minDiscount = 0;

                } else {

                    minDiscount = DaoOptions.getValue('MinRepDiscount', 0);
                    maxDiscount = DaoOptions.getValue('MaxRepDiscount', 100);
                }

                var discount = parseFloat(productdetailValue('discount'));

                if ((discount < minDiscount) || (discount > maxDiscount)) {

                    if (DaoOptions.getValue('OverWriteMaxDiscPass') === undefined) {
                        // user is not allowed to overwrite discount
                        g_alert('The discount must be ' + minDiscount + ' - ' + maxDiscount + ' %');
                        return;
                    } else if (DaoOptions.getValue('OverWriteMaxDiscPass') && (localStorage.getItem('overwriteDiscountCheckedOK') === undefined ||
                            localStorage.getItem('overwriteDiscountCheckedOK') === null)) {
                        // show popoup
                        productdetailsShowDiscOverwritePasswordPopup();
                        return;
                    } else if (DaoOptions.getValue('OverWriteMaxDiscPass') && localStorage.getItem('overwriteDiscountCheckedOK') !== undefined &&
                            localStorage.getItem('overwriteDiscountCheckedOK') !== null && localStorage.getItem('overwriteDiscountCheckedOK')) {
                        // this is ok!
                    }
                }
                g_pricelistSelectedProduct.RepDiscount = discount;
                var rNetStr = $('#divnettvalue input').val() || productdetailValue('nett');
                g_pricelistSelectedProduct.RepNett = parseFloat(rNetStr.replace(/,/g,''));
                if (!productdetailsAdminCanAddPromo() || g_pricelistSelectedProduct.RepDiscount !== 100) {
                    $('#li' + g_pricelistSelectedProduct.ItemIndex + ' .price').text(g_addCommas(parseFloat(g_pricelistSelectedProduct.RepNett).toFixed(2)));
                }

            }

            if (DaoOptions.getValue('SetRepBoolDiscountUF') && g_pricelistSelectedProduct[DaoOptions.getValue('SetRepBoolDiscountUF')]) {
                g_pricelistSelectedProduct.RepChangedPrice = true;
                g_pricelistSelectedProduct.RepNett = g_pricelistSelectedProduct.Nett;
                g_pricelistSelectedProduct.RepDiscount = g_pricelistSelectedProduct.Discount;
            }

            if (productdetailsAdminCanAddPromo() && g_pricelistSelectedProduct.RepDiscount === 100) {
                type = 'PROMOADMIN';
                g_pricelistSelectedProduct.PromoID = 'PROMOADMIN';
                g_pricelistSelectedProduct.Type = type;
            }

            var onSave = function() {
                g_clearCacheDependantOnBasket(false);
                pricelistCheckBasket();
                if (!productdetailsAdminCanAddPromo() || g_pricelistSelectedProduct.RepDiscount !== 100) {
                    $('#' + g_pricelistSelectedProduct.ItemIndex).html(qty);
                }
                if (!g_vanSales && !g_pricelistIsAnyItemAdded) {
                    sessionStorage.setItem('ordertypecaption', $('#menu').val());
                    g_pricelistIsAnyItemAdded = true;
                }
                pricelistOnBackButtonClick();
            };

            productdetailSave(qty, type, g_pricelistSelectedProduct, onSave);

        }
    } else if (!productdetailIsPackPrice()) {
    	$('#quantity').val('');
        productdetailSetFocus();
    }
}

function productdetailIsPackPrice() {

    return g_isPackSizeUnitValid(g_pricelistSelectedProduct.Unit);
}

function productdetailSave(qty, type, product, onSave) {

    if (productdetailCanChangeNett(product.ProductID))
        product.Description = $('.hdescription').val();

    product.Gross = Number($('#grossvalue').html().replace(/,/g, ''));

    if (product.RepChangedPrice) {

        var rNetStr = $('#divnettvalue input').val() || productdetailValue('nett');
        product.RepNett = parseFloat(rNetStr.replace(/,/,''));
        product.RepDiscount = parseFloat(productdetailValue('discount')); //productdetailValue('discount');
    }

    product.Stock = productdetailGetStock();
    product.Warehouse = productdetailGetWarehouse();

    if (DaoOptions.getValue('MobileSelectWhOnPricelist') == 'true' && product.Warehouse) {
        $('#whChoiceDiv' + product.ProductID + ' select').val(product.Warehouse);
        $('#whChoiceDiv' + product.ProductID + ' select').trigger('change');
    }

    if (type === 'Credit')
        product.UserField01 = $('#reason').attr('value');

    basket.saveItem(product, qty, onSave);
}

function productdetailToggleViews() {

	$('#zoomedout').toggle();
	$('#zoomedin').toggle();
	$('#zoomInButton').toggle();
	$('#zoomOutButton').toggle();

	productdetailFetchImage();
}

function productdetailIsVolumePriceCorrect(volumePrice) {
	var result = true;
	for (var i = 0; i < volumePrice.length; ++i) {
		result = result && (g_pricelistSelectedProduct.ProductID == volumePrice[i].ProductID)
	}
	return result;
}

function productdetailsShowDiscOverwritePasswordPopup() {

    $('#discOverwritePassMessage').hide();
    $('#discOverwritePassInput').val('');
    $('#discOverwritePassPopup').popup('open');

    $('#discOverwritePassOKButton').unbind();
    $('#discOverwritePassOKButton').click(function() {

            var pass = $('#discOverwritePassInput').val();

            if (pass === DaoOptions.getValue('OverWriteMaxDiscPass')) {

                $('#discOverwritePassMessage').hide();
                localStorage.setItem('overwriteDiscountCheckedOK',true);
                productdetailOkClicked();
                $('#discOverwritePassPopup').popup('close');
            } else {
                $('#discOverwritePassMessage').show();
            }
    });
}


function productdetailsAdminCanAddPromo() {
    return g_isUserIntSalse() && DaoOptions.getValue('localTPM') === 'true';
}

function productdetailsApplyDiscounts(vp) {
    var promoExclAccountGroup = DaoOptions.getValue('PromoExclAccountGroup');
    if (!promoExclAccountGroup)
        return true;

    if (!vp)
        return true;

    var promoExclDicounts = DaoOptions.getValue('PromoExclDiscounts') ? DaoOptions.getValue('PromoExclDiscounts').split(',') : [];
    if ($.inArray(g_currentCompany().AccountGroup, promoExclAccountGroup.split(',')) >= 0 && $.inArray(vp.ID, promoExclDicounts) >= 0) {
        return false;
    } else
        return true;
}
