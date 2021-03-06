var g_tpmLastValidQuantities = {};
var g_tpmjson = [];
var g_tpmOnSuccess = tpmQualifySuccess;

function tpmOnPageShow() {
    tpmRemovePromotions();
}

function tpmOnPageInit() {

    $('#addressForm input').parent('.ui-input-text').css('width', '50%');
    g_tpmLastValidQuantities = {};
    tpmBind();
}

function tpmBind() {
    $('#verifyTPM, #saveTPM').click(function() {

        var isOrder = ('saveTPM' === this.id);
        g_tpmjson = tpmBuildNewCart(isOrder);

        var postType = isOrder ? sessionStorage.getItem('currentordertype') : 'Verify|' + sessionStorage.getItem('currentordertype');
        var onSuccess = isOrder ? tpmOrderSuccess : tpmVerifySuccess;

        tpmPost(postType, onSuccess, isOrder);
    });

    $('#cancelbtn').click(function() {
        $.mobile.changePage("ShoppingCart.html");
    });

    $('#complexPopup #okButton').off().on('click', tpmSaveComplexPromotion);

    $('#choosebtn').click(function () {
    	orderHeaderChooseOnClick();
    });

    $('#emailChooseBtn').click(function () {
    	orderHeaderEmailChooseOnClick();
    });
}
/*
 * First remove any items added due to promotions to ensure we start a fresh
 * @returns {undefined}
 */
function tpmRemovePromotions() {
    var dao = new Dao();
    dao.index('BasketInfo', g_currentCompany().AccountID,'index1',
     function (basketInfo) {
         //delete items where userfield01 != null as they were added by TPM
         if (basketInfo.UserField01) {
             if (basketInfo.UserField01 !=='')
                 dao.deleteItem('BasketInfo', basketInfo.key);
         }
     },
     undefined,
     tpmFetchBasket);
}

/*
 * Now fetch basket again
 * @returns {undefined}
 */
function tpmFetchBasket() {
    orderHeaderCreateOrderObject();
    g_tpmjson = new Array();
    var dao = new Dao();
    dao.index('BasketInfo', g_currentCompany().AccountID,'index1',
        function (basketInfo) {
            if (basketInfo.UserField01 === 'TPM')
        	 dao.deleteItem('BasketInfo', basketInfo.key);
            else
                 g_tpmjson.push(basketInfo);
        },
        undefined,
        function(){
            tpmPost('Qualify|' + g_orderHeaderOrder.Type, tpmQualifySuccess);
        });
}

/*
 * Verifying / Ordering
 * @returns {undefined}
 */

function tpmPost(type, onSuccess, isOrder) {

    try {

        g_busy(true);
        g_tpmOnSuccess = onSuccess;

        if (isOrder) {

            if ($('#reference').val()) {

                g_orderHeaderOrder.Reference = $('#reference').val();
                g_orderHeaderOrder.Comments = $('#comment').val();

                g_orderHeaderOrder.Email = $('#email').val();
                g_orderHeaderOrder.DeliveryName = $('#name').val();
                for (var index = 1; index < 4; ++index)
                    g_orderHeaderOrder['DeliveryAddress' + index] = $('#address' + index).val();

                g_orderHeaderOrder.DeliveryPostCode = $('#postalCode').val();

            } else {

                g_busy(false);
                $('#infoPopup p').text(NO_REFERENCE_MESSAGE);
                g_popup('#infoPopup').show(2000);
                return;
            }
        }

        g_orderHeaderOrder.Type = type;
        g_orderHeaderOrder.orderItems = g_tpmjson;

        var orderHeaderInfo = {};
        orderHeaderInfo.Table = "Orders";
        orderHeaderInfo.Method = "Modify2";
        orderHeaderInfo.json = JSON.stringify(g_orderHeaderOrder);
        console.log(JSON.stringify(g_orderHeaderOrder));
        var url = DaoOptions.getValue('OrderLiveURL');
        if (!url) url = g_restUrl + 'post/post.aspx';
        console.log(orderHeaderInfo);
        g_ajaxpost(jQuery.param(orderHeaderInfo), url, onSuccess, tpmSaveError);

    } catch (error) {
        alert('You must be online...');
    }
}

