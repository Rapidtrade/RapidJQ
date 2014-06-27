var g_orderHeaderOrder = {};
var g_orderHeaderOrderItems = {};
var g_orderHeaderSignature = false;
var g_orderHeaderNextSavingStep = undefined;
var g_selectedEmail = '';
var g_orderHeaderInvalidItemKeys = [];
var g_orderHeaderValidItems = [];

var g_orderHeaderJsonForm = undefined;

/**description
 * Always call openDB, which in turn call's init
 * This is called from script tag inside page
 */
function orderHeaderOnPageShow() {
	
    var dao = new Dao();
    dao.openDB(function () {
        orderHeaderInit();
    });
    
    orderHeaderBind();
}

function orderHeaderBind() {

    $('#orderHeaderBackPage').click(function() {		
            var page = sessionStorage.getItem('OrderHeaderReturnPage');
            $.mobile.changePage(page ? page : 'shoppingCart.html');
    });
	
    $('#choosebtn').click(function () {
    	orderHeaderChooseOnClick();
    });
    
    $('#emailChooseBtn').click(function () {
    	orderHeaderEmailChooseOnClick();
    });

    $('#saveorder').click(function () {    
        orderHeaderSaveOrder();
    });

    $('#signatureButton').click(function () {
    	
        g_orderHeaderSignature = true;
        $('#signatureFrame').removeClass('hidden');
        $('#signatureButton').hide();
        $('#address').hide();
        $('#addressForm').hide();
        $('#orderdetailform').hide();
        $('#orderDetails').hide();
    });
    
    $('#confirmButton').unbind();
    $('#confirmButton').click(function() {
    	
    	for (var i = 0; i < g_orderHeaderInvalidItemKeys.length; ++i)
    		shoppingCartDeleteItem(g_orderHeaderInvalidItemKeys[i], DaoOptions.getValue('LostSaleActivityID') != undefined);
    	
    	g_orderHeaderOrder.orderItems = g_orderHeaderValidItems;
    	g_orderHeaderOrder.Status = 'Validated';
    	
    	orderHeaderCaptureGPSAndSave();
    });
}

function orderHeaderChooseOnClick(){

    $('#fieldset').empty();
    g_append('#fieldset', '<legend>Choose address:</legend><br>');
    //$('#fieldset').append('<legend>Choose address:</legend><br>');
    var dao = new Dao();
    dao.cursor('Address',undefined,undefined, 
        function(address)
        {
            if(address.SupplierID == g_currentUser().SupplierID &&  address.AccountID == g_currentCompany().AccountID)
            {
                g_append('#fieldset', '<input type="radio" onclick ="orderHeaderSelectAddress(\'' + address.AddressID + '\')" name="radio-choice-1" /><label for="radio-choice-1">' + address.AddressID + '</label><br>');
                //$('#fieldset').append('<input type="radio" onclick ="orderHeaderSelectAddress(\'' + address.AddressID+ '\')" name="radio-choice-1" /><label for="radio-choice-1">' + address.AddressID + '</label><br>');
            }
	         

        },undefined, undefined);

}

function orderHeaderEmailChooseOnClick() {
	
    $('#emailfieldset').empty();
    g_append('#emailfieldset', '<legend>Choose a contact:</legend><br>');
    
    var dao = new Dao();
    dao.cursor('Contacts', undefined, undefined, 
        function(contact)
        {
            if (contact.SupplierID == g_currentUser().SupplierID && contact.AccountID == g_currentCompany().AccountID && contact.Email) {
                g_append('#emailfieldset', '<input id="' + contact.Counter + '" type="radio" onclick ="orderHeaderSelectEmail(\'' + contact.Email + '\')" name="radio-choice-2" /><label for="radio-choice-2">' + contact.Name + ' / ' + contact.Email + '</label><br>');
            }
        },undefined, 		   
        function (event) {  
//	    	$('#emailfieldset').controlgroup("refresh");
	    }); 
}

