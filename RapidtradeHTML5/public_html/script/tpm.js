var g_tpmLastValidQuantities = [];
var g_tpmjson = [];
function tpmOnPageShow() {	
    tpmRemovePromotions();
}

function tpmOnPageInit() {	
    tpmBind();
}

function tpmBind() {
    $('#verifyTPM').click(function() {
        tpmVerify();
    });
    $('#cancelbtn').click(function() {
        $.mobile.changePage("ShoppingCart.html");
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
            tpmPost('qualify',tpmQualifySuccess);
        });    	
}

function tpmPost(type, onSuccess) {
    try {    
        g_orderHeaderOrder.Type = type;
        g_orderHeaderOrder.orderItems = g_tpmjson;

        var orderHeaderInfo = {};  	
        orderHeaderInfo.Table = "Orders";
        orderHeaderInfo.Method = "Modify2";
        orderHeaderInfo.json = JSON.stringify(g_orderHeaderOrder);   
        console.log(JSON.stringify(g_orderHeaderOrder));
        var url = DaoOptions.getValue('OrderLiveURL');
        if (!url) url = g_restUrl + 'post/post.aspx';

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
    var url = DaoOptions.getValue('LiveGetResultsURL');
    if (!url) url = g_restUrl + 'Orders/Exists';	
    g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json', 
                function (json) {
                    jsonform.getInstance().show('promotionsDiv',json._order.orderItems,'tpmtable','','list','table',tpmTableLoaded);
                }, 
                undefined);	
}

/*
 * After a table is loaded
 * @returns {undefined}
 */
function tpmTableLoaded(){
    //hide any rows that dont have a promotion
    $("#jsontable td").css("style","padding:15px;");
    $("#jsontable td:nth-child(1):contains('null')").parent().hide(); //hide rows where userfield1=null
    //TODO - deal with complex
    var complextr = $("#jsontable td:nth-child(6):contains('Complex')").parent(); 
    
    //Bind for when checkbox is changed
    $("#jsontable input:checkbox").change(function () {
        //var val = $(this).parent().parent().parent().children()[0];
        //Set the json to be selected
        var idx = $(this).parent().parent().parent()[0].rowIndex;
        jsonform.getInstance().jsonArray[idx-1].selected = $(this).val()==='on' ? true:false ;
    });
    
}

function tpmSaveError(error) {	
    if ((error.status === 0) || (error.status === 200)) {		
        tpmQualifySuccess();
    } else {
        alert('You must be online...');
    }
}

/*
 * We need to verify the promotions they selected
 * @returns {undefined}
 */
function tpmVerify(){
    //create a new cart with original products & selected TPM's
    var oldcart = jsonform.getInstance().jsonArray;
    var newcart = new Array();
    for (var i=0; i < oldcart.length; i++){
        row = oldcart[i];
        //if a tpm line, the make sure its selected
		if (!row.UserField01) {
			newcart.push(row);
        } else if (row.UserField01 !== '') {
            if (row.selected) {
				if (row.Userfield07)
					row.Discount = parseFloat(row.Userfield06); 
				newcart.push(row);
            }	
        } else {
            newcart.push(row);
        }
    }
    g_tpmjson = newcart;
    tpmPost('verify', tpmVerifySuccess);
    
}

/*
 * Received a qualified order, so show a jsontable
 * @returns {undefined}
 */
function tpmVerifySuccess() {	
    $('verifyTPM').addClass('invisible');
    $('saveTPM').removeClass('invisible');
    var url = DaoOptions.getValue('LiveGetResultsURL');
    if (!url) url = g_restUrl + 'Orders/Exists';	
    g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json', 
                function (json) {
                    if (!json._getStatus)
                        alert (json._getErrorMsg);
                    
                    
                    	jsonform.getInstance().show('promotionsDiv',json._order.orderItems,'tpmtable','','list','table',tpmVerifyTableLoaded);
                }, 
                undefined);	
}

function tpmVerifyTableLoaded(){
    
}

function tpmExists(json){
    
}