/*
 * Received a qualified order, so show a jsontable
 * @returns {undefined}
 */
function tpmQualifySuccess() {

    var showTable = function(json) {

        g_busy(false);

        var message = json._getErrorMsg || json._getWarnMsg;
        var isError = (json._getStatus === false);

        if (message || isError) {

            var stopOrdering = isError && (json._getRslttype === 'Q1');

            if (stopOrdering) {

                $('#verifyTPM').addClass('ui-disabled');
            }

            $('#infoPopup p').text(message || 'Unknown error');
            g_popup('#infoPopup').show(2000, function() {

                if (json._getRslttype === 'Q2') {

                    sessionStorage.setItem('TPMError', 'Q2');
                    g_tpmjson = json._order.orderItems;
                    $.mobile.changePage('orderHeader.html');

                } else if (!stopOrdering) {

                    jsonform.getInstance().show('promotionsDiv',json._order.orderItems,'tpmtable','','list','table',tpmTableLoaded);
                }
            });

        } else {

            jsonform.getInstance().show('promotionsDiv',json._order.orderItems,'tpmtable','','list','table',tpmTableLoaded);
        }
    };

    var url = DaoOptions.getValue('LiveGetResultsURL');
    if (!url) url = g_restUrl + 'Orders/Exists';
    g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json',
                function (json) {

                    console.log(json);

                    var lineMessageField = DaoOptions.getValue('TPMLineMessage');

                    var messageHtml = '';

                    if (lineMessageField && json._order) {

                        for (var items = json._order.orderItems, i = 0; i < items.length; ++i) {

                            if (messageHtml)
                                messageHtml += '<br />';

                            messageHtml += items[i][lineMessageField] || '';
                        }
                    }

                    if (messageHtml) {

                        $('#infoPopup p').html(messageHtml);

                        g_busy(false);

                        g_popup('#infoPopup').show(2000, function() {

                            showTable(json);
                        });

                    } else {

                        showTable(json);
                    }
                });
}

/*
 * After a table is loaded, we need to:
 * 1. Hide the rows that have non-tpm lines (ie. userfield01=null) - complete
 * 2. Only show one of the complex promotion lines - Still to be done
 * @returns {undefined}
 */
function tpmTableLoaded(){

    //check promotions id
//    $("#jsontable tr").each(function() {
//
//        $td = $(this).find('td').first();
//        $td.text(tpmMapId($td.text()));
//    });

    //hide any rows that don't have a promotion
    $("#jsontable td").css("style","padding:15px;");
    $("#jsontable td:nth-child(1):contains('null')").parent().hide(); //hide rows where userfield1=null

    if ($('#jsontable tr:visible').length === 1) {

        $('#infoPopup p').text('No current TPMs found.');
        g_popup('#infoPopup').show(2000, function() {

        //    $.mobile.changePage('orderHeader.html');
        });
    }

    //Bind for when checkbox is changed
    $("#jsontable input:checkbox").unbind();
    $("#jsontable input:checkbox").change(function () {
        tpmSelected($(this));
    });

    tpmHideComplexRows();
    tpmSelectLinePromotions();
    if ($('#verifyTPM').hasClass('ui-disabled'))
        $('#verifyTPM').removeClass('ui-disabled');
}

/*
 * This function selects/deselects tpm's by marking them in jsonform.getInstance().jsonArray
 * For complex, if selected, then we need to show popup to allow them to choose which bottles.
 * Also, if a promotion in a set is chosen, then we need to choose all promotions in that set.
 * @param {type} checkbox
 * @returns {undefined}
 */