function orderHeaderSelectAddress(addressID) {

    $('#popupAddressChoose').popup("close");
 
    var dao = new Dao();
    var key = g_currentUser().SupplierID +g_currentCompany().AccountID+addressID;
    dao.get('Address',key, function(selectedaddress)
    {
   
        if (selectedaddress.Unit != null) {
            $('#name').attr('value', selectedaddress.Unit);
        }
        if (selectedaddress.Street != "" && selectedaddress.Street != null) {
            $('#address1').attr('value', selectedaddress.Street);
        }
	
        var address2 = '';
        if (selectedaddress.City == "" && selectedaddress.Region != "") {
            address2 = selectedaddress.Region;
        } else if (selectedaddress.City != "" && selectedaddress.Region != "") {
            address2 = selectedaddress.City + ", " + selectedaddress.Region;
	
        } else if (selectedaddress.City != "" && selectedaddress.Region == "") {
            address2 = selectedaddress.City ;
        }
        $('#address2').attr('value', address2);
	
        if (selectedaddress.Country != "" && selectedaddress.Country != null) {
            $('#address3').attr('value', selectedaddress.Country);
        }
        if (selectedaddress.PostalCode != "" && selectedaddress.PostalCode != null) {
            $('#postalCode').attr('value', selectedaddress.PostalCode);
        }
    },
    undefined,undefined);
}

function orderHeaderSelectEmail(email) {
    window.location = '#page1';   
	$('#email').val(email);
	g_selectedEmail  = email;
}

function orderHeaderInit() {
    var orderDetails = new Object();
    orderDetails.Reference = "";
    orderDetails.Comments = "";
    sessionStorage.setItem("currentordertype",sessionStorage.getItem("currentordertype").trim());
    
    if (g_vanSales  && sessionStorage.getItem("currentordertype") == "repl") {
         $('#orderLabel').html('Replenishment Details');
    } else if (sessionStorage.getItem('currentordertype').indexOf('Invoice') != -1) {
    	$('#orderLabel').html('Invoice Details');
    } else if (DaoOptions.getValue('DeliveryOrderType') || (g_vanSales && sessionStorage.getItem("currentordertype") == "grv")) {
        $('#orderLabel').html((DaoOptions.getValue('DeliveryOrderType') ? 'Delivery' : 'GRV') +  ' Details');
    } else if (sessionStorage.getItem("currentordertype") == "stock") {
        $('#orderLabel').html('Stocktake Details');
    } else {
    	$('#orderLabel').html(sessionStorage.getItem('currentordertype').toUpperCase() + ' Details');
    }
    
    if (DaoOptions.getValue('HideAddressInfo') != 'true') {
    	
        $('#address, #addressForm').removeClass('invisible');   	
    }
    
    g_orderHeaderJsonForm = new JsonForm();
    
    var orderType = sessionStorage.getItem("currentordertype");
    
    var id = '';
    
    if (orderType.indexOf('Invoice') != -1)
    	id = 'InvoiceHeader';
    else
    	id =  (DaoOptions.getValue('DeliveryOrderType') ? 'POD' : sessionStorage.getItem("currentordertype")) + 'Header'; //OrderHeader
    
    g_orderHeaderJsonForm.show(g_currentUser().SupplierID, '#orderdetailform', orderDetails, id);    
    orderHeaderCreateOrderObject();
    orderHeaderCreateLineItems();
}