/*
function tpmFetchPromotionsOnSuccess(json) {	
    var sets = [];
    var promotions = [];

    var showPromotionGroup = function(parentId, promotionGroup, inSet) {

        if (inSet) $('#' + parentId).empty();
        var promotionId = promotionGroup[0].UserField02;
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

        $('.tpmTable').css({
                'border-collapse': 'collapse',
                'margin': '20px 0'
        }); 

        $('#promotionsDiv input').css({
                'height': '20px',
                'font-size': '15px'
        }); 

        $('.tpmTable th, td').css({
                'border': '1px solid black',
                'padding': '5px',
                'line-height': '25px'
        });

        $('.tpmTable tr.total td').css({
                'border': 'none',
                'padding': '10px'
        });

        $('.tpmHeaderTable td').css({
                'border': 'none',
                'padding': '0 10px 0 0'
        });
    };
	
    $.each(json.orderItems, function(index, orderItem) {	    	
    	if ($.trim(orderItem.UserField05)) {
            if (!sets[orderItem.UserField05])    			
                    sets[orderItem.UserField05] = {};

            if (!sets[orderItem.UserField05][orderItem.UserField02])
                    sets[orderItem.UserField05][orderItem.UserField02] = [];

            sets[orderItem.UserField05][orderItem.UserField02].push(orderItem);    		
    	} else {   	
            if (orderItem.UserField02) {
                if (!promotions[orderItem.UserField02])
                        promotions[orderItem.UserField02] = [];
                promotions[orderItem.UserField02].push(orderItem);
	    }
    	}
    });
    
    console.log(sets);
    var i = 0;
    for (var set in sets) {
    	g_append('#promotionsDiv', '<div id="set' + ++i + 'Div"></div>');
        var selectMenuHtml = '<div data-role="fieldcontain">' +
								 '<label for="set' + i + 'Select">Choose from ' + set + '</label>' +
								 '<select id="set' + i + 'Select">';
        
        for (var promotionId in sets[set])        	
        	selectMenuHtml += '<option value="' + promotionId + '">' + promotionId + '</option>';
        
        selectMenuHtml += '</select></div>';
    	g_append('#set' + i + 'Div', selectMenuHtml);
    	g_append('#set' + i + 'Div', '<div id="set' + i + 'PromotionsDiv"></div>');
    	$('#set' + i + 'Select').change(function() {
    		showPromotionGroup('set' + i + 'PromotionsDiv', sets[set][$(this).val()], true);
    	});
    	$('#set' + i + 'Select').trigger('change');
    }

    for ( var key in promotions)
		showPromotionGroup('promotionsDiv', promotions[key], false);
}
*/
function tpmOnQuantityChange(promotionId, productId) {
	var totalQuantity = 0;
	$('.' + promotionId + 'Quantity').each(function() {
		totalQuantity += parseInt($(this).val(), 10); 
	});
	$('#' + promotionId + 'Total').text(totalQuantity);
	if (totalQuantity > parseInt($('#' + promotionId + 'Form #UserField03').val(), 10)) {
		g_alert('Cannot order more than ' + $('#' + promotionId + 'Form #UserField03').val() + ' for ' + promotionId);
		$('#' + promotionId + productId + 'Quantity').val(g_tpmLastValidQuantities[promotionId + '|' + productId]);
		tpmOnQuantityChange(promotionId, productId);
		return;
	}
	
	g_tpmLastValidQuantities[promotionId + '|' + productId] = $('#' + promotionId + productId + 'Quantity').val();
}

function tpmSave() {
	
	if (tpmIsUOMValid()) {
		
		for ( var key in g_tpmLastValidQuantities) {
			
			if (g_tpmLastValidQuantities[key] > 0) {
			
				var promotionId = key.split('|')[0];
				var productId = key.split('|')[1];
			
				g_addProductToBasket(
						productId, 
						g_currentUser().SupplierID, 
						g_currentCompany().AccountID, 
						g_tpmLastValidQuantities[key], 
						g_currentUser().UserID, 
						0, 
						$('#' + promotionId + productId + 'TR td.description').text(), 
						0, 
						0, 
						sessionStorage.getItem("currentordertype"), 
						'TPM', //TODO: see what to put in UserField01 
						undefined, 
						undefined, 
						$('#' + promotionId + productId + 'TR td.uom').text(), //TODO: do we need this information repeated? // UOM
						promotionId, 
						undefined, // TODO: set Warehouse 
						0, // TODO: set VAT 
						$('#' + promotionId + 'Form #UserField03').val(), 
						$('#' + promotionId + productId + 'TR td.uom').text()); //TODO: do we need this information repeated? // UserField04
			}	
		}
		
		$.mobile.changePage('shoppingCart.html');
	}
}

function tpmIsUOMValid() {
	
	var isValid = true;
	
	$('.tpmTable').each(function() {
		
		$(this).find('tr.promotion').each(function() {
			
			var uom = parseInt($(this).find('td.uom').text(), 10);
			var quantity = parseInt($(this).find('td.quantity input').val(), 10);
			
			if (quantity % uom > 0) {
				
				isValid = false;
				g_alert('Please enter a valid quantity for the ' + $(this).find('td.productId').text() + ' product.');
				$(this).find('td.quantity input').focus();
				
				return false;
			}			
		});
		
		if (!isValid)
			return false;
	});
	
	return isValid;
}