function tpmSelected(checkbox){
    var idx = checkbox.parent().parent().parent()[0].rowIndex;
    var item = jsonform.getInstance().jsonArray[idx-1];

    if (item.UserField01 === 'Complex') {
        tpmShowComplexPopup();
    } else {
        if (!item.selected)
            item.selected = true; //since never selected it yet, make it selected now
        else
            item.selected = !item.selected;  //else toggle selection //checkbox.val()==='on' ? true:false ;

        var setID = $.trim(item.UserField05);

        if (setID === ''){

            //select all promotions in the set

            $setRows = $('#jsontable td:nth-child(5):contains("' + setID + '")').find('#Selected');
            $setRows.prop('checked', item.selected)/*.checkboxradio('refresh')*/;

            // update data
            $setRows.each(function() {

                $(this).trigger('change');
            });
        }
    }
}

function tpmSelectLinePromotions() {

    var $lineRows = $("#jsontable td:nth-child(6):contains('Line')").parent();
    $lineRows.each(function() {

        $(this).find('#Selected').prop('checked', true).prop('disabled', true);
        var promotionId = $(this).find('td:first').text();

        //select the line item in jsonArray
        jsonform.getInstance().jsonArray.filter(function(item) {return item.UserField02 === promotionId;})[0].selected = true;
    });
}

function tpmHideComplexRows() {

    var complexRowGroups = {};

    var $complexRows = $("#jsontable td:nth-child(6):contains('Complex')").parent();

    $complexRows.each(function() {

        var promotionId = $(this).find('td:first').text();

        if (!complexRowGroups[promotionId])
            complexRowGroups[promotionId] = [];

        complexRowGroups[promotionId].push($(this));
    });

    $.each(complexRowGroups, function(promotionId, rows) {

        /*$(rows[0]).siblings().hide();*/ for (i = 1; i < rows.length; ++i) rows[i].hide();

        $(rows[0]).find('#Selected').off().on('change', function() {

            if ($(this).prop('checked'))
                tpmShowComplexPopup($(this).closest('tr').find('td:first').text());
            else
                // deselect all complex promotion items
                $.each(jsonform.getInstance().jsonArray, function(index, item) {

                    if (item.UserField02 === promotionId) {
                        item.selected = false;
                        item.Quantity = 0;
                    }
                });
        });
    });
}

function tpmShowComplexPopup(promotionId) {

    $('#complexPromotionDiv').empty();

    var complexPromotions = [];

    $.each(jsonform.getInstance().jsonArray, function(index, item) {

        if (item.UserField02 === promotionId)
            complexPromotions.push(item);
    });

    var mappedPromotionId = tpmMapId(promotionId);

    g_append('#complexPromotionDiv', '<div id="' + mappedPromotionId + 'Div" style="margin-bottom:10px" class="promotion"><h3>' + promotionId + '</h3></div>');
    g_append('#' + mappedPromotionId + 'Div', '<form id="' + mappedPromotionId + 'Form"></form>');
    g_append('#' + mappedPromotionId + 'Div', '<table id="' + mappedPromotionId + 'Table" class="tpmTable"><thead><tr><th>Product ID</th><th>Description</th><th>UOM</th><th>Quantity</th></tr></thead><tbody></tbody></table>');

    for ( var i = 0; i < complexPromotions.length; i++) {

        var productId = $.trim(complexPromotions[i].ProductID);
        var quantity = complexPromotions[i].Quantity || 0;

        g_append('#' + mappedPromotionId + 'Table tbody', '<tr class="promotion" id="' + mappedPromotionId + productId + 'TR"><td class="productId">' + productId +
                        '</td><td class="description">' + complexPromotions[i].Description + '</td><td class="uom">' + complexPromotions[i].UserField04 +
                        '</td><td class="quantity"><input class="' + mappedPromotionId + 'Quantity" id="' + mappedPromotionId + productId +
                        'Quantity" type="number" min="0" value="' + quantity + '" step="' + complexPromotions[i].UserField04 + '" onchange="tpmOnQuantityChange(\'' +
                        promotionId +  '\',\'' + productId + '\')"/></td></tr>');

        g_tpmLastValidQuantities[promotionId + '|' + productId] = quantity;
    }

    g_append('#' + mappedPromotionId + 'Table tbody', '<tr class="total"><td colspan="3" style="text-align:right;">Promotion Total:</td><td id="' + mappedPromotionId + 'Total">0</td></tr>');
    g_append('#' + mappedPromotionId + 'Form', '<table class="tpmHeaderTable"></table>');
    g_append('#' + mappedPromotionId + 'Form table', '<tr><td>TPM Code</td><td><input id="UserField02" value="' + promotionId + '" disabled/>');
    g_append('#' + mappedPromotionId + 'Form table', '<tr><td>MAX Free Stock</td><td><input id="UserField03" value="' + complexPromotions[0].UserField03 + '" disabled/>');

    tpmCalculateTotalQuantity(promotionId);

    $('#complexPromotionDiv.tpmTable').css({
            'border-collapse': 'collapse',
            'margin': '20px 0'
    });

    $('#complexPromotionDiv input').css({
            'height': '20px',
            'font-size': '15px'
    });

    $('#complexPromotionDiv.tpmTable th, #complexPromotionDiv.tpmTable td').css({
            'border': '1px solid black',
            'padding': '5px',
            'line-height': '25px'
    });

    $('#complexPromotionDiv.tpmTable tr.total td').css({
            'border': 'none',
            'padding': '10px'
    });

    $('#complexPromotionDiv.tpmHeaderTable td').css({
            'border': 'none',
            'padding': '0 10px 0 0'
    });

    $('#complexPopup').popup('open');
}

