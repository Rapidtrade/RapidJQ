var g_printInvoicePrintAgain = false;
var g_printInvoicePageTranslation = {};
var g_printInvoiceMobileData = '';
var g_printInvoiceMobileAddrData = '';

var g_invoiceHTML = '';
var g_quantityTotal = 0;
var g_subTotal = 0;
var g_inoiVat = 0;

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
    
    if (DaoOptions.getValue('RepeatInvHeadersOnEachPage', 'false') === 'true') {
        printinvoiceHeadersOnEachPage();
        return;
    }
	
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
    $('#total').text(g_roundToTwoDecimals(parseFloat(subTotal) + parseFloat(vat))) + '~';
    
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

function printinvoiceHeadersOnEachPage() {
    var order = JSON.parse(sessionStorage.getItem("currentOrder"));
    g_invoiceHTML = '';
    var header = printinvoiceGetHeader(order);
    var footer = printinvoiceGetFooter();
    
    g_quantityTotal = 0;
    g_subTotal = 0;
    g_inoiVat = 0;
    
    var totalPages = Math.ceil(order.orderItems.length / 19); 
    
    for (var i = 0; i < totalPages; printinvoiceCreatePage(g_invoiceHTML, order.orderItems, header, i++, totalPages, g_quantityTotal, g_subTotal, g_inoiVat));
    
    if ((order.orderItems.length - ((totalPages - 1) * 19)) > 9) {
        g_invoiceHTML += '<div class="footer" style="width:95%;text-align: right;"><span >' + 'Page ' + (totalPages++) + '</span><span class="invTotalPages"></span></div></div>';
        g_invoiceHTML += '<div class="page" >';
    }
    
    g_invoiceHTML += footer;
    g_invoiceHTML += '<div class="footer" style="width:95%;text-align: right;"><span >' + 'Page ' + totalPages + '</span><span class="invTotalPages"></span></div></div>';
    
    $('.printinvoiceContent').html(g_invoiceHTML);
    $('.invTotalPages').text(' of ' + totalPages);
    
}