function orderHeaderSaveOrder() {
	
	if (!g_orderHeaderJsonForm.isValid())
		return;
	
        $('#infoPopup p').text('Please wait, processing order');
        
	$('#infoPopup').popup('open');
	
	if (!g_orderHeaderOrderItems.length) {	
		g_alert('There is a problem with your order, go back to the shopping cart now and try again. Please contact Rapidtrade support on 011 493 9755 if this continues.');
		$.mobile.changePage('shoppingCart.html');
		return;
	}
	
	g_markCustomerAsVisited(g_currentCompany().AccountID);	
	if (sessionStorage.getItem("currentordertype").indexOf('Invoice') != -1)
		g_orderheaderOrderType = 'Invoice';
	else
		g_orderheaderOrderType = sessionStorage.getItem("currentordertype");
	
	if (DaoOptions.getValue('DeliveryOrderType') && g_orderheaderOrderType != 'Invoice')
		g_orderHeaderOrder.Type = 'POD';
	else
		g_orderHeaderOrder.Type = ((g_orderheaderOrderType == "repl") || (g_orderheaderOrderType == "grv")) ? g_orderheaderOrderType.toUpperCase() : g_orderheaderOrderType;      
	
	g_orderheaderCallReduceStock = false;

    try {	
        if (g_orderHeaderSignature) orderHeaderSaveSignature();
        var id = 'json';        
        if (g_orderHeaderOrder.Type.indexOf('Invoice') != -1)
        	id += 'InvoiceHeader';
        else
        	id +=  (DaoOptions.getValue('DeliveryOrderType') ? 'POD' : sessionStorage.getItem("currentordertype")) + 'Header'; //OrderHeader
        
        var orderHeader = JSON.parse(sessionStorage.getItem(id));  
        for (var property in orderHeader)
            if (orderHeader.hasOwnProperty(property))
            		g_orderHeaderOrder[property] = orderHeader[property];
        
        g_orderHeaderOrder.Email = $('#email').val();
        g_orderHeaderOrder.DeliveryName = $('#name').val();
        for (var index = 1; index < 4; ++index)
            g_orderHeaderOrder['DeliveryAddress' + index] = $('#address' + index).val();
        
        g_orderHeaderOrder.DeliveryPostCode = $('#postalCode').val();      
        g_orderHeaderOrder.orderItems = g_orderHeaderOrderItems;
        
        if (g_orderHeaderOrder.Reference.length==0){      	
        	g_alert('You must enter a reference before you can continue');
        	$('#infoPopup').popup('close');
        	return;	
        }
        
        //for GRV, store the replenishment number in comments field
        //if ((g_orderheaderOrderType == "grv") && !DaoOptions.getValue('DeliveryOrderType')) 
        //	g_orderHeaderOrder.Comments = g_grv_replorderid;
        if (sessionStorage.getItem('referenceDocID')) {
            if (g_orderheaderOrderType == "grv") {
                    //for GRV and links back to the repl number
                    g_orderHeaderOrder.Comments = sessionStorage.getItem('referenceDocID');
                    g_orderHeaderOrder.Userfield06 = sessionStorage.getItem('referenceDocID');
            } else {
                    //for credits, this links the credit back to its invoice
                    g_orderHeaderOrder.Userfield06 = sessionStorage.getItem('referenceDocID');
            }
            g_orderHeaderOrder.referenceDocID = sessionStorage.getItem('referenceDocID'); //TODO for future - must include this field in order
            sessionStorage.removeItem('referenceDocID');
        }
        
        if (g_isiPad())
            g_orderHeaderOrder.UserField10 = 'IPAD';
        
        // next step
       
        //g_orderHeaderNextSavingStep = orderHeaderSaveOrderStep2;     
        
        //if (g_vanSales)
        //	g_orderHeaderNextSavingStep();
        //else
        orderHeaderVanSales();
        orderHeaderCaptureGPSAndSave();
        
    } catch (error) {	

        orderHeaderShowError(error);
    }
}

function orderHeaderCaptureGPSAndSave() {
    
    if (g_phonegap && navigator.geolocation)
        navigator.geolocation.getCurrentPosition(orderHeaderSaveFormedOrder, orderHeaderSaveFormedOrder, {timeout:10000});
    else
        orderHeaderSaveFormedOrder();
}

function orderHeaderShowError(error) {
	g_alert('There is a problem with your order, go back to the shopping cart now and try again. Please contact Rapidtrade support on 011 493 9755 if this continues.'  + error.message);
	$.mobile.changePage('shoppingCart.html');
}

function orderHeaderOnStraightSaveError(error) {
	
    if (error.status != 200 && error.status != 0)
    	orderHeaderShowError(error);
    else
    	orderHeaderOnStraightSaveSuccess();
}

