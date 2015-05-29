var g_printInvoicePrintAgain = false;
var g_printInvoicePageTranslation = {};
var g_printInvoiceMobileData = '';
var g_printInvoiceMobileAddrData = '';

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
    if (g_currentUser().SupplierID.indexOf('OTI') === 0) {
        var order = JSON.parse(sessionStorage.getItem("currentOrder"));
        var dao = new Dao();
        dao.get('Address',
                order.SupplierID + order.AccountID + 'BillTo', 
                function(address) {
                    g_printInvoiceMobileAddrData = 'Acc Num: ' + g_currentCompany().AccountID + '~Customer: ' + g_currentCompany().Name + 
                                    '~`' + address.Street + '~`' + address.City + '~`' + address.PostalCode + '~';

                }, 
                function() {
                    g_printInvoiceMobileAddrData = '';
                }, 
                function () {
                    setTimeout(function() {
                        var daoDeliv = new Dao();
                        daoDeliv.get('Address',
                        order.SupplierID + order.AccountID + 'ShipTo', 
                        function(address) {
                            g_printInvoiceMobileAddrData += '~Deliver To: Addr:~' + address.Street + '~' + address.City + '~' + address.PostalCode + '~';

                        }, 
                        undefined,
                        printinvoiceFetchOrder
                        );
                    },5);
                    
                }
        );
    } else {
        printinvoiceFetchOrder();
    }
        
}

function printinvoiceBind() {

    $('#printButton').click(printinvoiceOnPrint);
}

function printinvoiceOnPrint() {
    
    if (DaoOptions.getValue('PrintInvoiceTwice') === 'true') {

        var printAgain = sessionStorage.getItem('printAgain');
        sessionStorage.setItem('printAgain', printAgain === null ? 'true' : 'false');            
    }

    g_print(''+g_printInvoiceMobileData);    
}