function printinvoiceCreatePage(invoiceHTML, orderItems, header, pageNumber, totalPages, quantityTotal, subTotal, vat) {
    var needToBreakPage = (pageNumber < totalPages - 1) || ((orderItems.length - (pageNumber * 19)) > 9);
    g_invoiceHTML += '<div class="page' + (needToBreakPage ? ' page-break' : '') + '" >';
    g_invoiceHTML += '<div class="printinvoiceInvHeader" ></div>'; //header;
    g_invoiceHTML +=  '<div><table class="printinvoiceProductListTable" rules=groups id="productListTable">' +
                    '            <thead>	' +
                    '                <tr class="printinvoiceProductListTableHead">' +
                    '                    <th style="width: 101px !important;" class="multiLanguage">Product</th>' +
                    '                    <th style="width: 269px !important;" class="multiLanguage">Description</th>' +
                    '                    <th style="width: 25px !important;" class="multiLanguage">Qty</th>' +
                    '                    <th style="width: 33px !important;" class="multiLanguage">Disc</th>' +
                    '                    <th style="width: 48px !important;" class="multiLanguage">Price</th>' +
                    '                    <th style="width: 59px !important;" class="multiLanguage">Value</th>' +
                    '                </tr>' +
                    '            </thead>' +
                    '            <tbody>';
    var currentIndex = pageNumber * 19;
    
    for (var i = 0; orderItems[currentIndex] && (i < 19); ++i, ++currentIndex) {
        g_invoiceHTML += '<tr style="width: 100% !important;" >'  + 
                        '<td style="width: 101px !important;" >' + orderItems[currentIndex].ProductID + '</td>' +
                        '<td style="width: 269px !important;" >' + orderItems[currentIndex].Description + '</td>' +
                        '<td style="width: 25px !important;" >' + orderItems[currentIndex].Quantity + '</td>' +
                        '<td style="width: 33px !important;" >' + orderItems[currentIndex].Discount + '</td>' +
                        '<td style="width: 48px !important;" >' + g_roundToTwoDecimals(parseFloat(orderItems[currentIndex].Nett)) + '</td>' +
                        '<td style="width: 59px !important;" >' + g_roundToTwoDecimals(parseFloat(orderItems[currentIndex].Value)) + '</td>' +
                        '</tr>';
        
        g_quantityTotal += orderItems[currentIndex].Quantity;
        g_subTotal += parseFloat(orderItems[currentIndex].Value);

        if (DaoOptions.getValue('CalcTaxPerProduct') === 'true')
                g_inoiVat += parseFloat(orderItems[currentIndex].VAT || 0) / 100 * parseFloat(orderItems[currentIndex].Value);
        else
                g_inoiVat += g_vat() * parseFloat(orderItems[currentIndex].Value);
    }
    
    g_invoiceHTML += '</tbody>';
    
    if (currentIndex >= orderItems.length) {
        g_invoiceHTML +=  '<tfoot>' +
                        '        <tr><td style="width: 101px !important;" ></td><td style="width: 269px !important;" class="printinvoiceTotalLabel">Sub Total</td><td  style="width: 25px !important;" ></td><td  style="width: 33px !important;" ></td><td  style="width: 48px !important;" ></td><td  style="width: 59px !important;" id="subTotal">' + g_roundToTwoDecimals(g_subTotal) + '</td></tr>' +
                        '        <tr><td style="width: 101px !important;" ></td><td style="width: 269px !important;" class="printinvoiceTotalLabel" id="taxText">VAT</td><td style="width: 25px !important;" ></td><td style="width: 33px !important;" ><td style="width: 48px !important;" ></td><td style="width: 59px !important;" id="vat">' + g_roundToTwoDecimals(g_inoiVat) + '</td></tr>' +
                        '        <tr><td style="width: 101px !important;" ></td><td style="width: 269px !important;" class="printinvoiceTotalLabel">Total</td><td style="width: 25px !important;" id="quantityTotal">' + g_quantityTotal + '</td><td  style="width: 33px !important;" ></td><td  style="width: 48px !important;" ></td><td style="width: 59px !important;" id="total">' + g_roundToTwoDecimals(parseFloat(g_subTotal) + parseFloat(g_inoiVat)) + '</td></tr>' +
                        '</tfoot>';
    }
    
    g_invoiceHTML += '</table></div>';
    g_invoiceHTML += (pageNumber < totalPages - 1) ? '<div class="footer" style="width:95%;text-align: right;"><span >' + 'Page ' + (pageNumber + 1) + '</span><span class="invTotalPages"></span></div></div>' : '';
}

