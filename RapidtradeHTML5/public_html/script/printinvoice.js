var g_printInvoicePrintAgain = false;
var g_printInvoicePageTranslation = {};

function printinvoiceOnPageBeforeCreate() {
	
    g_printInvoicePageTranslation = translation('printinvoicepage');
}


function printinvoiceOnPageShow() {
    
    g_printInvoicePageTranslation.safeExecute(function() {
        
        g_printInvoicePageTranslation.translateButton('#printButton', 'Print');
        g_printInvoicePageTranslation.translateButton('.ui-btn-right', 'Continue');
    });
	
    var dao = new Dao();
    dao.openDB(printinvoiceInit);
    printinvoiceBind();
}

function printinvoiceInit() {
	
    var currentPageUrl = window.location.pathname;
    var currentPageName = currentPageUrl.substring(currentPageUrl.lastIndexOf('/') + 1);

    var printer = currentPageName.replace('printinvoice', '').replace('.html', '');

    localStorage.setItem('printer', printer);

    if ('small' === printer)
        $('.printinvoiceHeader h3').empty();

    printinvoiceFetchOrder();
}

function printinvoiceBind() {

    $('#printButton').click(printinvoiceOnPrint);
}

function printinvoiceOnPrint() {
    
    if (DaoOptions.getValue('PrintInvoiceTwice') === 'true') {

        var printAgain = sessionStorage.getItem('printAgain');
        sessionStorage.setItem('printAgain', printAgain === null ? 'true' : 'false');            
    }

    g_print('#printinvoicepage');      
}

function printinvoiceFetchOrder() {
	
    var order = JSON.parse(sessionStorage.getItem("currentOrder"));

    printinvoiceShowOptionalText('.printinvoiceContent h3', 'InvoiceHeader');

    if (DaoOptions.getValue('InvoiceDoNotShowBarCode') !== 'true')
        $('#invoiceBarcode').barcode(order.UserField01, "code128");
        
    $('#invoiceNumber').text(order.UserField01);

    $('#customerVATLabel').text(g_printInvoicePageTranslation.translateText(DaoOptions.getValue('VATLineText', 'Cust VAT')));
    printinvoiceGetCustomerVAT();

    $('#date').text(g_today());

    $('#id').text(order.UserID);

    printinvoiceSetAddress('BillTo', order);
    printinvoiceSetAddress('ShipTo', order);
	
    key = g_currentUser().SupplierID + 'MobileLiveStockDiscount';
    
    printinvoiceShowOptionalText('#details', 'MyAddress');
	
    $('#acc').text(order.AccountID);

    $('#comment').text(order.Reference);

    var productLinesHtml = '';
    var quantityTotal = 0;
    var subTotal = 0;

    var vat = 0;

    $.each(order.orderItems, function() {

        if (localStorage.getItem('printer') == 'small') {

                productLinesHtml += '<tr>'  + 
                        '<td>' + this.ProductID + '</td>' +
                        '<td class="right">' + this.Quantity + '</td>' +
                        '<td class="right">' + this.Nett + '</td>' +
                        '<td class="right">' + this.Value + '</td>' +
                        '</tr>' +
                        '<tr><td class="descr" colspan="2">' + this.Description + '</td></tr>';

        } else {

                productLinesHtml += '<tr>'  + 
                        '<td>' + this.ProductID + '</td>' +
                        '<td>' + this.Description + '</td>' +
                        '<td>' + this.Quantity + '</td>' +
                        '<td>' + this.Discount + '</td>' +
                        '<td>' + this.Nett + '</td>' +
                        '<td>' + this.Value + '</td>' +
                        '</tr>';	
        }

        quantityTotal += this.Quantity;
        subTotal += parseFloat(this.Value);

        if (DaoOptions.getValue('CalcTaxPerProduct') == 'true')
                vat += parseFloat(this.VAT || 0) / 100 * parseFloat(this.Value);
        else
                vat += g_vat() * parseFloat(this.Value);
    });

    g_append('#productListTable tbody', productLinesHtml);
    //$('#productListTable tbody').append(productLinesHtml);
    $('#quantityTotal').text(quantityTotal);
    $('#subTotal').text(g_roundToTwoDecimals(subTotal));    
    $('#vat').text(g_roundToTwoDecimals(vat));
    $('#total').text(g_roundToTwoDecimals(parseFloat(subTotal) + parseFloat(vat)));
	
    if (DaoOptions.getValue('TaxText'))
    	$('#taxText').html(DaoOptions.getValue('TaxText'));
}


function printinvoiceIsPrinterSmall() {
	
    return (localStorage.getItem('printer') == 'small');
}

function printinvoiceShowOptionalText(selector, optionName) {
	
    var text = DaoOptions.getValue(optionName);
    
    if (text) {
    	
    	var lines = text.split(';');
    	var textHtml = '';

    	for (var i = 0; i < lines.length; ++i)
    		textHtml += lines[i] + '<br/>'; 

    	$(selector).html(textHtml);
    }
}


function printinvoiceGetCustomerVAT() {
	
    var dao = new Dao();

    dao.index('Companies',
    	JSON.parse(sessionStorage.getItem("currentOrder")).AccountID,
        'AccountID',
         function (company) {
    		$('#customerVAT').text(company.Userfield03);
         },
         undefined, undefined
 
         );
}


function printinvoiceSetAddress(addressType, order) {
	
    var dao = new Dao();
    dao.get('Address',
            order.SupplierID + order.AccountID + addressType, 
            function(address) {
                    var addressHtml = g_currentCompany().Name + '<br/>' + address.Street + '<br/>' + address.City + '<br/>' + address.PostalCode;
                    if (addressType == 'BillTo')
                            $('#customer').html(addressHtml);
                    else if (addressType == 'ShipTo')
                            $('#address').html(addressHtml);
            }, 
            undefined, 
            undefined);
}

function printinvoiceOnContinueClicked() {
	
    if ((DaoOptions.getValue('PrintInvoiceTwice') === 'true') && (sessionStorage.getItem('printAgain') !== 'false')) {
        
        printinvoiceOnPrint();
        return;
    }               
        
    sessionStorage.removeItem('printAgain');         
    var nextPage = sessionStorage.getItem('invoiceContinue');

    if ('activity' == nextPage) {

        sessionStorage.setItem('lastPanelId', 'activityPanel');
        nextPage = 'company.html';
    }    

    $.mobile.changePage(nextPage);
}