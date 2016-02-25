var g_printoutPrintAgain = false;
var g_printoutPageTranslation = {};

function printoutOnPageBeforeCreate() {

    g_printoutPageTranslation = translation('printoutpage');
}


function printoutOnPageShow() {

    g_printoutPageTranslation.safeExecute(function() {

        g_printoutPageTranslation.translateButton('#printButton', 'Print');
        g_printoutPageTranslation.translateButton('.ui-btn-right', 'Continue');
    });

    var dao = new Dao();
    dao.openDB(printoutInit);
    printoutBind();
}

function printoutInit() {

    var currentPageUrl = window.location.pathname;
    var currentPageName = currentPageUrl.substring(currentPageUrl.lastIndexOf('/') + 1);

    var printer = currentPageName.replace('printout', '').replace('.html', '');

    localStorage.setItem('printer', printer);

    if ('small' === printer)
        $('.printoutHeader h3').empty();

    printoutFetchOrder();


}

function printoutBind() {

    $('#printButton').click(printoutOnPrint);
}

function printoutOnPrint() {

    if (DaoOptions.getValue('printoutTwice') === 'true') {

        var printAgain = sessionStorage.getItem('printAgain');
        sessionStorage.setItem('printAgain', printAgain === null ? 'true' : 'false');
    }

    g_print('');
}

function printoutFetchOrder() {


    var order = JSON.parse(sessionStorage.getItem("currentOrder"));

    var content = DaoOptions.getValue('CustomAppOrderPrintout');
    g_append('.printoutContent', content);

    $('#printoutOrderType').text(order.Type);
    $('#printoutUserID').text(order.UserID);
    $('#printoutAccountID').text(order.AccountID);
    $('#printoutDeliveryName').text(order.DeliveryName);

    //set the address1

    $('#printoutEmail').text(order.Email);
    $('#printoutUserField01').text(order.UserField01 ? order.UserField01 : '');
    $('#printoutOrderID').text(order.OrderID);
    $('#printoutCreateDate').text(order.CreateDate);
    $('#printoutReference').text(order.Reference);
    $('#printoutUserField02').text(order.UserField02 ? order.UserField02 : '');
    $('#printoutComments').text(order.Comments);



    var vat = 0;
    var itemsHTML = ''
    var subTotal = 0;
    $.each(order.orderItems, function() {

        itemsHTML += '<tr><td style="padding:5px;text-align:right;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + this.ItemID + '</td>' +
                    '<td style="padding:5px;text-align:left;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + this.ProductID + '</td>' +
                    '<td style="padding:5px;text-align:left;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:7.5pt;color:#000;">' + this.Description + '</td>' +
                    '<td style="padding:5px;text-align:right;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + this.Quantity + '</td>' +
                    '<td style="padding:5px;text-align:right;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + this.Gross + '</td>' +
                    '<td style="padding:5px;text-align:right;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + this.Discount + '</td>' +
                    '<td style="padding:5px;text-align:right;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + (this.RepChangedPrice ? this.RepNett : this.Nett) + '</td>' +
                    '<td style="padding:5px;text-align:right;font-family:Geneva,Verdana,Arial,Helvetica,sans-serif;font-size:8pt;color:#000;">' + this.Value + '</td></tr>';


        subTotal += parseFloat(this.Value);

        if (DaoOptions.getValue('CalcTaxPerProduct') == 'true')
                vat += parseFloat(this.VAT || 0) / 100 * parseFloat(this.Value);
        else
                vat += g_vat() * parseFloat(this.Value);
    });

    g_append('#printoutItems tbody', itemsHTML);

    $('#printoutTotalExcl').text(g_roundToTwoDecimals(subTotal));
    $('#printoutGST').text(g_roundToTwoDecimals(vat));
    $('#printoutTotalIncl').text(g_roundToTwoDecimals(parseFloat(subTotal) + parseFloat(vat)));

    if (DaoOptions.getValue('TaxText')) {
    	$('#printoutTaxText').html(DaoOptions.getValue('TaxText'));
    }




}

function printoutGetCustomerVAT() {

    var dao = new Dao();

    dao.index('Companies',
    	JSON.parse(sessionStorage.getItem("currentOrder")).AccountID,
        'AccountID',
         function (company) {
    		$('#customerVAT').text(company.Userfield03);
                g_printoutMobileData += company.Userfield03 + '~';         },
         undefined, undefined

         );
}


function printoutSetAddress(addressType, order) {

    var dao = new Dao();
    dao.get('Address',
            order.SupplierID + order.AccountID + addressType,
            function(address) {
                    var addressHtml = g_currentCompany().Name + '<br/>' + address.Street + '<br/>' + address.City + '<br/>' + address.PostalCode;
                    if (addressType == 'BillTo') {
                        $('#customer').html(addressHtml);
                        //g_printoutMobileData += 'Acc Num: ' + g_currentCompany().AccountID + '~Customer: ' + g_currentCompany().Name +
                        //        '~`' + address.Street + '~`' + address.City + '~`' + address.PostalCode + '~';
                    } else if (addressType == 'ShipTo') {
                        $('#address').html(addressHtml);
                    }
            },
            undefined,
            undefined);
}

function printoutOnContinueClicked() {

    if ((DaoOptions.getValue('printoutTwice') === 'true') && (sessionStorage.getItem('printAgain') !== 'false')) {

        printoutOnPrint();
        return;
    }

    sessionStorage.removeItem('printAgain');
    var nextPage = sessionStorage.getItem('invoiceContinue');

    if ('activity' === nextPage) {

        sessionStorage.setItem('lastPanelId', 'activityPanel');
        nextPage = 'company.html';
    }

    $.mobile.changePage(nextPage);
}