function orderHeaderRemoveFromCart() {
	
    try {
    	
        g_clearCacheDependantOnBasket();
//      localStorage.setItem('currentReplenishment', g_orderHeaderOrder.OrderID);
//        sessionStorage.setItem("currentordertype", 'Order');       
        var dao = new Dao();
        //g_orderHeaderNextSavingStep = g_vanSales ? orderHeaderSaveOrderStep3 : undefined;
        dao.clearBasket('BasketInfo', g_currentCompany().AccountID, sessionStorage.getItem('currentordertype'), orderHeaderRemovedFromCartError, orderHeaderRemovedFromCartSuccess);        
    }
    catch (error) {
    	
    	orderHeaderShowError(error);
    }
}

function orderHeaderRemovedFromCartSuccess(){
	
    if (!g_vanSales){  
    	
    	if ('LENSO' == g_currentUser().SupplierID.toUpperCase()) {   	
    		
    		var randomDigit = Math.floor((Math.random() * 10));
    		var date = new Date();
    		var y = date.getFullYear().toString().slice(3);
    		g_orderHeaderOrder.UserField01 = g_currentUser().UserID + randomDigit + y + g_dayOfYear() + orderHeaderInvoiceSequenceNumber();
            sessionStorage.setItem("currentOrder", JSON.stringify(g_orderHeaderOrder));
            sessionStorage.setItem('invoiceContinue', 'activity');          
    		$.mobile.changePage('orderprint.html');
    		return;
    	} 
    	
    	if (sessionStorage.getItem('currentordertype').indexOf('Invoice') != -1) {
    	
    		g_showInvoice('orderHeaderInvoicePopup');
    		return;
    	}
    	
    } else {
    	
    	if (sessionStorage.getItem('SGforBranch') == 'sgradio1' && sessionStorage.getItem('currentordertype') == 'Order') {  	
    		
    		orderheaderReduceStock();
    		g_showInvoice('orderHeaderInvoicePopup');
    		return;
    	}
    }
    
    if (sessionStorage.getItem('orderheaderNext') == 'menu') {
    	
    	g_loadMenu();
    	
    } else {
    	
        g_fetchAvailableCredit();
    	sessionStorage.setItem('lastPanelId', sessionStorage.getItem('orderheaderNext') + 'Panel');
    	$.mobile.changePage('company.html');
    }
} 

function orderHeaderRemovedFromCartError(){
	
	g_alert('Your order was created but not removed from the shopping cart');
}


function orderHeaderVanSales() {
	
	if (g_orderHeaderOrder.Type.indexOf('Invoice') != -1) {
		
		g_orderHeaderOrder.UserField01 = orderHeaderCreateInvoiceNumber();
        sessionStorage.setItem("currentOrder", JSON.stringify(g_orderHeaderOrder));
        sessionStorage.setItem('invoiceContinue', 'activity');
		
	} else if (DaoOptions.getValue('DeliveryOrderType'))
        g_orderHeaderOrder.UserField01 = g_grv_replorderid;
	
	if (!g_vanSales) 
		return;
	
    if (g_orderHeaderOrder.Type == 'REPL' || g_orderHeaderOrder.Type == 'GRV') {    	
        //g_loadMenu();
        if (g_orderHeaderOrder.Type == 'GRV')
            g_orderHeaderOrder.UserField01 = g_orderHeaderOrder.referenceDocID;
        
    } else if (sessionStorage.getItem('SGforBranch') == 'sgradio1' && g_currentUser().RepID.toUpperCase() == g_currentCompany().BranchID.toUpperCase()) {
    	
        g_orderheaderCallReduceStock = true;

        g_orderHeaderOrder.UserField01 = orderHeaderCreateInvoiceNumber();

        sessionStorage.setItem("currentOrder", JSON.stringify(g_orderHeaderOrder));
        sessionStorage.setItem('invoiceContinue', 'activity');
    }
    else {
    	
    	sessionStorage.setItem('lastPanelId', 'activityPanel');
        $.mobile.changePage('company.html');
    };
}