function printinvoiceFetchOrder() {
	
    var order = JSON.parse(sessionStorage.getItem("currentOrder"));
    g_printInvoiceMobileData = 'TAX INVOICE~';
    printinvoiceShowOptionalText('.printinvoiceContent h3', 'InvoiceHeader');

    if (DaoOptions.getValue('InvoiceDoNotShowBarCode') !== 'true')
        $('#invoiceBarcode').barcode(order.UserField01, "code128");
        
    $('#invoiceNumber').text(order.UserField01);
    g_printInvoiceMobileData += 'Inv. Number: ' + order.UserField01 + '~';    

    $('#date').text(g_today());
    g_printInvoiceMobileData += 'Inv. and Deliv. Date: ' + g_today() + '~';    
    g_printInvoiceMobileData += 'Supplied By~ID: ';
    
    
    $('#id').text(order.UserID);
    g_printInvoiceMobileData += order.UserID + '/~/';
    
    g_printInvoiceMobileData += 'Details: ~';
    printinvoiceShowOptionalText('#details', 'MyAddress');
    
    g_printInvoiceMobileData += g_printInvoiceMobileAddrData ? '~Bill To: ~' + g_printInvoiceMobileAddrData : '';
    printinvoiceSetAddress('BillTo', order);
    printinvoiceSetAddress('ShipTo', order);
    
    g_printInvoiceMobileData += g_printInvoicePageTranslation.translateText(DaoOptions.getValue('VATLineText', 'Cust VAT')) + ': ';
    $('#customerVATLabel').text(g_printInvoicePageTranslation.translateText(DaoOptions.getValue('VATLineText', 'Cust VAT')));
    printinvoiceGetCustomerVAT();
    g_printInvoiceMobileData += '~';
	
    key = g_currentUser().SupplierID + 'MobileLiveStockDiscount';
    
	
    $('#acc').text(order.AccountID);

    $('#comment').text(order.Reference);
    g_printInvoiceMobileData += 'Reference: ' + order.Reference + '~';

    var productLinesHtml = '';
    var quantityTotal = 0;
    var subTotal = 0;

    var vat = 0;
    //g_printInvoiceMobileData += '~Product\t\tDescription\t\t\t\tQty\tDisc\tPrice\tValue ';
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

                productLinesHtml += '<tr style="width: 100% !important;" >'  + 
                        '<td style="width: 101px !important;" >' + this.ProductID + '</td>' +
                        '<td style="width: 269px !important;" >' + this.Description + '</td>' +
                        '<td style="width: 25px !important;" >' + this.Quantity + '</td>' +
                        '<td style="width: 33px !important;" >' + this.Discount + '</td>' +
                        '<td style="width: 48px !important;" >' + g_roundToTwoDecimals(parseFloat(this.Nett)) + '</td>' +
                        '<td style="width: 59px !important;" >' + g_roundToTwoDecimals(parseFloat(this.Value)) + '</td>' +
                        '</tr>';	
        }
        g_printInvoiceMobileData += '' + this.ProductID + '`' + this.Quantity + '`' + this.Value + '`' + this.Description + '~';
                                    
                                    
        quantityTotal += this.Quantity;
        subTotal += parseFloat(this.Value);

        if (DaoOptions.getValue('CalcTaxPerProduct') == 'true')
                vat += parseFloat(this.VAT || 0) / 100 * parseFloat(this.Value);
        else
                vat += g_vat() * parseFloat(this.Value);
    });

    g_append('#productListTable tbody', productLinesHtml);
    //$('#productListTable tbody').append(productLinesHtml);
    $('#subTotal').text(g_roundToTwoDecimals(subTotal));
    g_printInvoiceMobileData += '~`Sub Total: ``' + g_roundToTwoDecimals(subTotal) + '~';
    if (DaoOptions.getValue('TaxText')) {
    	$('#taxText').html(DaoOptions.getValue('TaxText'));
        g_printInvoiceMobileData += '`' + DaoOptions.getValue('TaxText') + ': ``' + g_roundToTwoDecimals(vat) + '~';
    } else {
        g_printInvoiceMobileData += '`Vat: ``' + g_roundToTwoDecimals(vat) + '~';    
    }
    $('#vat').text(g_roundToTwoDecimals(vat));
    $('#quantityTotal').text(quantityTotal);
    g_printInvoiceMobileData += '`Total: `' + quantityTotal + '`' + g_roundToTwoDecimals(parseFloat(subTotal) + parseFloat(vat)) + '~';
    $('#total').text(g_roundToTwoDecimals(parseFloat(subTotal) + parseFloat(vat))) + '/*/';
    
    if (DaoOptions.getValue('CalcChange') === 'true') {
        g_printInvoiceMobileData += '`Money Received: ``' + g_roundToTwoDecimals(parseFloat(order.UserField02)) + '~';
        g_printInvoiceMobileData += '`Change Given: ``' + g_roundToTwoDecimals(parseFloat(order.UserField03)) + '~';
    }
    g_printInvoiceMobileData += g_printInvoicePageTranslation.translateText('I / We acknowledge receipt of goods as detailed.') + '[b]~';
    g_printInvoiceMobileData += g_printInvoicePageTranslation.translateText('Authorised Name:') + '``' + g_printInvoicePageTranslation.translateText('Store Stamp') + '~';
    g_printInvoiceMobileData += g_printInvoicePageTranslation.translateText('Signature:') + '``' + g_printInvoicePageTranslation.translateText('GRN Number') + '~';
    
    console.log(g_printInvoiceMobileData);
	
    if (DaoOptions.getValue('BreakPrintInvoiceItemsTable', 'false') === 'true') {
        if (order.orderItems.length > 19) {
            $('.printinvoiceContent').addClass('page');
            var head = $('#productListTable thead tr');
            $( "#productListTable tbody tr:nth-child(35n+19)" ).after(head.clone());
//            var pNumber=1;
//            var ar = $( '#productListTable tbody tr.printinvoiceProductListTableHead' ); 
//            $.each(ar, function() {
//                    $(this).before('<div class="footer" style="width:95%;text-align: right;">Page ' + (pNumber++).toString() + '</div>');
//            });
//            $( '#productListTable tbody tr.printinvoiceProductListTableHead:last' ).after('<div class="footer" style="width:95%;text-align: right;">Page ' + (pNumber++).toString() + '</div>');
        } else if (order.orderItems.length > 10) {
            $('#productListTable').after('<div> </div><div style="page-break-before: always; page-break-inside: avoid;"> </div>');
        }
    }
    
}


function printinvoiceIsPrinterSmall() {
	
    return (localStorage.getItem('printer') == 'small');
}

function printinvoiceShowOptionalText(selector, optionName) {
	
    var text = DaoOptions.getValue(optionName);
    
    if (text) {
    	
    	var lines = text.split(';');
    	var textHtml = '';

    	for (var i = 0; i < lines.length; ++i) {
            textHtml += lines[i] + '<br/>'; 
            g_printInvoiceMobileData += '`' + lines[i] + '~';
        }

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
                g_printInvoiceMobileData += company.Userfield03 + '~';         },
         undefined, undefined
 
         );
}


function printinvoiceSetAddress(addressType, order) {
	
    var dao = new Dao();
    dao.get('Address',
            order.SupplierID + order.AccountID + addressType, 
            function(address) {
                    var addressHtml = g_currentCompany().Name + '<br/>' + address.Street + '<br/>' + address.City + '<br/>' + address.PostalCode;
                    if (addressType == 'BillTo') {
                        $('#customer').html(addressHtml);
                        //g_printInvoiceMobileData += 'Acc Num: ' + g_currentCompany().AccountID + '~Customer: ' + g_currentCompany().Name + 
                        //        '~`' + address.Street + '~`' + address.City + '~`' + address.PostalCode + '~';
                    } else if (addressType == 'ShipTo') {
                        $('#address').html(addressHtml);
                    }
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