function tpmSaveError(error) {
    if ((error.status === 0) || (error.status === 200)) {
        g_tpmOnSuccess();
    } else {
        alert('You must be online...');
    }
}

function tpmBuildNewCart(isOrder) {

    //create a new cart with original products & selected TPM's
    var oldcart = jsonform.getInstance().jsonArray;
    var newcart = new Array();
    var itemidx = 0;
    for (var i=0; i < oldcart.length; i++){
        row = oldcart[i];
        row.AccountID = g_currentCompany().AccountID;

        //if a tpm line, the make sure its selected
        if (!row.UserField01) {
            row.ItemID = itemidx;
            newcart.push(row);
            itemidx++;
        } else if (row.UserField01 !== '') {

            if (!isOrder) {

                if (!row.Userfield08 && row.selected !== undefined) {
                    row.Userfield08 = row.selected ? 'Y' : 'N';
                } else if (row.selected == undefined) {
                    // If the row.selected is undefined - set userfield08 to 'N'
                    row.Userfield08 = 'N';
                }
            }


//            if (row.selected) {
                if (row.Userfield07)
                    row.Discount = parseFloat(row.Userfield06);
                row.ItemID = itemidx;
                newcart.push(row);
                itemidx++;
//            }
        } else {
            row.ItemID = itemidx;
            newcart.push(row);
            itemidx++;
        }
    }
    return newcart;
}

/*
 * Received a qualified order, so show a jsontable
 * @returns {undefined}
 */
function tpmVerifySuccess() {

    var showTable = function(json) {

        for (var i = 0; i < json._order.orderItems.length; ++i) {

            if ((json._order.orderItems[i].Userfield08 !== 'Y') && (!json._order.orderItems[i].Userfield10)) {

                json._order.orderItems[i].hidden = true;
            }
        }

        jsonform.getInstance().show('promotionsDiv',json._order.orderItems,'tpmverified','','list','table',tpmVerifyTableLoaded);
    };

    g_busy(false);


    $('#promotionsDiv').empty();
    var url = DaoOptions.getValue('LiveGetResultsURL');
    if (!url) url = g_restUrl + 'Orders/Exists';

    g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json',
        function (json) {
            if (!json._getStatus) {

                $('#infoPopup p').text(json._getErrorMsg || 'Unknown error');
                $('#infoPopup').popup('open');
                setTimeout(function() {
                    tpmFetchBasket();
                    $('#infoPopup').popup('close');
                    //showTable(json);
                //    $.mobile.changePage('orderHeader.html');

                }, 3000);

            } else {
                $('#verifyTPM').addClass('invisible');
                $('#saveDiv').removeClass('invisible');
                showTable(json);
            }
        },
        undefined);
}