function orderHeaderCreateInvoiceNumber() {		
	
	if (DaoOptions.getValue('shortinvoice') == 'true') {
		var lastInvoiceNumberOption = DaoOptions.get(g_currentUser().RepID + 'lastInvNum');
                if (!lastInvoiceNumberOption) {
                    throw('Error, Create a number range via for this van user by creating an optioninfo with id= ' + g_currentUser().RepID + 'lastInvNum' );
                }
		var newInvoiceNumber = parseInt(lastInvoiceNumberOption.Value, 10) + 1;
		lastInvoiceNumberOption.Value = newInvoiceNumber;
		var dao = new Dao();		
		dao.put(lastInvoiceNumberOption, 'Options', lastInvoiceNumberOption.key , function() {
				if (g_isOnline(false))					
					orderHeaderSaveInvoiceNumber(lastInvoiceNumberOption);
				else					
					g_saveObjectForSync(lastInvoiceNumberOption, lastInvoiceNumberOption.key, "Options", "QuickModify");
			}, 
			undefined,undefined);  		
		return parseInt(DaoOptions.getValue(g_currentUser().RepID + 'lastInvNum')) + 1;
	} else {
		var vanNumber = g_currentUser().RepID.slice(-2);
    	var date = new Date();
    	var y = date.getFullYear().toString().slice(3);
    	return vanNumber + y + g_dayOfYear() + orderHeaderInvoiceSequenceNumber();	
	}
}

function orderHeaderSaveInvoiceNumber(lastInvoiceNumberOption) {	
	
	var onSuccess = function(json) {
		if (json._Status != true)
			g_saveObjectForSync(lastInvoiceNumberOption, lastInvoiceNumberOption.key, "Options", "QuickModify");
	};
	var onError = function() {
		g_saveObjectForSync(lastInvoiceNumberOption, lastInvoiceNumberOption.key, "Options", "QuickModify");
	};
	
	g_ajaxget(g_restUrl + 'Options/QuickModify?supplierID=' + lastInvoiceNumberOption.SupplierID + 
			'&name=' + lastInvoiceNumberOption.Name + '&group=' + lastInvoiceNumberOption.Group + 
			'&otype=' + lastInvoiceNumberOption.Type + '&value=' + lastInvoiceNumberOption.Value, 
			
			onSuccess, onError);
}


function orderHeaderGetVan(){
	
	try {
		if (g_currentUser().Role) {		
			var roles = g_currentUser().Role.split(',');		
			for (var i = 0; i < roles.length; ++i) {
				if (roles[i].indexOf('van=') != -1){
					var fields = roles[i].split('=');
					return fields[1];
				};
			};
			return g_currentUser().RepID.slice(-1);
		};		
	} catch (err){
		
	}
}

function orderHeaderAreItemsValid() {
    
    var isValid = true;
    
    if (DaoOptions.getValue('VanandWareOrder', 'false') == 'true') {
        
        for (var i = 0; i < g_orderHeaderOrder.orderItems.length; i++) {
            
            if (g_orderHeaderOrder.orderItems[i].Warehouse && (g_orderHeaderOrder.orderItems[i].Warehouse != g_currentBranch())) {
                
                isValid = false;
                $('#infoPopup p').text('Error: The order items are not created with the current order type.');
                break;
            }
        }
    }
    
    return isValid;
}

function orderHeaderSaveFormedOrder(position) {
    
    if (position && position.coords) {
        
    	g_orderHeaderOrder.Userfield04 = position.coords.latitude;
	g_orderHeaderOrder.Userfield05 = position.coords.longitude;
    }

    if (!orderHeaderAreItemsValid())
        return;
    
    if (g_isOnline(false)) {   	
    	try {		
        	var orderHeaderInfo = {};  	
        	orderHeaderInfo.Table = "Orders";
        	orderHeaderInfo.Method = "Modify2";
        	orderHeaderInfo.json = JSON.stringify(g_orderHeaderOrder);   
        	console.log(JSON.stringify(g_orderHeaderOrder));
        	var url = DaoOptions.getValue(g_orderHeaderOrder.Type + 'LiveURL');
        	
        	if (!url) 
        		url = g_restUrl + 'post/post.aspx';
        	
        	g_ajaxpost(jQuery.param(orderHeaderInfo), url, orderHeaderOnLineSaveSuccess, orderHeaderOnLineSaveError);  
    	} catch (error) {  		
        	g_saveObjectForSync(g_orderHeaderOrder, g_orderHeaderOrder.SupplierID + g_orderHeaderOrder.AccountID + g_orderHeaderOrder.OrderID, "Orders", "Modify2", orderHeaderOfflineSaveSuccess);   		
    	}    	
    } else {
    	g_saveObjectForSync(g_orderHeaderOrder, g_orderHeaderOrder.SupplierID + g_orderHeaderOrder.AccountID + g_orderHeaderOrder.OrderID, "Orders", "Modify2", orderHeaderOfflineSaveSuccess);
    }
} 


