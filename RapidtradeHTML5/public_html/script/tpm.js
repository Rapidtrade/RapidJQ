var g_tpmLastValidQuantities = [];

function tpmOnPageShow() {	
    tpmRemovePromotions();
    tpmFetchPromotions();
}

function tpmOnPageInit() {	
    tpmBind();
}

function tpmBind() {
    $('#saveTPM').click(function() {
        tpmSave();
    });
}

function tpmRemovePromotions() {
    var dao = new Dao();
    dao.cursor('BasketInfo', undefined, undefined,
     function (basketInfo) {   	
         if (basketInfo.UserField01 == 'TPM')
        	 dao.deleteItem('BasketInfo', basketInfo.key);               
     });
}

function tpmFetchPromotions() {	
    $.getJSON('test/DWS Example 3 Output.json', tpmFetchPromotionsOnSuccess);	
}

function tpmFetchPromotionsOnSuccess(json) {	
    jsonform.getInstance().show('promotionsDiv', json, 'tpm','','view','table'  );
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