function printinvoiceGetHeader(order) {
    var headerHTML = '';
    var billToAddress;
    var shipToAddress;
    
    var createHeader = function() {
        headerHTML +=   //'<div id="printinvoiceInvHeader" >' +
                        '    <div  class="ui-grid-a">' +
                        '        <div class="ui-block-a">' +
                        '            <h3></h3>' +
                        '            <div id="invoiceBarcode" class="invoiceBarcode">' +
                        '            </div>' +
                        '            <table>' +
                        '                <tr><td class="multiLanguage" colspan="2">TAX INVOICE</td></tr>' +
                        '                <tr><td class="multiLanguage">Inv. Number</td><td id="invoiceNumber">' + order.UserField01 + '</td></tr>' +
                        '                <tr><td class="multiLanguage">Inv. and Deliv. Date</td><td id="date">' + g_today() + '</td></tr>' +
                        '            </table>' +
                        '        </div>' +
                        '        <div class="ui-block-b">' +
                        '        <p class="multiLanguage">Supplied By</p>' +
                        '                <table class="printinvoiceFramedTable">' +
                        '                    <tr><td>ID:</td><td id="id">' + order.UserID + '</td></tr>' +
                        '                    <tr><td class="multiLanguage">Details</td><td id="details">' + (printinvoiceShowOptionalText('#details', 'MyAddress') ? printinvoiceShowOptionalText('#details', 'MyAddress') : '<br/><br/><br/><br/><br/><br/><br/>') + '</td></tr>' +
                        '                </table>' +
                        '        </div>' +
                        '    </div>' +
                        '    <p>' +
                        '    <table class="printinvoiceFramedTable">' +
                        '            <tr><td class="multiLanguage">Bill To:</td><td></td><td class="multiLanguage" nowrap>Deliver To:</td><td></td></tr>' +
                        '            <tr><td class="multiLanguage">Acc Num:</td><td id="acc">' + order.AccountID + '</td><td class="multiLanguage" rowspan="3">Addr:</td><td rowspan="3" id="address">' + (shipToAddress ? (g_currentCompany().Name + '<br/>' + shipToAddress.Street + '<br/>' + shipToAddress.City + '<br/>' + shipToAddress.PostalCode) : '' ) + '</td></tr>' +
                        '            <tr><td class="multiLanguage">Customer:</td><td id="customer">' + (billToAddress ? (g_currentCompany().Name + '<br/>' + billToAddress.Street + '<br/>' + billToAddress.City + '<br/>' + billToAddress.PostalCode) : '<br/><br/><br/><br/><br/>' ) + '</td></tr>' +
                        '            <tr><td id="customerVATLabel">' + g_printInvoicePageTranslation.translateText(DaoOptions.getValue('VATLineText', 'Cust VAT')) + '</td><td id="customerVAT">' + g_currentCompany().Userfield03 + '</td></tr>' +
                        '            </table>' +
                        '            </p>' +
                        '    <p>' +
                        '    <table class="printinvoiceFramedTable">' +
                        '            <tr><td class="multiLanguage">Reference:</td><td id="comment">' + order.Reference + '</td></tr>' +
                        '    </table>' +
                        '            </p>';// +
                        //'</div>';
        $('.printinvoiceInvHeader').html(headerHTML);
        if (DaoOptions.getValue('InvoiceDoNotShowBarCode') !== 'true')
            $('.invoiceBarcode').barcode(order.UserField01, "code128");
    };
    
    var dao = new Dao();
    dao.get('Address',
            order.SupplierID + order.AccountID + 'BillTo', 
            function(address) {
                billToAddress = address;
            },undefined, 
            function () {
                    var daoDeliv = new Dao();
                    daoDeliv.get('Address',
                    order.SupplierID + order.AccountID + 'ShipTo', 
                    function(address) {
                        shipToAddress = address;
                    }, 
                    undefined,
                    createHeader
                    );
                                   
            }
    );
    
    return headerHTML;
}

function printinvoiceGetFooter() {
    return  '<div id="printinvoiceInvFooter" >' + 
            '   <p>' +
            '       <hr noshade="noshade" size="1">' +
            '       <span class="multiLanguage">' +
            '           I / We acknowledge receipt of goods as detailed.' +
            '       </span>' +
            '   </p>' +
            '   <p>' +
            '       <table style="border-spacing: 20px; width:100%">' +
            '           <tr><td class="multiLanguage">Authorised Name:</td><td class="multiLanguage">Store Stamp</td></tr>' +
            '           <tr><td><hr class="printinvoiceHorizontalRule"></td><td><hr class="printinvoiceHorizontalRule"></td></tr>' +
            '           <tr><td class="multiLanguage">Signature:</td><td class="multiLanguage">GRN Number</td></tr>' +
            '          <tr><td><hr class="printinvoiceHorizontalRule"></td><td><hr class="printinvoiceHorizontalRule"></td></tr>' +
            '       </table>' +
            '   </p>' +
            '</div>';
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
        return textHtml;
    }
    return '';
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