function orderHeaderOnLineSaveSuccess() {
	
	var url = DaoOptions.getValue(g_orderHeaderOrder.Type + 'ExistsURL');
	
	if (!url) 
            url = g_restUrl + 'Orders/Exists';	
	
	g_ajaxget(url + '?supplierID=' + g_orderHeaderOrder.SupplierID + '&orderID=' + g_orderHeaderOrder.OrderID + '&format=json', orderHeaderOnOrderExistsSuccess, orderHeaderOnOrderExistsError);	
}

function orderHeaderOnLineSaveError(error) {
	
	if ((error.status == 0) || (error.status == 200)) {
		
            orderHeaderOnLineSaveSuccess();
		
	} else {
		
            console.log('Error in saving order: ' + error);
            g_saveObjectForSync(g_orderHeaderOrder, g_orderHeaderOrder.SupplierID + g_orderHeaderOrder.AccountID + g_orderHeaderOrder.OrderID, "Orders", "Modify2", orderHeaderOfflineSaveSuccess);
	}
}

function orderHeaderOfflineSaveSuccess() {
	
	$('#infoPopup').popup('close');
	g_alert('Your order was saved locally. Please sync later to send this order');
	sessionStorage.setItem('HistoryCacheAccountID', '');
	orderHeaderRemoveFromCart();
}


function orderHeaderOnOrderExistsSuccess(json) {

    g_busy(false);
    
    if (json._Status == true) {				
        if (g_orderHeaderOrder.Type == 'GRV' || g_orderHeaderOrder.Type.toUpperCase() == 'POD') {
            orderHeaderSaveReferenceStatus(g_orderHeaderOrder, orderHeaderOrderAcceptOnSuccess, orderHeaderOrderAcceptOnError);	
            return;
        }
        orderHeaderOnOrderSaved();	
    } else {
        if (DaoOptions.getValue('VerifyOrders') == 'true') {
            
            orderHeaderConfirmOrderItems(json._Items);
            
        } else {

            $('#infoPopup p').html(json._Errors.join('<br/>'));
            $('#infoPopup').popup('open');
            
            setTimeout(function() {

                $('#infoPopup').popup('close');
                g_saveObjectForSync(g_orderHeaderOrder, g_orderHeaderOrder.SupplierID + g_orderHeaderOrder.AccountID + g_orderHeaderOrder.OrderID, "Orders", "Modify2", orderHeaderOfflineSaveSuccess);

            }, 2000);            
        }			            
    }		
}

function orderHeaderConfirmOrderItems(orderItems) {
	
	g_orderHeaderValidItems = [];
	g_orderHeaderInvalidItemKeys = [];
	
	$('#orderConfirmPopup tbody').empty();
	
	$.each(orderItems, function(index, item) {
		
		if (item.MustRemoveFromOrder == true)
			g_orderHeaderInvalidItemKeys.push(item.ProductID.trim() + g_currentUser().SupplierID + g_currentUser().UserID + item.AccountID.trim());
		else
			g_orderHeaderValidItems.push(item);

		var imageName = 'green';
		
		if (!item.IsValid)
			imageName = item.MustRemoveFromOrder ? 'cancel' : 'yellow';

		$('#orderConfirmPopup tbody').append('<tr><td>' + item.ProductID + '</td><td>' + item.Description + '</td><td>' + item.Quantity + '</td><td><img src="img/' +
				imageName + '.png" /></td></tr>');
		
		if (item.ValidErrorDescription)
			$('#orderConfirmPopup tbody').append('<tr><td colspan="4">' + item.ValidErrorDescription + '</td></tr>');
	});
	
	$('#confirmButton').toggleClass('ui-disabled', !g_orderHeaderValidItems.length);
	
	$('#infoPopup').popup('close');
	$('#orderConfirmPopup').popup('open');
}