function tpmOrderSuccess() {
  jsonform.getInstance().jsonArray = new Array();
    orderHeaderOnLineSaveSuccess();
//    g_busy(false);
//
//    var dao = new Dao();
//    dao.clearBasket('BasketInfo', g_currentCompany().AccountID, sessionStorage.getItem('currentordertype'),
//
//    function(){
//         alert('Error clearing basket');
//     },
//    function() {
//
//        $('#infoPopup p').text('Order sent OK.');
//        $('#infoPopup').popup('open');
//        setTimeout(function() {
//
//            $('#infoPopup').popup('close');
//            sessionStorage.setItem('lastPanelId', 'activityPanel');
//            $.mobile.changePage('company.html');
//        }, 2000);
//    }
//    );
}

function tpmVerifyTableLoaded(){
    $('#heading').text('Verified Promotions');
    $("#jsontable td:nth-child(1):contains('null')").parent().hide(); //hide rows where userfield1=null
    /*
    var okitems = $("#jsontable td:nth-child(8):empty").length;
    var numitems = $("#jsontable tr").length;
    if (okitems !== numitems) {
        $('#verifyTPM').addClass('invisible');
        $('#saveTPM').addClass('invisible');
        $('#issue').removeClass('invisible');
        $('#issue').text('You have errors, so cannot proceed. Please check the errors and start again');
    }
    */

    $("#jsontable td:nth-child(8):empty").text('OK'); //Mark items that dont have an issue as OK

    var ok = ($("#jsontable tr:visible").length - 1 === $("#jsontable td:nth-child(8)").filter(function() {return $(this).text() === 'OK';}).length);

    if (!ok) {

        $('#reference, #saveTPM').addClass('ui-disabled');
        return;
    }

    $okRows = $('#jsontable td:visible:last-child:empty').parent();
    if ($okRows.length === $('#jsontable tr:visible').length - 1)
        $('#verifyTPM .ui-btn-text').text('Create');

    //$okRows.find('#Selected').prop('checked', true)/*.checkboxradio('refresh')*/;
    $okRows.find('#jsontable:checkbox').prop('checked', true)/*.checkboxradio('refresh')*/;
    $okRows.find('#Selected').each(function() {
        $(this).trigger('change');
    });

    //hide promotion items with 0 'Free Stock'
    $("#jsontable td:nth-child(7)").filter(function() {return $(this).text() === '0';}).parent().hide();
}

function tpmMapId(id) {

    var map = {

        "+" : "plus",
        " " : "",
        "." : "dot",
        "/" : "slash",
        "," : "comma",
        "=" : "eq",
        "<" : "lt",
        ">" : "gt",
        "~" : "tilde"
    };

     return id.replace(/(\+| |\.|,|\/|=|\<|\>|~)/g, function(chr) { return map[chr]; });
}

function tpmFetchPromotionsOnSuccess(json) {
    var sets = [];
    var promotions = [];

    var showPromotionGroup = function(parentId, promotionGroup, inSet) {

        if (inSet) $('#' + parentId).empty();
        var promotionId = tpmMapId(promotionGroup[0].UserField02);
        g_append('#' + parentId, '<div id="' + promotionId + 'Div" style="margin-bottom:10px" class="promotion"><h3>' + promotionId + '</h3></div>');
        g_append('#' + promotionId + 'Div', '<form id="' + promotionId + 'Form"></form>');
        g_append('#' + promotionId + 'Div', '<table id="' + promotionId + 'Table" class="tpmTable"><thead><tr><th>Product ID</th><th>Description</th><th>UOM</th><th>Quantity</th></tr></thead><tbody></tbody></table>');

        for ( var i = 0; i < promotionGroup.length; i++) {
            var productId = $.trim(promotionGroup[i].ProductID);
            g_append('#' + promotionId + 'Table tbody', '<tr class="promotion" id="' + promotionId + productId + 'TR"><td class="productId">' + productId +
                            '</td><td class="description">' + promotionGroup[i].Description + '</td><td class="uom">' + promotionGroup[i].UserField04 +
                            '</td><td class="quantity"><input class="' + promotionId + 'Quantity" id="' + promotionId + productId +
                            'Quantity" type="number" min="0" value="0" step="' + promotionGroup[i].UserField04 + '" onchange="tpmOnQuantityChange(\'' +
                            promotionId +  '\',\'' + productId + '\')"/></td></tr>');

            g_tpmLastValidQuantities[promotionId + '|' + productId] = '0';
        }

        g_append('#' + promotionId + 'Table tbody', '<tr class="total"><td colspan="3" style="text-align:right;">Promotion Total:</td><td id="' + promotionId + 'Total">0</td></tr>');
        g_append('#' + promotionId + 'Form', '<table class="tpmHeaderTable"></table>');
        g_append('#' + promotionId + 'Form table', '<tr><td>TPM Code</td><td><input id="UserField02" value="' + promotionId + '" />');
        g_append('#' + promotionId + 'Form table', '<tr><td>MAX Free Stock</td><td><input id="UserField03" value="' + promotionGroup[0].UserField03 + '" />');
    }
}