// For a GRV, set the status of replenishment to completed
// For a POD, set the status of the delivery to completed
function orderHeaderSaveReferenceStatus(order, onSuccess, onError) {
	
	var isAccepted = true;
	var url = '';
	
	if (g_orderHeaderOrder.Type == 'POD') isAccepted = ('Accept Delivery' == order.DeliveryAccepted); 

	url = g_restUrl + 'OrdersStatus/Modify?supplierID=' + g_currentUser().SupplierID + '&orderid=' + order.referenceDocID + 
		'&ordertype=' + g_orderHeaderOrder.Type + '&referenceorderid=' + order.OrderID + 
		'&accepted=' + isAccepted + '&comment=' + order.Comments + '&completed=true' +
		'&userid=' + g_currentUser().UserID + '&email=' + order.Email;
	
//		url = g_restUrl + 'Deliveries/Modify?supplierID=' + g_currentUser().SupplierID + '&orderid=' + order.Userfield06 + 
//			'&deliveraccepted=' + isDeliveryAccepted + '&delivercomment=' + order.Comments 
//			+ '&userid=' + g_currentUser().UserID + '&email=' + order.Email;
	
	g_ajaxget(url, onSuccess, onError);
}


function orderHeaderOnOrderExistsError(error) {	
	console.log('*** Error in checking the order. ***');
	g_saveObjectForSync(g_orderHeaderOrder, g_orderHeaderOrder.SupplierID + g_orderHeaderOrder.AccountID + g_orderHeaderOrder.OrderID, "Orders", "Modify2", orderHeaderOfflineSaveSuccess);
}

function orderHeaderOrderAcceptOnSuccess (json) {
	console.log(json);
	orderHeaderOnOrderSaved();
}

function orderHeaderOrderAcceptOnError () {
	
	g_alert('Error in order acceptance');
}

function orderHeaderOnOrderSaved() {

    sessionStorage.setItem('HistoryCacheAccountID', '');
    
    $('#infoPopup').popup('close');
    g_alert('Your order was saved OK');
    sessionStorage.setItem('HistoryCacheAccountID', '');

    if (DaoOptions.getValue('DeliveryOrderType'))
            localStorage.removeItem('CacheDeliveryOrders');
    try {
        if (!g_syncDao) g_syncDao = new Dao();
        syncFetchTable(g_currentUser().SupplierID, g_currentUser().UserID, 'Stock', 'Sync4', syncFetchLastTableSkip('Stock'));            
    } catch(err){
        console.log(err.message);
    }

    orderHeaderRemoveFromCart();
}


function orderHeaderSaveSignature(){
	
	var sigdiv = $("#signature");
    sigdiv.jSignature();
    var datapair = sigdiv.jSignature("getData", "svgbase64");

    var image = new Object();
    image.Id = g_orderHeaderOrder.OrderID;
    image.SupplierID = g_orderHeaderOrder.SupplierID;
    image.FileData = datapair[1];
    
    image.Type = datapair[0];
    if (image.Type.toLowerCase() == 'image/svg+xml;base64');
        image.Name = image.Id + '.svgx';
    
    g_saveObjectForSync(image, image.Id, 'File', 'UploadImage');
}

function orderheaderResetSignature() {
	$("#signature").jSignature("reset");
}

function orderHeaderCreateOrderObject() {
	
	g_orderHeaderOrder = new Object();
	
	g_orderHeaderOrder.OrderID	 = createId();
	g_orderHeaderOrder.AccountID  = g_currentCompany().AccountID;
	g_orderHeaderOrder.BranchID   = g_currentBranch();
	g_orderHeaderOrder.SupplierID = g_currentUser().SupplierID;
	g_orderHeaderOrder.UserID = g_currentUser().UserID;
	g_orderHeaderOrder.PostedToERP = false;
	g_orderHeaderOrder.Status = "";
	if (g_vanSales  && sessionStorage.getItem("currentordertype") == "repl") {
	    g_orderHeaderOrder.Type = 'REPL';
	}
	else if (g_vanSales && sessionStorage.getItem("currentordertype") == "grv") {
	    g_orderHeaderOrder.Type = 'GRV';
	}
	else {
	    g_orderHeaderOrder.Type = 'Order';
	}
	var date = new Date();
	g_orderHeaderOrder.CreateDate = date.getFullYear() + "-" + g_setLeadingZero((date.getMonth() + 1)) + "-" + g_setLeadingZero(date.getDate()) + "T" +
									g_setLeadingZero(date.getHours()) + ":"  + g_setLeadingZero(date.getMinutes()) + ":00";
}

function orderHeaderCreateLineItems() {
	
	g_orderHeaderOrderItems = [];
	var itemIndex = 0;
	type = sessionStorage.getItem("currentordertype");
	var dao = new Dao();
	dao.cursor('BasketInfo',
			undefined, 
			undefined,
			function(basketInfo) {
		
			    if (basketInfo.AccountID == g_currentCompany().AccountID) { //&& basketInfo.Type == type ) {
					
					lineItem = new Object();
					
					lineItem.ItemID = ++itemIndex;
					lineItem.OrderID = g_orderHeaderOrder.OrderID;
	
					for (var property in basketInfo)
						if ((property != 'key') && (property != 'UserID'))
							lineItem[property] = basketInfo[property];
					
					var nettValue = lineItem.RepNett ? lineItem.RepNett : lineItem.Nett;
					
					lineItem.Value = g_roundToTwoDecimals(nettValue / ((DaoOptions.getValue('DividePriceByUnit')  == 'true') && g_isPackSizeUnitValid(lineItem.Unit) ? lineItem.Unit : 1) * lineItem.Quantity);
					lineItem.SupplierID = g_currentUser().SupplierID;
					
					if (type.indexOf('Invoice') != -1) {	
						
						lineItem.Type = 'Invoice';
						lineItem.Warehouse = type.split('-')[1];
						lineItem.UserField05 = 'Invoice';
						
					} else {
						
						lineItem.UserField05 = sessionStorage.getItem("currentordertype"); //for info purposes used for stock take etc
					}
					
					g_orderHeaderOrderItems.push(lineItem);
				}
			},
			undefined,
			undefined
		);
}


function orderheaderReduceStock() {
    var dao = new Dao();
    g_orderheaderStocks = [];
    var i = 0;

    dao.cursor('Stock', undefined, undefined,
     function (stock) {
         g_orderheaderStocks[i++] = stock;
     }, undefined, orderheaderReduceStockStep2);
}

function orderheaderReduceStockStep2()
{
    var dao = new Dao();

    for (var i = 0; i < g_orderHeaderOrder.orderItems.length; i++) {
        var orderItem = g_orderHeaderOrder.orderItems[i];
        for (var j = 0; j < g_orderheaderStocks.length; j++) {
            var stock = g_orderheaderStocks[j];
            if (stock.SupplierID == orderItem.SupplierID && stock.ProductID == orderItem.ProductID && stock.Warehouse == g_orderHeaderOrder.BranchID) {
                stock.Stock -= orderItem.Quantity;
                dao.put(stock, "Stock", stock.SupplierID + stock.ProductID + stock.Warehouse, undefined, undefined, undefined);
            }
        }
    }
}


function orderHeaderInvoiceSequenceNumber() {
	
	if (g_today() != localStorage.getItem("sequenceDay")) {
		
		   localStorage.setItem("sequenceNumber","000");
		   localStorage.setItem("sequenceDay", g_today());
	}
	
	var nextSequenceNumber = (parseInt(localStorage.getItem("sequenceNumber")) + 1).toString();
	
	while (nextSequenceNumber.length < 3)
		nextSequenceNumber = '0' + nextSequenceNumber;
	
	localStorage.setItem("sequenceNumber", nextSequenceNumber);
	
	return nextSequenceNumber; 
}