function tpmOnQuantityChange(promotionId, productId) {

    var mappedPromotionId = tpmMapId(promotionId);

    if (!$('#' + mappedPromotionId + productId + 'Quantity').val())
        $('#' + mappedPromotionId + productId + 'Quantity').val(0);

    if (tpmCalculateTotalQuantity(promotionId) > parseInt($('#' + mappedPromotionId + 'Form #UserField03').val(), 10)) {
            g_alert('Cannot order more than ' + $('#' + mappedPromotionId + 'Form #UserField03').val() + ' for ' + promotionId);
            $('#' + mappedPromotionId + productId + 'Quantity').val(g_tpmLastValidQuantities[promotionId + '|' + productId]);
            tpmOnQuantityChange(promotionId, productId);
            return;
    }

    g_tpmLastValidQuantities[promotionId + '|' + productId] = $('#' + mappedPromotionId + productId + 'Quantity').val();
}

function tpmCalculateTotalQuantity(promotionId) {

    	var totalQuantity = 0;
	$('.' + tpmMapId(promotionId) + 'Quantity').each(function() {
		totalQuantity += parseInt($(this).val(), 10);
	});
	$('#' + tpmMapId(promotionId) + 'Total').text(totalQuantity);

        return totalQuantity;
}

function tpmSaveComplexPromotion() {

    if (tpmIsUOMValid()) {

        var isAnyItemSelected = false;

        for (var key in g_tpmLastValidQuantities) {

            var promotionId = key.split('|')[0];
            var productId = key.split('|')[1];

            $.each(jsonform.getInstance().jsonArray, function(index, item) {

                if ((item.UserField02 === promotionId) && ($.trim(item.ProductID) === productId)) {

                    item.Quantity = g_tpmLastValidQuantities[key];
                    item.selected = (item.Quantity > 0);
                    // added by Phil's request
                    item.Userfield08 = 'Y';

                    isAnyItemSelected = isAnyItemSelected || item.selected;
                }
            });
        }

        $('#complexPopup').popup('close');
        //$('#jsontable td:visible:nth-child(1):contains("' + promotionId + '")').parent().find('#Selected').prop('checked', isAnyItemSelected)/*.checkboxradio('refresh')*/;
    }
}

function tpmIsUOMValid() {

	var isValid = true;

	$('#complexPromotionDiv .tpmTable').each(function() {

		$(this).find('tr.promotion').each(function() {

			var uom = parseInt($(this).find('td.uom').text(), 10);
			var quantity = parseInt($(this).find('td.quantity input').val(), 10);

			if (quantity % uom > 0) {

                            isValid = confirm('The UOM for the product ' + $(this).find('td.productId').text() + ' is ' + uom + '. Are you sure you want to order ' + quantity + '?');
                            //break the each loop
                            return false;

//				isValid = false;
//				g_alert('Please enter a valid quantity for the ' + $(this).find('td.productId').text() + ' product.');
//				$(this).find('td.quantity input').focus();
//
//				return false;
			}
		});

		if (!isValid)
                    return false;
	});

	return isValid;
}
